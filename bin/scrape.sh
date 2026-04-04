#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Claude Desktop Usage Scraper
# ═══════════════════════════════════════════════════════════════
# Opens Claude Settings > Usage, screenshots it, OCRs it via
# macOS Vision framework, extracts usage metrics.
#
# Requirements: macOS, Claude desktop app, cliclick, Python 3
# Output: $DATA_DIR/claude-usage.json (default: ./data/)
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${USAGE_DATA_DIR:-$SCRIPT_DIR/../data}"
OUTPUT="$DATA_DIR/claude-usage.json"
mkdir -p "$DATA_DIR"

command -v cliclick &>/dev/null || { echo '{"error":"cliclick not installed. Run: brew install cliclick"}' > "$OUTPUT"; exit 1; }

# ── 1. Navigate to Settings > Usage ──────────────────────────
osascript -e 'tell application "Claude" to activate'
sleep 1
osascript <<'AS'
tell application "System Events"
    tell process "Claude"
        set frontmost to true
        delay 0.5
        keystroke "," using command down
        delay 2
    end tell
end tell
AS
sleep 1

# Get window position
WPOS=$(osascript -e '
tell application "System Events"
    tell process "Claude"
        set pos to position of window 1
        set sz to size of window 1
        return (item 1 of pos as text) & "," & (item 2 of pos as text) & "," & (item 1 of sz as text) & "," & (item 2 of sz as text)
    end tell
end tell
')
IFS=',' read -r WX WY WW WH <<< "$WPOS"

# Click "Usage" in settings nav (~345px from left, ~350px from top of window)
osascript -e 'tell application "Claude" to activate'
sleep 0.3
cliclick c:$((WX+345)),$((WY+350))
sleep 2

# ── 2. Screenshot Usage page (top + scrolled) ────────────────
SHOT1="/tmp/claude-usage-top-$$.png"
SHOT2="/tmp/claude-usage-bottom-$$.png"

screencapture -x -R ${WX},${WY},${WW},${WH} "$SHOT1"

# Scroll down to see weekly limits + extra usage
osascript -e 'tell application "System Events" to key code 121'
sleep 1
screencapture -x -R ${WX},${WY},${WW},${WH} "$SHOT2"

# Close settings (go back to chat)
osascript -e 'tell application "System Events" to key code 53'

# ── 3. OCR both screenshots via macOS Vision framework ───────
ocr_image() {
    swift -e "
import Vision; import AppKit
let url = URL(fileURLWithPath: \"$1\")
guard let img = NSImage(contentsOf: url),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
try VNImageRequestHandler(cgImage: cg).perform([req])
for obs in req.results ?? [] {
    if let t = obs.topCandidates(1).first?.string { print(t) }
}
" 2>/dev/null
}

OCR1=$(ocr_image "$SHOT1")
OCR2=$(ocr_image "$SHOT2")
ALL_TEXT="$OCR1
$OCR2"

# Clean up screenshots
rm -f "$SHOT1" "$SHOT2"

# ── 4. Parse usage metrics ───────────────────────────────────
python3 "${SCRIPT_DIR}/../lib/parse-usage.py" "$ALL_TEXT" "$OUTPUT"
