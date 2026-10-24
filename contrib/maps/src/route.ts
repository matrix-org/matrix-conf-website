import { gap } from "./geo.ts";
import { findLines } from "./overpass.ts";
import type { MapSpec, Point } from "./types.ts";

const MARGIN = 0.03; // degrees around the places that `{{bbox}}` of a route query covers

/**
 * The points of the route of a map. The config gives them directly, or as an Overpass
 * query, whose result is joined into one line and cut down to the part between two
 * places, the first and the last unless `between` says otherwise. `{{bbox}}` in the query is the area around the places.
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
    const [from, to] = map.route.between ?? [0, places.length - 1];
    const start = snap(line, places[from]);
    const end = snap(line, places[to]);
    const [first, last] = start.position <= end.position ? [start, end] : [end, start];
    return [first.point, ...line.slice(first.index + 1, last.index + 1), last.point];
}

/**
 * Joins lines end to end into one, flipping those that run the other way. The lines have to be
 * in order, as the members of a route relation are.
 */
export function chain(lines: Point[][]): Point[] {
    const result: Point[] = [];
    for (const line of lines) {
        const end = result[result.length - 1];
        const flip = end && gap(end, line[line.length - 1]) < gap(end, line[0]);
        const points = flip ? line.toReversed() : line;
        result.push(...(end && gap(end, points[0]) === 0 ? points.slice(1) : points)); // ways share their end points
    }
    return result;
}

/** Where on the line the place is closest: the segment, how far along the line, and the point. */
function snap(line: Point[], place: Point) {
    const scale = Math.cos((place.lat * Math.PI) / 180);
    let best = { index: 0, position: 0, point: line[0], distance: Infinity };
    for (let index = 0; index < line.length - 1; index++) {
        const a = line[index];
        const b = line[index + 1];
        const dx = (b.lon - a.lon) * scale;
        const dy = b.lat - a.lat;
        const length = dx * dx + dy * dy;
        const t =
            length === 0
                ? 0
                : Math.max(
                      0,
                      Math.min(
                          1,
                          ((place.lon - a.lon) * scale * dx + (place.lat - a.lat) * dy) / length,
                      ),
                  );
        const point = { lat: a.lat + t * dy, lon: a.lon + t * (b.lon - a.lon) };
        const distance = gap(point, place);
        if (distance < best.distance) best = { index, position: index + t, point, distance };
    }
    return best;
}
