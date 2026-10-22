import type { Pixel, Point } from "./types.ts";

/** Size of a tile in pixels at the zoom of the map, as in OpenStreetMap. */
export const TILE = 256;

/** Position in pixels on the map of the whole world at the given zoom. */
export function project({ lat, lon }: Point, zoom: number): Pixel {
    const scale = TILE * 2 ** zoom;
    const sin = Math.sin((lat * Math.PI) / 180);
    return {
        x: ((lon + 180) / 360) * scale,
        y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
    };
}

export function unproject({ x, y }: Pixel, zoom: number): Point {
    const scale = TILE * 2 ** zoom;
    return {
        lon: (x / scale) * 360 - 180,
        lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI,
    };
}

/** The smallest and largest x and y of some pixels. */
export function boundsOf(pixels: Pixel[]) {
    const xs = pixels.map((p) => p.x);
    const ys = pixels.map((p) => p.y);
    return {
        left: Math.min(...xs),
        top: Math.min(...ys),
        right: Math.max(...xs),
        bottom: Math.max(...ys),
    };
}

/** The highest zoom at which all points fit the image with some room around them. */
export function fitZoom(points: Point[], width: number, height: number, padding = 100): number {
    const { left, top, right, bottom } = boundsOf(points.map((point) => project(point, 0)));
    if (left === right && top === bottom) return 16;
    return Math.log2(
        Math.min((width - 2 * padding) / (right - left), (height - 2 * padding) / (bottom - top)),
    );
}

/** The point halfway along a line. */
export function midpoint(line: Pixel[]): Pixel {
    const lengths = line.slice(1).map((p, i) => Math.hypot(p.x - line[i].x, p.y - line[i].y));
    let left = lengths.reduce((sum, length) => sum + length, 0) / 2;
    for (let i = 0; i < lengths.length; i++) {
        if (left <= lengths[i]) {
            const t = left / lengths[i];
            return {
                x: line[i].x + t * (line[i + 1].x - line[i].x),
                y: line[i].y + t * (line[i + 1].y - line[i].y),
            };
        }
        left -= lengths[i];
    }
    return line[0];
}

/** How many metres a pixel of the map is long at a latitude. */
export function metresPerPixel(lat: number, zoom: number): number {
    return (40_075_017 * Math.cos((lat * Math.PI) / 180)) / (TILE * 2 ** zoom);
}

/** The longest of 1, 2, 5, 10, 20, 50 ... metres that is at most `limit` metres. */
export function niceLength(limit: number): number {
    const power = 10 ** Math.floor(Math.log10(limit));
    return [5, 2, 1].map((step) => step * power).find((length) => length <= limit) ?? power;
}
