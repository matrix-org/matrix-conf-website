// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    publicDir: "./static",  // Updating this value and the next for consistency
    outDir: "./public",     // with how Zola was deployed, to keep CF Pages happy.
    site: "https://conference.matrix.org",
    integrations: [sitemap()],
    image: {
        layout: 'constrained',
        objectFit: 'cover',
        objectPosition: 'center',
        responsiveStyles: true,
    },
});
