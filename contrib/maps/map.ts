#!/usr/bin/env node
// Renders OpenStreetMap data as images in the style of the maps on the website.
// Run with --help for the usage, README.md describes the config file.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { loadConfig } from "./src/config.ts";
import { render } from "./src/render.ts";
import { findRoute } from "./src/route.ts";
import { findWalk } from "./src/walk.ts";

const USAGE = `Usage: node map.ts CONFIG.json [--out DIR] [MAP...]

Renders the maps of the config file, or only the named ones.
The images go to the "out" directory of the config file unless --out says otherwise.`;

const { values, positionals } = parseArgs({
    options: { out: { type: "string" }, help: { type: "boolean" } },
    allowPositionals: true,
});
const [file, ...names] = positionals;

if (values.help || !file) {
    console.error(USAGE);
    process.exit(values.help ? 0 : 1);
}

const config = await loadConfig(file);
const maps = config.maps.filter((map) => names.length === 0 || names.includes(map.name));
if (maps.length === 0) throw new Error(`No map named ${names.join(", ")}`);

const out = values.out ?? config.out;
await mkdir(out, { recursive: true });

for (const spec of maps) {
    const map = { ...spec, route: await findRoute(spec), walk: await findWalk(spec) };
    for (const size of map.sizes) {
        const [width, height] = size.split("x").map(Number);
        const name = map.sizes.length > 1 ? `${map.name}-${size}` : map.name;
        const target = join(out, `${name}.${config.format}`);
        await sharp(await render(map, width, height)).toFile(target);
        console.log(target);
    }
}
