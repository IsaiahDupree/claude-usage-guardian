import { checkUsage } from '../index.js';

// Test checkUsage with mock data
const mockUsage = {
  scraped_at: new Date().toISOString(),
  plan: 'Max (20x)',
  session_percent: 6,
  weekly_all_percent: 14,
  weekly_sonnet_percent: 48,
  max_weekly_percent: 48,
};

console.log('=== checkUsage tests ===\n');

// Test: below pause threshold
let r = checkUsage(mockUsage, { pauseAt: 75, stopAt: 90 });
console.log(`48% vs pause=75: ${r.action} (expected: continue) ${r.action === 'continue' ? '✅' : '❌'}`);

// Test: at pause threshold
r = checkUsage({ ...mockUsage, max_weekly_percent: 75 }, { pauseAt: 75, stopAt: 90 });
console.log(`75% vs pause=75: ${r.action} (expected: pause) ${r.action === 'pause' ? '✅' : '❌'}`);

// Test: at stop threshold
r = checkUsage({ ...mockUsage, max_weekly_percent: 92 }, { pauseAt: 75, stopAt: 90 });
console.log(`92% vs stop=90: ${r.action} (expected: stop) ${r.action === 'stop' ? '✅' : '❌'}`);

// Test: null usage
r = checkUsage(null);
console.log(`null usage: ${r.action} (expected: continue) ${r.action === 'continue' ? '✅' : '❌'}`);

// Test: missing percentages
r = checkUsage({ scraped_at: new Date().toISOString() });
console.log(`no pcts: ${r.action} (expected: continue) ${r.action === 'continue' ? '✅' : '❌'}`);

console.log('\nDone.');
