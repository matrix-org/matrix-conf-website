import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DEFAULT_URL } from "./overpass.ts";
import { THEMES, type Theme } from "./theme.ts";
import type { MapSpec, Point, Poi } from "./types.ts";

/** What the config file may contain. Maps repeat the keys they can override from the top level. */
interface Overridable {
    theme?: Partial<Theme> & { preset?: string };
    pin?: { image?: string | null; size?: number };
    pois?: Array<{ query: string; image?: string; size?: number; label?: boolean }>;
    /** Show the train stations around, with their names. */
    transit?: boolean;
    overpassUrl?: string;
    scaleBar?: boolean;
    /** `false` turns off the labels of the top level. */
    areaLabels?: Array<{ at: [number, number]; text: string }> | false;
}

interface ConfigFile extends Overridable {
    out?: string;
    format?: string;
    maps: Record<string, Overridable & RawMap>;
}

interface RawMap {
    sizes?: string[];
    zoom?: number;
    scale?: number;
    note?: string;
    places?: Array<{
        at: [number, number];
        label?: string;
        image?: string | null;
        size?: number;
        centred?: boolean;
    }>;
    route?: [number, number][] | { overpass: string; between?: [number, number] };
    walk?: [number, number];
}

export interface Config {
    out: string;
    format: string;
    maps: MapSpec[];
}

/** What `transit` adds: the stations, as small dots with their names. */
const TRANSIT: Poi = {
    query: 'node["railway"="station"]["station"!="subway"]({{bbox}});out;',
    size: 24,
    label: true,
};

/**
 * Reads the config file. Everything at its top level except `maps`, `out` and
 * `format` is a default that a map can override. Paths in the file are relative to the file.
 */
export async function loadConfig(file: string): Promise<Config> {
    const {
        maps,
        out = ".",
        format = "avif",
        ...defaults
    } = JSON.parse(await readFile(file, "utf8")) as ConfigFile;
    const dir = dirname(resolve(file));
    const path = (name?: string | null) => (name ? resolve(dir, name) : undefined);

    return {
        out: resolve(dir, out),
        format,
        maps: Object.entries(maps).map(([name, map]) => {
            if (!map.places?.length) throw new Error(`Map ${name} needs at least one place`);
            const pin = { size: 36, ...defaults.pin, ...map.pin };
            return {
                name,
                sizes: map.sizes ?? ["1100x1100"],
                zoom: map.zoom,
                scale: map.scale ?? 1,
                note: map.note,
                theme: theme({ ...defaults.theme, ...map.theme }),
                scaleBar: map.scaleBar ?? defaults.scaleBar ?? false,
                areaLabels: ((map.areaLabels ?? defaults.areaLabels) || []).map(({ at, text }) => ({
                    ...point(at),
                    text,
                })),
                overpassUrl: map.overpassUrl ?? defaults.overpassUrl ?? DEFAULT_URL,
                route: Array.isArray(map.route) ? map.route.map(point) : (map.route ?? []),
                walk: map.walk,
                places: map.places.map(({ at, label = "", centred = false, ...place }) => {
                    const { image, size } = { ...pin, ...place };
                    return {
                        ...point(at),
                        label,
                        image: path(image),
                        size: size ?? pin.size,
                        centred,
                    };
                }),
                pois: [
                    ...(map.pois ?? defaults.pois ?? []).map(
                        ({ query, image, size = 24, label = false }): Poi => ({
                            query,
                            image: path(image),
                            size,
                            label,
                        }),
                    ),
                    ...((map.transit ?? defaults.transit) ? [TRANSIT] : []),
                ],
            };
        }),
    };
}

function theme({ preset = "default", ...colours }: Partial<Theme> & { preset?: string }): Theme {
    if (!THEMES[preset])
        throw new Error(`Unknown theme ${preset}, use one of ${Object.keys(THEMES).join(", ")}`);
    return { ...THEMES[preset], ...colours };
}

function point([lat, lon]: [number, number]): Point {
    if (!(Math.abs(lat) < 85 && Math.abs(lon) <= 180)) {
        throw new Error(`Not a latitude and longitude: ${lat}, ${lon}`);
    }
    return { lat, lon };
}
