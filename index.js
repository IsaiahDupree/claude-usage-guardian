/**
 * Claude Usage Guardian
 * =====================
 * Monitor Claude desktop app usage and enforce budget limits.
 *
 * Usage:
 *   import { scrapeUsage, checkUsage, readCachedUsage } from 'claude-usage-guardian';
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRAPE_SCRIPT = path.join(__dirname, 'bin', 'scrape.sh');

const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_PAUSE_AT = 75;
const DEFAULT_STOP_AT = 90;
const DEFAULT_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let lastScrapeAt = 0;

/**
 * Get the path to the usage data file.
 */
function usageFilePath(dataDir) {
  return path.join(dataDir || DEFAULT_DATA_DIR, 'claude-usage.json');
}

/**
 * Read cached usage data from disk (no scraping).
 * @param {string} [dataDir] - Directory containing claude-usage.json
 * @returns {object|null} Parsed usage data or null
 */
export function readCachedUsage(dataDir) {
  const fp = usageFilePath(dataDir);
  try {
    if (fs.existsSync(fp)) {
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    }
  } catch {}
  return null;
}

/**
 * Scrape Claude desktop app usage via screenshot + OCR.
 * Rate-limited to once per checkIntervalMs.
 *
 * @param {object} [options]
 * @param {string} [options.dataDir] - Where to write claude-usage.json
 * @param {number} [options.checkIntervalMs] - Minimum ms between scrapes
 * @returns {object|null} Parsed usage data or null on failure
 */
export function scrapeUsage(options = {}) {
  const {
    dataDir = DEFAULT_DATA_DIR,
    checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
  } = options;

  // Rate limit scraping
  if (Date.now() - lastScrapeAt < checkIntervalMs) {
    return readCachedUsage(dataDir);
  }

  try {
    const env = { ...process.env, USAGE_DATA_DIR: dataDir };
    execSync(`bash "${SCRAPE_SCRIPT}"`, { timeout: 60000, stdio: 'pipe', env });
    lastScrapeAt = Date.now();
    return readCachedUsage(dataDir);
  } catch (e) {
    // Scraping is best-effort; return cached data if available
    return readCachedUsage(dataDir);
  }
}

/**
 * Check usage against thresholds and return an action.
 *
 * @param {object} usage - Usage data from scrapeUsage() or readCachedUsage()
 * @param {object} [thresholds]
 * @param {number} [thresholds.pauseAt=75] - Pause when usage >= this %
 * @param {number} [thresholds.stopAt=90]  - Stop when usage >= this %
 * @returns {{ action: 'continue'|'pause'|'stop', percent: number|null, message: string }}
 */
export function checkUsage(usage, thresholds = {}) {
  const {
    pauseAt = DEFAULT_PAUSE_AT,
    stopAt = DEFAULT_STOP_AT,
  } = thresholds;

  if (!usage) {
    return { action: 'continue', percent: null, message: 'No usage data available' };
  }

  // Use the highest weekly percentage as the primary signal
  const pct = usage.max_weekly_percent
    ?? usage.weekly_all_percent
    ?? usage.session_percent;

  if (pct == null) {
    return { action: 'continue', percent: null, message: 'Could not determine usage percentage' };
  }

  if (pct >= stopAt) {
    return {
      action: 'stop',
      percent: pct,
      message: `Claude usage at ${pct}% (stop threshold: ${stopAt}%)`,
    };
  }

  if (pct >= pauseAt) {
    return {
      action: 'pause',
      percent: pct,
      message: `Claude usage at ${pct}% (pause threshold: ${pauseAt}%)`,
    };
  }

  return {
    action: 'continue',
    percent: pct,
    message: `Claude usage at ${pct}% (ok)`,
  };
}

/**
 * Full check: scrape + evaluate thresholds in one call.
 *
 * @param {object} [options]
 * @param {string} [options.dataDir]
 * @param {number} [options.checkIntervalMs]
 * @param {number} [options.pauseAt]
 * @param {number} [options.stopAt]
 * @returns {{ action: string, percent: number|null, message: string, usage: object|null }}
 */
export function guard(options = {}) {
  const usage = scrapeUsage(options);
  const decision = checkUsage(usage, options);
  return { ...decision, usage };
}
