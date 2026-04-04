# Claude Usage Guardian

Monitor your Claude desktop app's usage via screenshot + OCR, and enforce budget limits for autonomous coding agents (like ACD harness).

## How it works

1. **Scrape**: AppleScript navigates to Claude Settings → Usage, takes a screenshot
2. **OCR**: macOS Vision framework extracts text from the screenshot
3. **Parse**: Python extracts usage percentages, reset times, spend data
4. **Guard**: Node.js module checks thresholds and signals pause/stop to the caller

## Requirements

- **macOS** (uses AppleScript, Vision framework, screencapture)
- **Claude desktop app** installed and logged in
- **cliclick** (`brew install cliclick`)
- **Python 3** (for OCR text parsing)
- **Node.js 18+** (for the guardian module)

## Quick start

```bash
# Scrape current usage
npm run scrape
# → writes data/claude-usage.json

# Check thresholds
npm run check
# → exits 0 (ok), 1 (pause), 2 (stop)
```

## Integration with ACD harness

```js
import { checkUsage, scrapeUsage } from 'claude-usage-guardian';

const usage = await scrapeUsage();
// { session_percent: 6, weekly_all_percent: 14, weekly_sonnet_percent: 48, ... }

const decision = checkUsage(usage, { pauseAt: 75, stopAt: 90 });
// { action: 'continue' | 'pause' | 'stop', percent: 48, message: '...' }
```

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `USAGE_PAUSE_AT` | `75` | Pause when weekly usage ≥ this % |
| `USAGE_STOP_AT` | `90` | Stop when weekly usage ≥ this % |
| `USAGE_DATA_DIR` | `./data` | Where to write claude-usage.json |

## Data output

`data/claude-usage.json`:
```json
{
  "scraped_at": "2026-04-03T21:34:24.506957",
  "plan": "Max (20x)",
  "session_percent": 6,
  "session_resets_in": "4 hr 28 min",
  "weekly_all_percent": 14,
  "weekly_all_resets": "Fri 4:00 PM",
  "weekly_sonnet_percent": 48,
  "weekly_sonnet_resets_in": "7 hr 28 min",
  "extra_spent_usd": 5.9,
  "extra_limit_usd": 20,
  "extra_percent": 30,
  "credit_balance_usd": 202.47,
  "max_weekly_percent": 48
}
```

## License

MIT
