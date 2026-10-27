# The Matrix Conference Website

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/small.svg)](https://astro.build)

If you want to contribute to the website, make sure the problem you're trying to
fix or the feature you want to implement has been discussed in our issue tracker
and that we are interested in reviewing and merging such a contribution.

To discuss maintenance of this site, please come talk to the team in
[#matrix.org-website:matrix.org](https://matrix.to/#/#matrix.org-website:matrix.org).

To discuss the content of this site, as well as The Matrix Conference itself, please find the organising team in [#events-wg:matrix.org](https://matrix.to/#/#events-wg:matrix.org).

## Repo structure

The repo is structured by year.

The canonical domain of The Matrix Conference is conference.matrix.org and
always contains the latest conference.
It is deployed from the `main` branch of this repo.

We "archive" earlier conferences to yearly subdomains, i.e. `YYYY.matrix.org`.,
where the current year is still deployed from `main`.
Earlier years are tracked by branches following a format of `YYYY`.

## Building the website

To build the website, ensure `pnpm` is installed on your machine.
Then, at the root of the project directory, install dependencies with

```shell
pnpm i
```

You can run the development version (and it's local server) with

```shell
pnpm run dev
```

You can check that there are no errors, warning, or hints with

```shell
pnpm lint
```

This repo is configured to use husky and lint-staged to check for errors on each commit.
You may have to run `pnpm prepare` once to set it up.

## Recordings page

The recordings page is `src/components/VodPage.astro`. It is built from `src/talks/<sanitized-title>/session.json`. Run the scripts from the repository root.

To fill it with the talks:

- Export the schedule from [pretalx](https://pretalx.com/orga/event/matrix-conference-2026/schedule/export/#tab-custom) as JSON with the fields proposal title, session type, track, abstract, speaker names, room and start.
- Save the file as `static/watch/sessions.json`.
- Run `./scripts/split-sessions.sh` to create one `src/talks/<sanitized-title>/session.json` per session. It needs `jq`. Folder names use letters and numbers with hyphens between words, so titles with punctuation still load correctly.
- Optional: put a `thumbnail.avif` and a `slides.pdf` into a talk's directory, then run `./scripts/copy-thumbs.sh` (needs `magick`) and `./scripts/copy-slides.sh`.
- Once the videos are on media.ccc.de, run `./scripts/set-media-ccc-de-links.sh` to add the links to the sessions.
- To show the page on `/watch`, set `watchMode` to `"vod"` in `src/data/streams.ts`.
