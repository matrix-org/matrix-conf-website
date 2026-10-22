import sharp from "sharp";
import {
    boundsOf,
    fitZoom,
    metresPerPixel,
    midpoint,
    niceLength,
    project,
    unproject,
} from "./geo.ts";
import { findNodes } from "./overpass.ts";
import {
    areaLabel,
    at,
    credit,
    dot,
    icon,
    inside,
    label,
    pinShape,
    pinText,
    routeLine,
    scaleBar,
    type Overlay,
} from "./overlays.ts";
import { drawTiles } from "./tiles.ts";
import type { Pixel, Point, ReadyMap } from "./types.ts";

/** Renders one map at the given size. Returns the image. */
export async function render(map: ReadyMap, width: number, height: number): Promise<Buffer> {
    const { places, route } = map;
    const style = { theme: map.theme, scale: map.scale };
    const points = [...places, ...route];
    const zoom = map.zoom ?? fitZoom(points, width, height);

    // The points are centred in the image. `origin` is its top left corner on the map of the world.
    const { left, top, right, bottom } = boundsOf(points.map((point) => project(point, zoom)));
    const origin = { x: (left + right) / 2 - width / 2, y: (top + bottom) / 2 - height / 2 };
    const toImage = (point: Point): Pixel => {
        const { x, y } = project(point, zoom);
        return { x: x - origin.x, y: y - origin.y };
    };

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
        `<defs><pattern id="dots" width="${9 * map.scale}" height="${9 * map.scale}" patternUnits="userSpaceOnUse"><circle cx="${2 * map.scale}" cy="${2 * map.scale}" r="${1.1 * map.scale}" fill="${map.theme.dots}"/></pattern></defs>`,
        `<rect width="100%" height="100%" fill="${map.theme.background}"/>`,
        await drawTiles(style, origin, zoom, width, height),
        routeLine(style, route.map(toImage)),
    ];
    const overlays: Overlay[] = [];

    const northWest = unproject(origin, zoom);
    const southEast = unproject({ x: origin.x + width, y: origin.y + height }, zoom);
    const area = {
        south: southEast.lat,
        west: northWest.lon,
        north: northWest.lat,
        east: southEast.lon,
    };
    for (const poi of map.pois) {
        const symbol = poi.image && (await icon(poi.image, poi.size * map.scale));
        for (const node of await findNodes(map.overpassUrl, poi.query, area)) {
            const position = toImage(node);
            if (symbol)
                overlays.push(
                    at(symbol, position.x - symbol.width / 2, position.y - symbol.height / 2),
                );
            else svg.push(dot(style, position));
        }
    }

    for (const place of places) {
        const position = toImage(place);
        if (place.image) {
            const symbol = await icon(place.image, place.size * map.scale);
            overlays.push(at(symbol, position.x - symbol.width / 2, position.y - symbol.height));
        } else {
            svg.push(pinShape(style, position, place.size));
            overlays.push(await pinText(style, position, place.size));
        }
        if (place.label) {
            const box = await label(style, place.label);
            overlays.push(at(box, position.x - box.width / 2, position.y + 8 * map.scale));
        }
    }
    if (map.note && route.length > 1) {
        const box = await label(style, map.note);
        const middle = midpoint(route.map(toImage));
        overlays.push(at(box, middle.x - box.width / 2, middle.y - box.height - 14 * map.scale));
    }
    for (const area of map.areaLabels) {
        const box = await areaLabel(style, area.text);
        const position = toImage(area);
        overlays.push(at(box, position.x - box.width / 2, position.y - box.height / 2));
    }
    if (map.scaleBar) {
        const { lat } = unproject({ x: origin.x + width / 2, y: origin.y + height / 2 }, zoom);
        const perPixel = metresPerPixel(lat, zoom);
        const metres = niceLength(width * 0.25 * perPixel);
        const bar = await scaleBar(style, metres, metres / perPixel);
        overlays.push(at(bar, 0, height - bar.height));
    }
    const box = await credit(style);
    overlays.push(at(box, width - box.width, height - box.height));

    svg.push("</svg>");
    return sharp(Buffer.from(svg.join("")))
        .composite(overlays.map(inside(width, height)))
        .toBuffer();
}
