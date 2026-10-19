#!/usr/bin/env bash

# Splits the pretalx custom export, a JSON array of sessions, into one
# src/talks/<title>/session.json per session.
# Keys that are already in a session.json (slides, mediaCccDe, youtube) are kept.
#
# Usage: ./scripts/split-sessions.sh [static/watch/sessions.json]

set -euo pipefail

INPUT="${1:-static/watch/sessions.json}"
TARGET_DIR="src/talks"

jq -c '.[]' "$INPUT" | while IFS= read -r session; do
    title=$(jq -r '.["Proposal title"] // empty' <<<"$session")

    if [[ -z "$title" ]]; then
        echo "⚠️ session without a proposal title: $session"
        continue
    fi

    dir="$TARGET_DIR/${title//\//-}" // replace any slashes with dashes
    target="$dir/session.json"
    mkdir -p "$dir"

    if [[ -f "$target" ]]; then
        tmp="$(mktemp)"
        jq -s '.[0] + .[1]' "$target" <(echo "$session") >"$tmp"
        mv "$tmp" "$target"
    else
        jq . <<<"$session" >"$target"
    fi

    echo "✔ wrote $target"
done
