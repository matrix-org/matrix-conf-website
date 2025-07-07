# !/bin/bash

if [ "$CF_PAGES_BRANCH" == "main" ]; then
  # build production using base_url from the site config.toml
  pnpm run build
elif [ "$CF_PAGES_BRANCH" == "staging" ]; then
  # build staging using CF_STAGING_URL env
  pnpm run build
else
  # build using the default cf pages env url
  pnpm run build
fi
