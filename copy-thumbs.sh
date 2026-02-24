#!/usr/bin/env bash

set -euo pipefail

TARGET_DIR="static/talks"
mkdir -p "$TARGET_DIR"

for dir in src/talks/*; do
    session="$dir/session.json"
    thumb="$dir/thumbnail.avif"
    # check both files exist
    if [[ -f "$session" && -f "$thumb" ]]; then
        # extract ID from session.json
        ID=$(jq -r '.ID // empty' "$session")

        if [[ -n "$ID" ]]; then
            target="$TARGET_DIR/thumbnail_${ID}.avif"
            magick "$thumb" -resize 1600x900 "$target"
            echo "✔ copied and resized $dir → $target"
        else
            echo "⚠️ no ID found in $session"
        fi
    fi
done
