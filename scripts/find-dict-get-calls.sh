#!/bin/bash
# Finds potential dict.get() and typed dict.get* helper calls in the codebase.
# Usage: ./scripts/find-dict-get-calls.sh [--run]
#
# With --run, executes `opencode run` for each file with dict.get calls.

PATTERN='[a-z_]\)?\s*\.get(Array|Bool|Dict|Name|Number|Stream|String)?\s*\('

RUN_MODE=false
if [[ "$1" == "--run" ]]; then
  RUN_MODE=true
fi

if $RUN_MODE; then
  # Create log directory
  LOG_DIR="debug/logs/dict-callers"
  mkdir -p "$LOG_DIR"

  # Get unique files with dict.get calls
  files=$(rg -l "$PATTERN" src -g '*.ts' -i | grep -v 'node_modules')

  for file in $files; do
    # Get line numbers for this file
    lines=$(rg -n "$PATTERN" "$file" -i \
      | grep -v 'this\.get' \
      | cut -d: -f1 \
      | tr '\n' ',' \
      | sed 's/,$//')

    # Skip if no lines found after filtering
    if [[ -z "$lines" ]]; then
      continue
    fi

    # Create log file path (replace / with _ for filename)
    log_file="$LOG_DIR/$(echo "$file" | tr '/' '_').log"

    echo ""
    echo "========================================"
    echo "Processing: $file"
    echo "Lines: $lines"
    echo "Log: $log_file"
    echo "========================================"

    PROMPT="Review and update PdfDict getter calls in this file to use the new ref resolver pattern.

## Context

PdfDict has getter methods: get(), getArray(), getBool(), getDict(), getName(), getNumber(), getStream(), getString().
These now accept an optional ref resolver parameter. The variable holding the PdfDict could be named anything 
(e.g., \`catalog\`, \`fontDict\`, \`trailer\`, \`info\`, etc.).

Previously, code would:
1. Call a getter on a PdfDict instance (e.g., \`catalog.get('Pages')\`, \`fontDict.getArray('Widths')\`)
2. Check if the result is a PdfRef
3. If so, resolve it manually

Example old pattern:
\`\`\`typescript
let pages = catalog.get('Pages');

let pagesDict: PdfDict | null = null;

if (pages instanceof PdfRef) {
  pagesDict = registry.resolve(pages) as PdfDict;
} else if (pages instanceof PdfDict) {
  pagesDict = pages;
}

if (!pagesDict) {
  throw new Error('Pages entry missing or invalid');
}
\`\`\`

Now you can pass the resolver directly to the getter, which handles resolution automatically.

Example new pattern:
\`\`\`typescript
let pagesDict = catalog.getDict('Pages', registry.resolve.bind(registry));

if (!pagesDict) {
  throw new Error('Pages entry missing or invalid');
}
\`\`\`

## Task

Look at lines $lines in $file and update them where appropriate:

1. If code calls a PdfDict getter then checks \`instanceof PdfRef\` and resolves, refactor to pass the resolver to the getter
2. If code needs to check multiple types (e.g., could be array OR dict), keep using get() with resolver, then do instanceof checks - that's fine
3. Some matches may be false positives (e.g., Map.get, other objects with get methods) - skip those
4. Use your judgment - not everything needs to change but look for opportunities to simplify with the new pattern
5. Run tests after making changes to ensure nothing is broken

## Important

- Make sure a resolver is available in scope before using it
- Don't break existing functionality
- Skip test files if they're testing the old pattern intentionally"

    opencode run --model "anthropic/claude-opus-4-5" "$PROMPT" 2>&1 | tee "$log_file"

    echo ""
    
    # Make a sound if on macos
    if [[ "$OSTYPE" == "darwin"* ]]; then
      afplay /System/Library/Sounds/Glass.aiff
    fi

    read -p "Press Enter to continue to next file (or Ctrl+C to stop)..."
  done

  echo ""
  echo "Done processing all files."
  echo "Logs saved to: $LOG_DIR"
else
  # Default: show matches grouped by file
  rg -n "$PATTERN" src -g '*.ts' -i \
    | grep -v 'this\.get' \
    | grep -v 'node_modules' \
    | sort -t: -k1,1 -k2,2n \
    | awk -F: '{
      file = $1
      line = $2
      content = substr($0, length(file) + length(line) + 3)
      if (file != prev_file) {
        if (prev_file != "") print ""
        print file ":"
        prev_file = file
      }
      printf "  %s: %s\n", line, content
    }'
fi
