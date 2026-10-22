import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { Area, Point } from "./types.ts";

export const DEFAULT_URL = "https://overpass-api.de/api/interpreter";

// The rules of the public servers (see the Overpass API page of the OSM wiki): name your
// application in the User-Agent, send one request at a time, cache, and wait 30 seconds
// after an error before asking again.
const USER_AGENT = "matrix-conf-maps (https://github.com/matrix-org/matrix-conf-website)";
const PAUSE = 30; // seconds after an error, doubled for every retry
const RETRIES = 3;
const CACHE = new URL("../.cache/", import.meta.url).pathname;

interface Element {
    type: string;
    lat: number;
    lon: number;
    geometry?: Point[];
    members?: Array<{ geometry?: Point[] }>;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs an Overpass query and returns its elements. `{{bbox}}` in the query is
 * replaced with `area`, like in Overpass Turbo. Answers are cached on disk.
 */
async function query(url: string, text: string, area: Area): Promise<Element[]> {
    const bbox = [area.south, area.west, area.north, area.east].join(",");
    const data = "[out:json][timeout:60];" + text.replaceAll("{{bbox}}", bbox);
    const file = join(
        CACHE,
        createHash("sha256")
            .update(url + data)
            .digest("hex") + ".json",
    );

    try {
        return JSON.parse(await readFile(file, "utf8"));
    } catch {
        // not cached yet
    }

    const run = queue.then(() => fetchElements(url, data));
    queue = run.catch(() => {}); // the next query waits for this one, whether it worked or not
    const elements = await run;

    await mkdir(CACHE, { recursive: true });
    await writeFile(file, JSON.stringify(elements));
    return elements;
}

async function fetchElements(url: string, data: string): Promise<Element[]> {
    for (let attempt = 0; ; attempt++) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "User-Agent": USER_AGENT },
            body: new URLSearchParams({ data }),
            signal: AbortSignal.timeout(90_000),
        });
        if (response.ok) return ((await response.json()) as { elements: Element[] }).elements;
        if (attempt === RETRIES) throw new Error(`${url} answered ${response.status}`);

        const wait = Number(response.headers.get("Retry-After")) || PAUSE * 2 ** attempt;
        console.error(`${url} answered ${response.status}, trying again in ${wait} seconds`);
        await sleep(wait * 1000);
    }
}

/** The nodes an Overpass query finds, for example `node[amenity=cafe]({{bbox}});out;`. */
export async function findNodes(url: string, text: string, area: Area): Promise<Point[]> {
    return (await query(url, text, area)).filter((element) => element.type === "node");
}

/**
 * The geometry of what an Overpass query finds, as lines. The query has to end in `out geom;`.
 * See the README for how to select a route.
 */
export async function findLines(url: string, text: string, area: Area): Promise<Point[][]> {
    const lines: Point[][] = [];
    for (const element of await query(url, text, area)) {
        if (element.geometry) lines.push(element.geometry);
        for (const member of element.members ?? []) {
            if (member.geometry) lines.push(member.geometry);
        }
    }
    return lines;
}
