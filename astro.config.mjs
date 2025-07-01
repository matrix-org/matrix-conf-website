// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    site: "https://conference.matrix.org",
    integrations: [sitemap()],
    image: {
        layout: 'constrained',
        objectFit: 'cover',
        objectPosition: 'center',
        responsiveStyles: true,
    },
});
