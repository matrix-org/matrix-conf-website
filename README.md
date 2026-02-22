# The Matrix Conference Website

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/small.svg)](https://astro.build)

If you want to contribute to the website, make sure the problem you're trying to
fix or the feature you want to implement has been discussed in our issue tracker
and that we are interested in reviewing and merging such a contribution.

To discuss maintenance of this site, please come talk to the team in
[#matrix.org-website:matrix.org](https://matrix.to/#/#matrix.org-website:matrix.org).

To discuss the content of this site, as well as The Matrix Conference itself, please find the organising team in [#events-wg:matrix.org](https://matrix.to/#/#events-wg:matrix.org).

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
