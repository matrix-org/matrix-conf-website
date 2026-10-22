import { VectorTile, type VectorTileLayer } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { TILE } from "./geo.ts";
import { LAYERS } from "./theme.ts";
import type { Pixel, Style } from "./types.ts";

const TILEJSON = "https://tiles.openfreemap.org/planet";
const EXTENT = 4096; // coordinates per tile in the vector data

interface TileJson {
    tiles: string[];
    maxzoom: number;
}

const tilejson: Promise<TileJson> = fetch(TILEJSON).then((response) => response.json());
const cache = new Map<string, Promise<VectorTile>>(); // so that several sizes of a map load their tiles once

/**
 * SVG for the map itself: the vector tiles that cover the image, drawn in the colours of the theme.
 * `origin` is the top left corner of the image on the map of the whole world at `zoom`.
 */
export async function drawTiles(
    { theme, scale }: Style,
    origin: Pixel,
    zoom: number,
    width: number,
    height: number,
) {
    const { maxzoom, tiles } = await tilejson;
    const tileZoom = Math.min(Math.round(zoom), maxzoom);
    const size = TILE * 2 ** (zoom - tileZoom); // pixels per tile on the image

    const wanted = [];
    for (let y = Math.floor(origin.y / size); y <= Math.floor((origin.y + height) / size); y++) {
        for (let x = Math.floor(origin.x / size); x <= Math.floor((origin.x + width) / size); x++) {
            wanted.push({ x, y, ox: x * size - origin.x, oy: y * size - origin.y });
        }
    }
    const loaded = await Promise.all(
        wanted.map(async (tile) => ({
            ...tile,
            data: await fetchTile(tiles[0], tileZoom, tile.x, tile.y),
        })),
    );

    const k = size / EXTENT;
    const lineScale = scale * Math.min(1.6, Math.max(0.6, 0.6 + (zoom - 14) / 3)); // thicker roads when zoomed in
    return LAYERS.filter(
        ({ minZoom = 0, maxZoom = 99 }) => tileZoom >= minZoom && tileZoom <= maxZoom,
    )
        .flatMap((style) =>
            loaded.map(({ data, ox, oy }) => {
                const d = pathData(data.layers[style.layer], style.classes, ox, oy, k);
                if (!d) return "";
                const dots = style.dots ? `<path d="${d}" fill="url(#dots)"/>` : "";
                if (style.fill) return `<path d="${d}" fill="${theme[style.fill]}"/>` + dots;
                const width = (style.width ?? 1) * lineScale;
                const dash = style.dash
                    ? `stroke-dasharray="${style.dash}"`
                    : 'stroke-linecap="round"';
                return `<path d="${d}" fill="none" stroke="${theme[style.stroke ?? "road"]}" stroke-width="${width}" stroke-linejoin="round" ${dash}/>`;
            }),
        )
        .join("");
}

async function fetchTile(template: string, z: number, x: number, y: number): Promise<VectorTile> {
    const url = template
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(y));
    let tile = cache.get(url);
    if (!tile) {
        tile = fetch(url).then(async (response) => {
            if (response.status === 404) return new VectorTile(new PbfReader(new Uint8Array())); // no data, e.g. open sea
            if (!response.ok) throw new Error(`${response.status} for ${url}`);
            return new VectorTile(new PbfReader(new Uint8Array(await response.arrayBuffer())));
        });
        cache.set(url, tile);
    }
    return tile;
}

/** SVG path data for the features of a tile layer, only those of the given classes if there are any. */
function pathData(
    layer: VectorTileLayer | undefined,
    classes: string[] | undefined,
    ox: number,
    oy: number,
    k: number,
) {
    if (!layer) return "";
    let d = "";
    for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        if (feature.type === 1 || (classes && !classes.includes(String(feature.properties.class))))
            continue;
        const close = feature.type === 3 ? "Z" : "";
        for (const ring of feature.loadGeometry()) {
            d +=
                "M" +
                ring
                    .map((p) => `${(ox + p.x * k).toFixed(1)} ${(oy + p.y * k).toFixed(1)}`)
                    .join("L") +
                close;
        }
    }
    return d;
}
