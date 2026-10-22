import sharp from "sharp";
import type { Pixel, Style } from "./types.ts";

const CREDIT = "© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles";

/** Something to put on the image. `left` and `top` are its top left corner. */
export interface Overlay {
    input: Buffer;
    width: number;
    height: number;
    left: number;
    top: number;
}

type Picture = Omit<Overlay, "left" | "top">;

/** The built-in round pin whose tip is at x, y. Its "[m]" is an overlay, see `pinText`. */
export function pinShape({ theme, scale }: Style, { x, y }: Pixel, size: number): string {
    const radius = (size * scale) / 2;
    const centre = y - radius * 1.5;
    const stroke = `stroke="${theme.outline}" stroke-width="${2 * scale}" stroke-linejoin="round"`;
    return `<path d="M${x - radius * 0.6} ${centre + radius * 0.8}L${x} ${y}L${x + radius * 0.6} ${centre + radius * 0.8}Z" fill="${theme.pin}" ${stroke}/>
<circle cx="${x}" cy="${centre}" r="${radius}" fill="${theme.pin}" ${stroke}/>
<path d="M${x - radius * 0.6} ${centre + radius * 0.8}L${x} ${y - 2 * scale}L${x + radius * 0.6} ${centre + radius * 0.8}Z" fill="${theme.pin}"/>`;
}

export async function pinText(
    { theme, scale }: Style,
    { x, y }: Pixel,
    size: number,
): Promise<Overlay> {
    const text = await renderText("[m]", size * scale * 0.5, theme.pinText);
    return at(text, x - text.width / 2, y - size * scale * 0.75 - text.height / 2);
}

/** A plain dot, for places of interest without an image. */
export function dot({ theme, scale }: Style, { x, y }: Pixel): string {
    return `<circle cx="${x}" cy="${y}" r="${5 * scale}" fill="${theme.poi}" stroke="#fff" stroke-width="${2 * scale}"/>`;
}

/** An image file, scaled to the given height. */
export async function icon(file: string, height: number): Promise<Picture> {
    const { data, info } = await sharp(file, { density: 300 })
        .resize({ height: Math.round(height) })
        .png()
        .toBuffer({ resolveWithObject: true });
    return { input: data, width: info.width, height: info.height };
}

/** The route as a line with a dark outline, which stays visible on every colour of the map. */
export function routeLine({ theme, scale }: Style, line: Pixel[]): string {
    if (line.length < 2) return "";
    const d = smooth(line);
    const common = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
    return `<path d="${d}" ${common} stroke="${theme.outline}" stroke-width="${11 * scale}"/><path d="${d}" ${common} stroke="${theme.route}" stroke-width="${7 * scale}"/>`;
}

/** Path through the points with rounded corners (a Catmull-Rom spline as Bézier curves). */
function smooth(line: Pixel[]): string {
    let d = `M${line[0].x} ${line[0].y}`;
    for (let i = 0; i < line.length - 1; i++) {
        const before = line[Math.max(i - 1, 0)];
        const from = line[i];
        const to = line[i + 1];
        const after = line[Math.min(i + 2, line.length - 1)];
        d += `C${from.x + (to.x - before.x) / 6} ${from.y + (to.y - before.y) / 6} ${to.x - (after.x - from.x) / 6} ${to.y - (after.y - from.y) / 6} ${to.x} ${to.y}`;
    }
    return d;
}

export function label({ theme, scale }: Style, text: string): Promise<Picture> {
    return textBox(text, {
        size: 17 * scale,
        color: theme.labelText,
        fill: theme.label,
        border: theme.labelBorder,
        padding: 8 * scale,
    });
}

/** Quiet text for an area, like the name of a sea. Spaced out and slanted, which is how maps write such names. */
export function areaLabel({ theme, scale }: Style, text: string): Promise<Picture> {
    return renderText(text, 15 * scale, theme.areaLabel, 'style="italic" letter_spacing="3072"');
}

/** A scale bar `pixels` long that stands for `metres`. */
export async function scaleBar({ scale }: Style, metres: number, pixels: number): Promise<Picture> {
    const text = await renderText(
        metres >= 1000 ? `${metres / 1000} km` : `${metres} m`,
        13 * scale,
        "#222222",
    );
    const padding = 5 * scale;
    const width = Math.ceil(Math.max(pixels, text.width) + 2 * padding);
    const height = Math.ceil(text.height + 8 * scale + 2 * padding);
    const [left, right, y] = [padding, padding + pixels, 2 * scale + padding];
    const box = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="rgba(255,255,255,.65)"/>
<path d="M${left} ${y - 3 * scale}V${y + 3 * scale}M${left} ${y}H${right}M${right} ${y - 3 * scale}V${y + 3 * scale}" stroke="#444444" stroke-width="${scale}" fill="none"/></svg>`;
    const input = await sharp(Buffer.from(box))
        .composite([
            { input: text.input, left: Math.round(padding), top: Math.round(y + 5 * scale) },
        ])
        .png()
        .toBuffer();
    return { input, width, height };
}

export function credit({ scale }: Style): Promise<Picture> {
    return textBox(CREDIT, {
        size: 12 * scale,
        color: "#222222",
        fill: "rgba(255,255,255,.8)",
        padding: 4 * scale,
    });
}

/** Puts a picture with its top left corner at left, top. */
export function at(picture: Picture, left: number, top: number): Overlay {
    return { ...picture, left: Math.round(left), top: Math.round(top) };
}

/** Keeps an overlay within the image, sharp refuses ones that stick out. */
export function inside(width: number, height: number) {
    return ({ input, width: w, height: h, left, top }: Overlay) => ({
        input,
        left: Math.max(0, Math.min(width - w, left)),
        top: Math.max(0, Math.min(height - h, top)),
    });
}

// Text is drawn by sharp, which can measure it. SVG cannot, and a box has to fit its text.
async function renderText(
    text: string,
    size: number,
    color: string,
    look = 'weight="bold"',
): Promise<Picture> {
    const markup = `<span foreground="${color}" ${look}>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`;
    const { data, info } = await sharp({
        text: { text: markup, font: `sans ${Math.round(size)}`, rgba: true },
    })
        .png()
        .toBuffer({ resolveWithObject: true });
    return { input: data, width: info.width, height: info.height };
}

interface Box {
    size: number;
    color: string;
    fill: string;
    border?: string;
    padding: number;
}

async function textBox(
    text: string,
    { size, color, fill, border, padding }: Box,
): Promise<Picture> {
    const inner = await renderText(text, size, color);
    const width = inner.width + 2 * padding;
    const height = inner.height + 2 * padding;
    const stroke = border ? `stroke="${border}" stroke-width="1"` : "";
    const box = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" fill="${fill}" ${stroke}/></svg>`;
    const input = await sharp(Buffer.from(box))
        .composite([{ input: inner.input, left: Math.round(padding), top: Math.round(padding) }])
        .png()
        .toBuffer();
    return { input, width, height };
}
