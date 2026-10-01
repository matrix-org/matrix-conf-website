import {
    esc,
    fmt,
    isKeynote,
    trackColors,
    speakersHtml,
    talksOf,
    type Room,
    type Session,
} from "./schedule";

/** Position of a tile in a grid (calendar view) and an extra class for its size. */
export type Placement = {
    /** CSS `style` attribute value placing the tile in the grid. */
    style: string;
    /** Extra class to add to the tile for a small size, or an empty string for the default size. */
    size: string;
};

/**
 * Whether `session` is running at `now`.
 *
 * @param session Session to check.
 * @param now Time to check against, as milliseconds since the epoch.
 * @returns True if `session` has started and has not ended yet.
 */
export const isLive = (session: Session, now: number) =>
    +session.start <= now && now < +session.end;

// Small crossed-out camera for talks that are not recorded or streamed.
const NO_RECORD = `<span class="norec" role="img" aria-label="Not recorded or streamed" title="Not recorded or streamed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 10l6-3.5v11L15 14M3 6h9a3 3 0 0 1 3 3v6M3 6v10a2 2 0 0 0 2 2h8"/><path d="M2 2l20 20"/></svg></span>`;
const NEW_TAB_HINT = `<span class="sr-only"> (opens in a new tab)</span>`;

/** The parts a break tile and a talk tile are built from, computed once per session. */
type Tile = {
    /** Session the tile represents. */
    session: Session;
    /** CSS class(es) for the tile, e.g. "session live". */
    className: string;
    /** CSS `style` attribute value, including the leading space, or an empty string when there is none. */
    style: string;
    /** Rendered `<time>` element for the session's start and end. */
    time: string;
};

/**
 * Renders a break as a tile, linked to `links[key]` when its title matches one of the given keywords.
 *
 * @param tile Tile parts to render.
 * @param links Map from a title keyword (e.g. "Hackathon") to a URL, for breaks that have a page to link to.
 * @returns HTML for the break tile.
 */
function breakTile(
    { session, className, style, time }: Tile,
    links: Record<string, string>,
): string {
    // Breaks have no pretalx page; the page that renders them can link some by keyword (hackathon, party).
    const key = Object.keys(links).find((keyword) =>
        session.title.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (!key)
        return `<div class="${className} break"${style}>${time}<div>${esc(session.title)}</div></div>`;
    const external = /^https?:/.test(links[key]);
    const attrs = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    return `<a class="${className} break"${style} href="${esc(links[key])}"${attrs}>${time}<div>${esc(session.title)}${external ? NEW_TAB_HINT : ""}</div></a>`;
}

/**
 * Renders a talk as a tile linking to its pretalx page.
 *
 * @param tile Tile parts to render.
 * @param badge "Live" or "Next" badge HTML, or an empty string for neither.
 * @returns HTML for the talk tile.
 */
function talkTile(
    { session, className, style, time }: Tile,
    badge: string,
): string {
    const track = session.track
        ? `<span class="track">${esc(session.track.name)}</span>`
        : "";
    return `<a class="${className}"${style} href="${session.url}" target="_blank" rel="noopener noreferrer">${time}${badge}<div>${session.recorded ? "" : NO_RECORD}<strong>${esc(session.title)}</strong>${NEW_TAB_HINT}${speakersHtml(session)}${track}</div></a>`;
}

/**
 * Tiles for `items` (a subset of `room.items`, e.g. one day). Next/Now markers are relative to the whole room.
 * With `place` (calendar view) tiles get their grid position and no Now marker.
 *
 * @param room Room the sessions belong to.
 * @param items Sessions to render, in the order they should appear.
 * @param now Time to render as "now", as milliseconds since the epoch.
 * @param links Map from a title keyword to a URL, passed through to {@link breakTile}.
 * @param place Function placing a session in a grid (calendar view); omitted for a plain list.
 * @returns The concatenated HTML of all tiles.
 */
export function sessionTiles(
    room: Room,
    items: Session[],
    now: number,
    links: Record<string, string>,
    place?: (session: Session) => Placement,
): string {
    const formatter = fmt(room.timezone);
    const next = talksOf(room).find((session) => +session.start > now);
    const upcoming = room.items.find((session) => +session.start > now); // the Now marker goes right before this, break or talk
    const showNow =
        !room.items.some((session) => isLive(session, now)) &&
        +room.items[0].end <= now; // only once under way, between sessions
    return items
        .map((session) => {
            const placement = place?.(session);
            const declarations = [
                placement?.style,
                session.track && `--track:${trackColors(session.track).text}`,
            ]
                .filter(Boolean)
                .join(";");
            const tile: Tile = {
                session,
                className: `session${isKeynote(session) ? " keynote" : ""}${isLive(session, now) ? " live" : +session.end <= now ? " past" : ""}${placement ? " " + placement.size : ""}`,
                style: declarations ? ` style="${declarations}"` : "",
                time: `<time datetime="${new Date(session.start).toISOString()}">${formatter.time.format(session.start)}–${formatter.time.format(session.end)}</time>`,
            };
            const marker =
                !place && session === upcoming && showNow
                    ? `<div class="now-line">Now</div>`
                    : "";
            if (session.isBreak) return marker + breakTile(tile, links);
            const badge = isLive(session, now)
                ? `<span class="badge">Live</span>`
                : session === next
                  ? `<span class="badge next">Next</span>`
                  : "";
            return marker + talkTile(tile, badge);
        })
        .join("");
}
