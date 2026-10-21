import {
    fmt,
    type Room,
    type Session,
} from "../../scripts/schedule";
import type { Day } from "../../scripts/schedule-days";
import { SessionList } from "./SessionList";

const HALF_HOUR = 30 * 60_000;
// Calendar scale: a tile is at least this many px per minute, but never smaller than its content. Rows that a
// tile needs more space in grow (equally in every column), so nothing is clipped and start times stay aligned.
const MINUTE = 5;
const IDLE_MINUTE = 2; // px per minute where only breaks run, so lunch doesn't eat the page
const IDLE_MAX = 120; // px a stretch with the same breaks running is squeezed to at most, however long it lasts
const MIN_LABEL_HEIGHT = 24; // px a time label needs; squeezed stretches show one label instead of one per half hour

/** The visible time range of a day, in whole half hours. */
type Span = { from: number; to: number };

/**
 * The time range `sessions` spans, rounded outward to whole half hours.
 *
 * @param sessions Sessions to span, e.g. everything on one day.
 * @returns The earliest start and the latest end, each rounded to a half hour.
 */
function daySpan(sessions: Session[]): Span {
    return {
        from:
            Math.floor(
                Math.min(...sessions.map((session) => +session.start)) /
                    HALF_HOUR,
            ) * HALF_HOUR,
        to:
            Math.ceil(
                Math.max(...sessions.map((session) => +session.end)) /
                    HALF_HOUR,
            ) * HALF_HOUR,
    };
}

// One grid row per minute; row 1 holds the room names.
const rowOf = (time: number, { from }: Span) =>
    Math.round((time - from) / 60_000) + 2;

/**
 * Height in px of every minute of the day. Minutes where no room has a talk (breaks only) are squeezed, and a
 * stretch where the same sessions keep running is squeezed to at most {@link IDLE_MAX} in total.
 */
function minuteHeights(sessions: Session[], span: Span): number[] {
    const talks = sessions.filter((session) => !session.isBreak);
    const boundaries = [
        ...new Set(
            sessions.flatMap((session) => [+session.start, +session.end]),
        ),
    ].sort((a, b) => a - b);
    const heights: number[] = [];
    for (let instant = span.from; instant < span.to; instant += 60_000) {
        if (
            talks.some((talk) => +talk.start <= instant && instant < +talk.end)
        ) {
            heights.push(MINUTE);
            continue;
        }
        const stretchStart =
            boundaries.findLast((time) => time <= instant) ?? span.from;
        const stretchEnd = boundaries.find((time) => time > instant) ?? span.to;
        heights.push(
            Math.min(
                IDLE_MINUTE,
                IDLE_MAX / ((stretchEnd - stretchStart) / 60_000),
            ),
        );
    }
    return heights;
}

/** `grid-template-rows` for the minutes, run-length encoded. */
function rowTracks(heights: number[]): string {
    const runs: string[] = [];
    for (let index = 0, runLength = 0; index < heights.length; index++) {
        runLength++;
        if (heights[index + 1] !== heights[index]) {
            runs.push(`repeat(${runLength},minmax(${heights[index]}px,auto))`);
            runLength = 0;
        }
    }
    return runs.join(" ");
}

/**
 * The time labels on the left, one per half hour. Where minutes are squeezed to less than a label's height, one
 * label covers as many half hours as it takes to fit.
 *
 * @param props.span Time range to label.
 * @param props.timezone IANA time zone to format the labels in.
 * @param props.offsets Px offset of the start of each minute of `span`, plus one for the end of the last.
 */
function TimeAxis({
    span,
    timezone,
    offsets,
}: {
    span: Span;
    timezone: string;
    offsets: number[];
}) {
    const time = fmt(timezone).time;
    const offsetAt = (instant: number) =>
        offsets[Math.round((instant - span.from) / 60_000)];
    const labels = [];
    for (let instant = span.from; instant < span.to; ) {
        let end = instant + HALF_HOUR;
        while (
            end < span.to &&
            offsetAt(end) - offsetAt(instant) < MIN_LABEL_HEIGHT
        )
            end += HALF_HOUR;
        const label = time.format(instant);
        labels.push(
            <div
                key={instant}
                class={`axis${label.endsWith(":00") ? " hour" : ""}`}
                aria-hidden="true"
                style={`grid-row:${rowOf(instant, span)}/${rowOf(end, span)}`}
            >
                {label}
            </div>,
        );
        instant = end;
    }
    return <>{labels}</>;
}

/** The room name, with a disclosure that says where the room is. */
function RoomHead({
    room,
    column,
    id,
}: {
    room: Room;
    column: number;
    id: string;
}) {
    return (
        <div class="room-head" style={`grid-column:${column}`}>
            <h4 id={id}>{room.name}</h4>
            {room.description && (
                <details class="room-info">
                    <summary aria-label={`Where is ${room.name}?`}>
                        <span class="info-icon" />
                    </summary>
                    <p>{room.description}</p>
                </details>
            )}
        </div>
    );
}

/**
 * The whole calendar of one day: a column per room that has sessions on it.
 *
 * @param props.rooms Every room to consider; only those with sessions on `day` get a column.
 * @param props.day Day to render, from {@link scheduleDays}.
 * @param props.now Time to render as "now", as milliseconds since the epoch.
 * @param props.links Map from a title keyword to a URL, for breaks that have a page to link to.
 */
export function Calendar({
    rooms,
    day,
    now,
    links,
}: {
    rooms: Room[];
    day: Day;
    now: number;
    links: Record<string, string>;
}) {
    const columns = rooms.filter((room) => day.sessionsOfRoom(room).length);
    const sessions = columns.flatMap((room) => day.sessionsOfRoom(room));
    const span = daySpan(sessions);
    const timezone = columns[0].timezone;
    const weekday = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        timeZone: timezone,
    });
    const dayMonth = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: timezone,
    });
    const heights = minuteHeights(sessions, span);
    const offsets = heights.reduce(
        (offset, height) => (
            offset.push(offset[offset.length - 1] + height),
            offset
        ),
        [0],
    ); // px offset of each minute
    const tracks = `grid-template-columns:4rem repeat(${columns.length},minmax(0,1fr));grid-template-rows:auto ${rowTracks(heights)}`;
    return (
        <div class="room-grid" style={tracks}>
            <div class="grid-head" aria-hidden="true" />
            <div class="head-day" aria-hidden="true">
                {weekday.format(span.from)}
                <br />
                {dayMonth.format(span.from)}
            </div>
            <TimeAxis span={span} timezone={timezone} offsets={offsets} />
            {columns.map((room, index) => {
                const column = index + 2;
                // Where a tile goes, and whether it is a short break (drawn as a single line).
                const place = (session: Session) => {
                    const height =
                        offsets[rowOf(+session.end, span) - 2] -
                        offsets[rowOf(+session.start, span) - 2]; // rendered height of this tile
                    return {
                        style: `grid-column:${column};grid-row:${rowOf(+session.start, span)}/${rowOf(+session.end, span)}`,
                        size: session.isBreak && height <= 45 ? "xs" : "",
                    };
                };
                const id = `room-${day.id}-${index}`;
                // The wrapper adds no box (display: contents) but names the room for screen readers.
                return (
                    <div
                        key={room.name}
                        class="room-col"
                        role="group"
                        aria-labelledby={id}
                    >
                        <RoomHead room={room} column={column} id={id} />
                        <SessionList
                            room={room}
                            items={day.sessionsOfRoom(room)}
                            now={now}
                            links={links}
                            place={place}
                        />
                    </div>
                );
            })}
        </div>
    );
}
