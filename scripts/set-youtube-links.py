#!/usr/bin/env python3
"""Match playlist recordings to session.json files using Pretalx links in video descriptions."""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


def update_links(playlist, sessions, dry_run=False):
    videos = {}
    for video in playlist["entries"]:
        if not video:
            continue
        codes = set(re.findall(r"https?://[^\s]+/talk/([A-Za-z0-9]+)/", video.get("description") or ""))
        if len(codes) != 1:
            print(f"Skipped video without one Pretalx talk link: {video.get('title', video['id'])}")
            continue
        code = codes.pop()
        videos.setdefault(code, set()).add(video["id"])

    changed = 0
    for path, session in sessions:
        matches = videos.get(session["ID"], set())
        if len(matches) != 1:
            reason = "multiple videos" if matches else "no video"
            print(f"Skipped {session['Proposal title']}: {reason}")
            continue
        video_id = next(iter(matches))
        url = f"https://youtu.be/{video_id}"
        if session.get("youtube") in {url, f"https://www.youtube.com/watch?v={video_id}", f"https://youtube.com/watch?v={video_id}"}:
            continue
        print(f"{session['Proposal title']}: {session.get('youtube', '(none)')} → {url}")
        if not dry_run:
            session["youtube"] = url
            with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as output:
                temporary = Path(output.name)
                try:
                    output.write(json.dumps(session, ensure_ascii=False, indent=2) + "\n")
                    output.flush()
                    os.chmod(temporary, path.stat().st_mode)
                    os.replace(temporary, path)
                finally:
                    temporary.unlink(missing_ok=True)
        changed += 1
    print(f"{changed} links {'would be updated' if dry_run else 'updated'}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("playlist", help="YouTube playlist URL for the conference year")
    parser.add_argument("--dry-run", action="store_true", help="Show changes without writing session files")
    args = parser.parse_args()
    sessions = [(path, json.loads(path.read_text())) for path in sorted(Path("src/talks").glob("*/session.json"))]
    if not sessions:
        parser.error("No sessions found. Run this script from the repository root.")
    if len({session["ID"] for _, session in sessions}) != len(sessions):
        parser.error("Multiple session files have the same ID; resolve them before importing links.")
    print("Fetching playlist descriptions with yt-dlp…", flush=True)
    try:
        result = subprocess.run(
            ["yt-dlp", "--ignore-config", "--quiet", "--skip-download", "--dump-single-json",
             "--ignore-no-formats-error", "--extractor-args", "youtube:skip=dash,hls,translated_subs", "--", args.playlist],
            check=True, capture_output=True, text=True,
        )
    except FileNotFoundError:
        parser.exit(1, "yt-dlp is required. Install it before running this script.\n")
    except subprocess.CalledProcessError as error:
        parser.exit(1, f"Could not fetch the playlist:\n{error.stderr}")
    update_links(json.loads(result.stdout), sessions, args.dry_run)


if __name__ == "__main__":
    main()
