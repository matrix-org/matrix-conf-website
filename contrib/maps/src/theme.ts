export const DEFAULT_THEME = {
    background: "#ffffff",
    green: "#cdeeb7",
    dots: "#8fc27a",
    park: "#bfe6a8",
    town: "#efbb68",
    campus: "#f1f0c4",
    water: "#a7d6f0",
    building: "#ebb25a",
    road: "#2f3b3b",
    roadMid: "#667373",
    roadMinor: "#97a2a2",
    railTies: "#ffffff",
    route: "#ae7fe9",
    outline: "#000000",
    pin: "#ffffff",
    pinText: "#000000",
    label: "#000000",
    labelText: "#ffffff",
    labelBorder: "#636569",
    poi: "#000000",
    areaLabel: "#1f4f6b",
};

export type Theme = Record<keyof typeof DEFAULT_THEME, string>;

/** Ready-made themes, the `preset` of a theme in the config. */
export const THEMES: Record<string, Theme> = {
    default: DEFAULT_THEME,
    // Muted base for maps where the route or the pins should be the only strong colours.
    quiet: {
        ...DEFAULT_THEME,
        green: "#e6f1dc",
        dots: "#b5d1a5",
        park: "#dbead0",
        town: "#dccaa0",
        campus: "#f1efe4",
        water: "#bcdaea",
        building: "#e6d6b6",
        road: "#46514f",
        roadMid: "#7b8787",
        roadMinor: "#b5bdbd",
    },
};

interface Layer {
    layer: string;
    /** Only features of these classes. */
    classes?: string[];
    /** Colour of the theme to fill the shapes with. */
    fill?: keyof Theme;
    /** Colour of the theme and width of the lines to draw instead, `dash` is an SVG dash pattern. */
    stroke?: keyof Theme;
    width?: number;
    dash?: string;
    /** Draw a pattern of dots over the shapes, so that they differ from other fills in more than colour. */
    dots?: boolean;
    /** Limits for the zoom of the vector tiles: buildings only exist close up, and far away the coloured towns stand in for them. */
    minZoom?: number;
    maxZoom?: number;
}

/** In the order they are drawn. */
export const LAYERS: Layer[] = [
    { layer: "landcover", classes: ["grass", "wood", "farmland"], fill: "green", dots: true },
    { layer: "park", fill: "park", dots: true },
    {
        layer: "landuse",
        classes: ["residential", "suburb", "neighbourhood", "commercial", "retail", "industrial"],
        fill: "town",
        maxZoom: 12,
    },
    {
        layer: "landuse",
        classes: ["pitch", "playground", "school", "university", "college", "hospital", "cemetery"],
        fill: "campus",
        minZoom: 13,
    },
    { layer: "water", fill: "water" },
    { layer: "building", fill: "building", minZoom: 13 },
    {
        layer: "transportation",
        classes: ["path", "pedestrian", "track", "service"],
        stroke: "roadMinor",
        width: 1,
        minZoom: 16,
    },
    { layer: "transportation", classes: ["minor"], stroke: "roadMinor", width: 1.6, minZoom: 13 },
    {
        layer: "transportation",
        classes: ["tertiary", "secondary"],
        stroke: "roadMid",
        width: 3,
        minZoom: 13,
    },
    { layer: "transportation", classes: ["rail"], stroke: "road", width: 3, minZoom: 13 },
    {
        layer: "transportation",
        classes: ["rail"],
        stroke: "railTies",
        width: 1.4,
        dash: "5 5",
        minZoom: 13,
    },
    { layer: "transportation", classes: ["secondary"], stroke: "roadMid", width: 2, maxZoom: 12 },
    {
        layer: "transportation",
        classes: ["primary", "trunk", "motorway"],
        stroke: "road",
        width: 5,
    },
];
