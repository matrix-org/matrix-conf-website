#!/usr/bin/env bash

# Splits the pretalx custom export, a JSON array of sessions, into one
# src/talks/<sanitized title>/session.json per session.
# Keys that are already in a session.json (slides, mediaCccDe, youtube) are kept.
#
# Usage: ./scripts/split-sessions.sh [static/watch/sessions.json]

set -euo pipefail

INPUT="${1:-static/watch/sessions.json}"
TARGET_DIR="src/talks"

jq -c '.[]' "$INPUT" | while IFS= read -r session; do
    title=$(jq -r '.["Proposal title"] // empty' <<<"$session")
    id=$(jq -r '.ID // empty' <<<"$session")

    if [[ -z "$title" ]]; then
        echo "⚠️ session without a proposal title: $session"
        continue
    fi

    if [[ -z "$id" ]]; then
        echo "Session '$title' has no pretalx ID" >&2
        exit 1
    fi

    # Keep folder names readable without glob metacharacters.
    slug=$(jq -r '.["Proposal title"] | ascii_downcase | gsub("[^\\p{L}\\p{N}]+"; "-") | gsub("^-|-$"; "")' <<<"$session")
    if [[ -z "$slug" ]]; then
        echo "Session '$title' has no usable directory name" >&2
        exit 1
    fi

    dir="$TARGET_DIR/$slug"
    target="$dir/session.json"
    mkdir -p "$dir"

    if [[ -f "$target" ]]; then
        if [[ "$(jq -r '.ID // empty' "$target")" != "$id" ]]; then
            echo "Directory name collision for '$title': $target" >&2
            exit 1
        fi
        tmp="$(mktemp)"
        jq -s '.[0] + .[1]' "$target" <(echo "$session") >"$tmp"
        mv "$tmp" "$target"
    else
        jq . <<<"$session" >"$target"
    fi

    echo "✔ wrote $target"
done
