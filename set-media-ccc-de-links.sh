#!/usr/bin/env bash

# Downloads the conference talk data from media.ccc.de.
# Then updates the session.json files by adding the URL
# to the talk on media.ccc.de under the key mediaCccDe.

set -euo pipefail

# Download data from media.ccc.de
curl -o matrix-conf-2025.json https://media.ccc.de/public/conferences/matrix-conf-2025

TARGET_DIR="static/talks"
mkdir -p "$TARGET_DIR"

for dir in src/talks/*; do
    session="$dir/session.json"

    if [ ! -f "$session" ]; then
        continue
    fi

    ID=$(jq -r '.ID // empty' "$session")
    FRONTEND_LINK=$(jq -r ".events[] | select(.link | contains(\"${ID}\")) | .frontend_link" matrix-conf-2025.json )

    echo "${ID} ${FRONTEND_LINK}"
    if [[ -z $FRONTEND_LINK ]]; then
        echo "Frontend link not found for ${ID}"
        continue
    fi

    tmp="$(mktemp)"
    jq --argjson slides true \
        ".mediaCccDe = \"${FRONTEND_LINK}\"" \
        "$session" >"$tmp"
    mv "$tmp" "$session"

    echo "media.ccc.de link set for ${ID}"
done
