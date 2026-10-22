import { gap } from "./geo.ts";
import { findLines } from "./overpass.ts";
import type { MapSpec, Point } from "./types.ts";

const MARGIN = 0.004; // degrees around the two places that the paths are fetched for
const PATHS =
    'way["highway"]["highway"!~"^(motorway|motorway_link|trunk|trunk_link|construction|proposed|raceway)$"]["foot"!="no"]["access"!~"^(private|no)$"]({{bbox}});out geom;';

interface Vertex {
    point: Point;
    next: Map<string, number>; // neighbour key and the distance to it
}

/**
 * The shortest way on foot between the two places of `walk`, along the paths and roads of
 * OpenStreetMap that people may walk on. Empty when the map has no `walk`.
 */
export async function findWalk(map: MapSpec): Promise<Point[]> {
    if (!map.walk) return [];
    const [from, to] = map.walk.map((index) => map.places[index]);
    const area = {
        south: Math.min(from.lat, to.lat) - MARGIN,
        west: Math.min(from.lon, to.lon) - MARGIN,
        north: Math.max(from.lat, to.lat) + MARGIN,
        east: Math.max(from.lon, to.lon) + MARGIN,
    };

    // Ways that cross share a vertex with the same coordinates.
    const graph = new Map<string, Vertex>();
    const vertex = (point: Point) => {
        const key = `${point.lat},${point.lon}`;
        if (!graph.has(key)) graph.set(key, { point, next: new Map() });
        return key;
    };
    for (const line of await findLines(map.overpassUrl, PATHS, area)) {
        for (let i = 0; i < line.length - 1; i++) {
            const a = vertex(line[i]);
            const b = vertex(line[i + 1]);
            const distance = gap(line[i], line[i + 1]);
            graph.get(a)?.next.set(b, distance);
            graph.get(b)?.next.set(a, distance);
        }
    }

    const closest = (place: Point) =>
        [...graph].reduce((best, entry) =>
            gap(entry[1].point, place) < gap(best[1].point, place) ? entry : best,
        )[0];
    const start = closest(from);
    const goal = closest(to);

    // Dijkstra. The paths of a few streets are small enough to look for the nearest vertex in a list.
    const distance = new Map([[start, 0]]);
    const before = new Map<string, string>();
    const open = new Set([start]);
    const cost = (key: string) => distance.get(key) ?? Infinity;
    while (open.size > 0) {
        const here = [...open].reduce((best, key) => (cost(key) < cost(best) ? key : best));
        if (here === goal) break;
        open.delete(here);
        for (const [key, length] of graph.get(here)?.next ?? []) {
            const total = cost(here) + length;
            if (total < cost(key)) {
                distance.set(key, total);
                before.set(key, here);
                open.add(key);
            }
        }
    }
    if (!before.has(goal) && start !== goal) {
        throw new Error(`No way on foot found for ${map.name}`);
    }

    const path: Point[] = [];
    for (let key: string | undefined = goal; key; key = before.get(key)) {
        const vertex = graph.get(key);
        if (vertex) path.push(vertex.point);
    }
    return [from, ...path.reverse(), to];
}
