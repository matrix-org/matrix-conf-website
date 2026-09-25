import { esc, fmt, type Room, type Session } from "./schedule";
import type { Day } from "./schedule-days";
import { sessionTiles } from "./schedule-tiles";

const HALF_HOUR = 30 * 60_000;
// Calendar scale: a tile is at least this many px per minute, but never smaller than its content. Rows that a
// tile needs more space in grow (equally in every column), so nothing is clipped and start times stay aligned.
const MINUTE = 10;
const IDLE_MINUTE = 2; // px per minute where only breaks run, so lunch doesn't eat the page

const INFO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.01" stroke-linecap="round"/></svg>`;

/** The visible time range of a day, in whole half hours. */
type Span = { from: number; to: number };

function daySpan(sessions: Session[]): Span {
    return {
        from: Math.floor(Math.min(...sessions.map((x) => +x.start)) / HALF_HOUR) * HALF_HOUR,
        to: Math.ceil(Math.max(...sessions.map((x) => +x.end)) / HALF_HOUR) * HALF_HOUR,
    };
}

// One grid row per minute; row 1 holds the room names.
const rowOf = (t: number, { from }: Span) => Math.round((t - from) / 60_000) + 2;

/** The time labels on the left, one per half hour. */
function timeAxis(span: Span, tz: string): string {
    const time = fmt(tz).time;
    let axis = "";
    for (let t = span.from; t < span.to; t += HALF_HOUR) {
        const label = time.format(t);
        axis += `<div class="axis${label.endsWith(":00") ? " hour" : ""}" aria-hidden="true" style="grid-row:${rowOf(t, span)}/${rowOf(t + HALF_HOUR, span)}">${label}</div>`;
    }
    return axis;
}

/** Height in px of every minute of the day. Minutes where no room has a talk (breaks only) are squeezed. */
function minuteHeights(sessions: Session[], span: Span): number[] {
    const talks = sessions.filter((x) => !x.isBreak);
    const heights: number[] = [];
    for (let t = span.from; t < span.to; t += 60_000) heights.push(talks.some((x) => +x.start <= t && t < +x.end) ? MINUTE : IDLE_MINUTE);
    return heights;
}

/** `grid-template-rows` for the minutes, run-length encoded. */
function rowTracks(heights: number[]): string {
    const runs: string[] = [];
    for (let i = 0, n = 0; i < heights.length; i++) {
        n++;
        if (heights[i + 1] !== heights[i]) { runs.push(`repeat(${n},minmax(${heights[i]}px,auto))`); n = 0; }
    }
    return runs.join(" ");
}

/** The room name, with a disclosure that says where the room is. */
function roomHead(room: Room, column: number, id: string): string {
    const info = room.description
        ? `<details class="room-info"><summary aria-label="Where is ${esc(room.name)}?">${INFO_ICON}</summary><p>${esc(room.description)}</p></details>`
        : "";
    return `<div class="room-head" style="grid-column:${column}"><h4 id="${id}">${esc(room.name)}</h4>${info}</div>`;
}

/** The whole calendar of one day: a column per room that has sessions on it. */
export function calendarHtml(rooms: Room[], day: Day, now: number, links: Record<string, string>): string {
    const cols = rooms.filter((r) => day.of(r).length);
    const sessions = cols.flatMap(day.of);
    const span = daySpan(sessions);
    const tz = cols[0].tz;
    const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz });
    const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: tz });
    const heights = minuteHeights(sessions, span);
    const offsets = heights.reduce((acc, h) => (acc.push(acc[acc.length - 1] + h), acc), [0]); // px offset of each minute

    const columns = cols.map((room, c) => {
        // Where a tile goes, and whether it is a short break (drawn as a single line).
        const place = (x: Session) => {
            const px = offsets[rowOf(+x.end, span) - 2] - offsets[rowOf(+x.start, span) - 2]; // rendered height of this tile
            return { style: `grid-column:${c + 2};grid-row:${rowOf(+x.start, span)}/${rowOf(+x.end, span)}`, size: x.isBreak && px <= 45 ? "xs" : "" };
        };
        const id = `room-${day.id}-${c}`;
        // The wrapper adds no box (display: contents) but names the room for screen readers.
        return `<div class="room-col" role="group" aria-labelledby="${id}">${roomHead(room, c + 2, id)}${sessionTiles(room, day.of(room), now, links, place)}</div>`;
    });

    const tracks = `grid-template-columns:4rem repeat(${cols.length},minmax(0,1fr));grid-template-rows:auto ${rowTracks(heights)}`;
    const corner = `<div class="grid-head" aria-hidden="true"></div><div class="head-day" aria-hidden="true">${weekday.format(span.from)}<br>${dayMonth.format(span.from)}</div>`;
    return `<div class="room-grid" style="${tracks}">${corner}${timeAxis(span, tz)}${columns.join("")}</div>`;
}
