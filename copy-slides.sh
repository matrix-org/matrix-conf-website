#!/usr/bin/env bash

set -euo pipefail

TARGET_DIR="static/slides"
mkdir -p "$TARGET_DIR"

for dir in src/talks/*; do
    session="$dir/session.json"
    slides="$dir/slides.pdf"

    if [[ -f "$session" && -f "$slides" ]]; then
        ID=$(jq -r '.ID // empty' "$session")

        if [[ -n "$ID" ]]; then
            target="$TARGET_DIR/slides_${ID}.pdf"
            cp "$slides" "$target"
            echo "✔ copied $dir →  $target"
        else
            echo "⚠️ no ID found in $session"
        fi

        tmp="$(mktemp)"
        jq --argjson slides true \
            '.slides = $slides' \
            "$session" >"$tmp"
        mv "$tmp" "$session"

        echo "📝 updated $session (slides: true)"
    fi
done
