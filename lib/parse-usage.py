#!/usr/bin/env python3
"""
Parse OCR text from Claude desktop Usage page into structured JSON.
Usage: python3 parse-usage.py <ocr_text> <output_path>
"""
import sys, json, re
from datetime import datetime

text = sys.argv[1]
output_path = sys.argv[2]
lines = text.strip().split('\n')
full = '\n'.join(lines)

usage = {
    "scraped_at": datetime.now().isoformat(),
    "plan": None,
    "session_percent": None,
    "session_resets_in": None,
    "weekly_all_percent": None,
    "weekly_all_resets": None,
    "weekly_sonnet_percent": None,
    "weekly_sonnet_resets_in": None,
    "extra_spent_usd": None,
    "extra_limit_usd": None,
    "extra_percent": None,
    "credit_balance_usd": None,
    "max_weekly_percent": None,
}

# ── Plan ─────────────────────────────────────────────────────
if 'Max' in full and '20x' in full:
    usage["plan"] = "Max (20x)"
elif 'Pro' in full:
    usage["plan"] = "Pro"

# ── All "X% used" occurrences ────────────────────────────────
pct_matches = list(re.finditer(r'(\d+)%\s*used', full))

# ── Current session ──────────────────────────────────────────
idx = full.lower().find('current session')
if idx >= 0:
    chunk = full[idx:idx+300]
    m = re.search(r'(\d+)%\s*used', chunk)
    if m:
        usage["session_percent"] = int(m.group(1))
    r = re.search(r'[Rr]esets?\s+in\s+([\d]+\s*hr?\s*\d*\s*min)', chunk)
    if r:
        usage["session_resets_in"] = r.group(1).strip()

# ── Weekly: All models ───────────────────────────────────────
idx = full.lower().find('all model')
if idx >= 0:
    # Look backwards for the nearest "X% used" (it's above in the layout)
    chunk_before = full[max(0, idx-300):idx]
    chunk_after = full[idx:idx+200]
    # The percentage is usually right before or after the "All models" label
    m = re.search(r'(\d+)%\s*used', chunk_before + chunk_after)
    if m:
        usage["weekly_all_percent"] = int(m.group(1))
    r = re.search(r'[Rr]esets?\s+([\w]+\s+[\d:]+\s*[AP]M)', chunk_before + chunk_after)
    if r:
        usage["weekly_all_resets"] = r.group(1).strip()

# ── Weekly: Sonnet only ──────────────────────────────────────
idx = full.lower().find('sonnet only')
if idx >= 0:
    chunk = full[max(0, idx-200):idx+200]
    m = re.search(r'(\d+)%\s*used', chunk)
    if m:
        usage["weekly_sonnet_percent"] = int(m.group(1))
    r = re.search(r'[Rr]esets?\s+in\s+([\d]+\s*hr?\s*\d*\s*min)', chunk)
    if r:
        usage["weekly_sonnet_resets_in"] = r.group(1).strip()

# ── Extra usage spend ────────────────────────────────────────
m = re.search(r'\$([\d.]+)\s*spent', full)
if m:
    usage["extra_spent_usd"] = float(m.group(1))

# Extra % used (near "spent")
spent_idx = full.find('spent')
if spent_idx >= 0:
    chunk = full[spent_idx:spent_idx+150]
    m = re.search(r'(\d+)%\s*used', chunk)
    if m:
        usage["extra_percent"] = int(m.group(1))

# Monthly spend limit
limit_idx = full.lower().find('monthly spend limit')
if limit_idx >= 0:
    chunk = full[max(0, limit_idx-150):limit_idx+50]
    m = re.search(r'\$(\d+)', chunk)
    if m:
        usage["extra_limit_usd"] = int(m.group(1))

# ── Credit balance ───────────────────────────────────────────
bal_idx = full.lower().find('current balance')
if bal_idx >= 0:
    chunk = full[max(0, bal_idx-150):bal_idx+50]
    m = re.search(r'\$([\d.]+)', chunk)
    if m:
        usage["credit_balance_usd"] = float(m.group(1))

# ── Max weekly percentage (primary signal for budget guardian) ─
weekly_pcts = [v for v in [
    usage["weekly_all_percent"],
    usage["weekly_sonnet_percent"]
] if v is not None]
usage["max_weekly_percent"] = max(weekly_pcts) if weekly_pcts else None

# ── Write output ─────────────────────────────────────────────
with open(output_path, 'w') as f:
    json.dump(usage, f, indent=2)

print(json.dumps(usage, indent=2))
