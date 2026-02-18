#!/usr/bin/env bash

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
      cp "$thumb" "$TARGET_DIR/thumbnail_${ID}.avif"
      echo "✔ copied $dir → $TARGET_DIR/thumbnail_${ID}.avif"
    else
      echo "⚠️  no ID found in $session"
    fi

    echo "📝 updated $session (thumbnail: true)"
  fi
done

