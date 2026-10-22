import { findLines } from "./overpass.ts";
import type { MapSpec, Point } from "./types.ts";

const MARGIN = 0.03; // degrees around the places that `{{bbox}}` of a route query covers

/**
 * The points of the route of a map. The config gives them directly, or as an Overpass
 * query, whose result is joined into one line and cut down to the part between the
 * first and the last place. `{{bbox}}` in the query is the area around the places.
 */
export async function findRoute(map: MapSpec): Promise<Point[]> {
    if (Array.isArray(map.route)) return map.route;

    const { places } = map;
    const lats = places.map((place) => place.lat);
    const lons = places.map((place) => place.lon);
    const area = {
        south: Math.min(...lats) - MARGIN,
        west: Math.min(...lons) - MARGIN,
        north: Math.max(...lats) + MARGIN,
        east: Math.max(...lons) + MARGIN,
    };
    const lines = await findLines(map.overpassUrl, map.route.overpass, area);
    if (lines.length === 0) throw new Error(`The route query of ${map.name} found nothing`);

    const line = chain(lines);
    const start = nearest(line, places[0]);
    const end = nearest(line, places[places.length - 1]);
    return line.slice(Math.min(start, end), Math.max(start, end) + 1);
}

/** Joins lines end to end, flipping them where needed, so that they form one. */
export function chain(lines: Point[][]): Point[] {
    const [first, ...rest] = lines;
    const result = [...first];
    while (rest.length > 0) {
        const end = result[result.length - 1];
        // The line that has an end closest to where the result ends, and which end that is.
        let best = { distance: Infinity, index: 0, flip: false };
        rest.forEach((line, index) => {
            for (const flip of [false, true]) {
                const distance = gap(end, flip ? line[line.length - 1] : line[0]);
                if (distance < best.distance) best = { distance, index, flip };
            }
        });
        const [line] = rest.splice(best.index, 1);
        const points = best.flip ? line.toReversed() : line;
        result.push(...(best.distance === 0 ? points.slice(1) : points)); // ways share their end points
    }
    return result;
}

function nearest(line: Point[], place: Point): number {
    return line.reduce(
        (best, point, index) => (gap(point, place) < gap(line[best], place) ? index : best),
        0,
    );
}

/** Distance in degrees, enough to tell which point is closer. */
function gap(a: Point, b: Point): number {
    return Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180));
}
