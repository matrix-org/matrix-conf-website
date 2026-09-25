import { esc, fmt, pill, speakersHtml, type Room, type Session } from "./schedule";

/** Position of a tile in a grid (calendar view) and an extra class for its size. */
export type Placement = { style: string; size: string };

export const isLive = (x: Session, now: number) => +x.start <= now && now < +x.end;

// Small crossed-out camera for talks that are not recorded or streamed.
const NO_RECORD = `<span class="norec" role="img" aria-label="Not recorded or streamed" title="Not recorded or streamed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 10l6-3.5v11L15 14M3 6h9a3 3 0 0 1 3 3v6M3 6v10a2 2 0 0 0 2 2h8"/><path d="M2 2l20 20"/></svg></span>`;
const NEW_TAB_HINT = `<span class="sr-only"> (opens in a new tab)</span>`;

type Tile = { x: Session; cls: string; style: string; time: string };

function breakTile({ x, cls, style, time }: Tile, links: Record<string, string>): string {
    // Breaks have no pretalx page; the page that renders them can link some by keyword (hackathon, party).
    const key = Object.keys(links).find((k) => x.title.toLowerCase().includes(k.toLowerCase()));
    if (!key) return `<div class="${cls} break"${style}>${time}<div>${esc(x.title)}</div></div>`;
    const external = /^https?:/.test(links[key]);
    const attrs = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    return `<a class="${cls} break"${style} href="${esc(links[key])}"${attrs}>${time}<div>${esc(x.title)}${external ? NEW_TAB_HINT : ""}</div></a>`;
}

function talkTile({ x, cls, style, time }: Tile, badge: string): string {
    const track = x.track ? `<div>${pill(x.track)}</div>` : "";
    return `<a class="${cls}"${style} href="${x.url}" target="_blank" rel="noopener noreferrer">${time}<div><strong>${esc(x.title)}</strong>${NEW_TAB_HINT}${badge}${x.noRecord ? NO_RECORD : ""}${speakersHtml(x)}${track}</div></a>`;
}

/**
 * Tiles for `items` (a subset of `r.items`, e.g. one day). Next/Now markers are relative to the whole room.
 * With `place` (calendar view) tiles get their grid position and no Now marker.
 */
export function sessionTiles(r: Room, items: Session[], now: number, links: Record<string, string>, place?: (x: Session) => Placement): string {
    const f = fmt(r.tz);
    const next = r.items.find((x) => !x.isBreak && +x.start > now);
    const upcoming = r.items.find((x) => +x.start > now); // the Now marker goes right before this, break or talk
    const showNow = !r.items.some((x) => isLive(x, now)) && +r.items[0].end <= now; // only once under way, between sessions
    return items.map((x) => {
        const p = place?.(x);
        const tile: Tile = {
            x,
            cls: `session${isLive(x, now) ? " live" : +x.end <= now ? " past" : ""}${p ? " " + p.size : ""}`,
            style: p ? ` style="${p.style}"` : "",
            time: `<time datetime="${new Date(x.start).toISOString()}">${f.time.format(x.start)}–${f.time.format(x.end)}</time>`,
        };
        const marker = !place && x === upcoming && showNow ? `<div class="now-line">Now</div>` : "";
        if (x.isBreak) return marker + breakTile(tile, links);
        const badge = isLive(x, now) ? `<span class="badge">Live</span>` : x === next ? `<span class="badge next">Next</span>` : "";
        return marker + talkTile(tile, badge);
    }).join("");
}
