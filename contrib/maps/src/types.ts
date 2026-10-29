import type { Theme } from "./theme.ts";

export interface Point {
    lat: number;
    lon: number;
}

/** A position on the image, in pixels. */
export interface Pixel {
    x: number;
    y: number;
}

/** Bounds of an area, in degrees. */
export interface Area {
    south: number;
    west: number;
    north: number;
    east: number;
}

export interface Place extends Point {
    label: string;
    /** File of the pin, the built-in pin when missing. */
    image?: string;
    /** Height of the pin in pixels. */
    size: number;
    /** The image sits on the place, not above it. For symbols that are not a pin. */
    centred: boolean;
}

export interface Poi {
    query: string;
    /** File of the symbol, a dot when missing. */
    image?: string;
    size: number;
    /** Write the name of the node next to it. */
    label: boolean;
}

/** Text on an area of the map, like the name of a sea. */
export interface AreaLabel extends Point {
    text: string;
}

/** The route is given as points or found with an Overpass query. */
export type Route = Point[] | { overpass: string; between?: [number, number] };

/** A map as `loadConfig` returns it, with the defaults filled in. */
export interface MapSpec {
    name: string;
    sizes: string[];
    zoom?: number;
    scale: number;
    note?: string;
    theme: Theme;
    places: Place[];
    route: Route;
    /** Indexes of the places to walk between, along the paths of OpenStreetMap. */
    walk?: [number, number];
    pois: Poi[];
    scaleBar: boolean;
    areaLabels: AreaLabel[];
    overpassUrl: string;
}

/** A map whose route has been looked up, ready to render. */
export type ReadyMap = Omit<MapSpec, "route" | "walk"> & { route: Point[]; walk: Point[] };

/** Colours and the factor for sizes, which all the drawing code needs. */
export interface Style {
    theme: Theme;
    scale: number;
}
