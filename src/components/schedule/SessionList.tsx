import { Fragment } from "preact";
import { useMemo } from "preact/hooks";
import {
    fmt,
    isKeynote,
    talksOf,
    trackColors,
    type Room,
    type Session,
} from "../../scripts/schedule";
import { Speakers } from "./Speakers";

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

/** Formatters for the time zone of the event and for the viewer's. */
type Formatters = { event: ReturnType<typeof fmt>; local: ReturnType<typeof fmt> };

const NewTabHint = () => <span class="sr-only"> (opens in a new tab)</span>;

/**
 * The session's time in the viewer's time zone, for remote attendees.
 *
 * @param props.session Session to format.
 * @param props.formatters Formatters for the event's and the viewer's time zone.
 * @returns The local time, or nothing when it reads the same as the event's time.
 */
function LocalTime({
    session,
    formatters: { event, local },
}: {
    session: Session;
    formatters: Formatters;
}) {
    const start = local.time.format(session.start);
    if (start === event.time.format(session.start)) return null;
    const nextDay =
        local.dayShort.format(session.start) !==
        event.dayShort.format(session.start)
            ? ` (${local.dayShort.format(session.start)})`
            : "";
    return (
        <span class="local" title="Your local time">
            {start}–{local.time.format(session.end)}
            {nextDay} your time
        </span>
    );
}

/** What a break tile and a talk tile have in common. */
type TileProps = {
    /** Session the tile represents. */
    session: Session;
    /** CSS class(es) for the tile, e.g. "session live". */
    className: string;
    /** CSS `style` attribute value, or undefined when there is none. */
    style?: string;
    /** Element id, or undefined when the tile has none. */
    id?: string;
    /** The `<time>` element for the session's start and end. */
    time: preact.ComponentChildren;
    /** Screen reader only name of the room, or nothing when the room is already clear from the page. */
    room: preact.ComponentChildren;
};

/**
 * A break, linked to `links[key]` when its title matches one of the given keywords.
 *
 * @param props.links Map from a title keyword (e.g. "Hackathon") to a URL, for breaks that have a page to link to.
 */
function BreakTile({
    session,
    className,
    style,
    id,
    time,
    room,
    links,
}: TileProps & { links: Record<string, string> }) {
    // Breaks have no pretalx page; the page that renders them can link some by keyword (hackathon, party).
    const key = Object.keys(links).find((keyword) =>
        session.title.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (!key)
        return (
            <div class={`${className} break`} style={style} id={id}>
                {time}
                <div>
                    {session.title}
                    {room}
                </div>
            </div>
        );
    const external = /^https?:/.test(links[key]);
    return (
        <a
            class={`${className} break`}
            style={style}
            id={id}
            href={links[key]}
            {...(external && { target: "_blank", rel: "noopener noreferrer" })}
        >
            {time}
            <div>
                {session.title}
                {external && <NewTabHint />}
                {room}
            </div>
        </a>
    );
}

/**
 * A talk, linking to its pretalx page.
 *
 * @param props.badge "Live" or "Next" badge, or nothing for neither.
 */
function TalkTile({
    session,
    className,
    style,
    id,
    time,
    room,
    badge,
}: TileProps & { badge: preact.ComponentChildren }) {
    return (
        <a
            class={className}
            style={style}
            id={id}
            href={session.url}
            target="_blank"
            rel="noopener noreferrer"
        >
            {time}
            {badge}
            <div>
                {!session.recorded && (
                    <span
                        class="norec"
                        role="img"
                        aria-label="Not recorded or streamed"
                        title="Not recorded or streamed"
                    />
                )}
                {session.recording && (
                    <span
                        class="rec"
                        role="img"
                        aria-label="Recording available"
                        title="Recording available on media.ccc.de"
                    />
                )}
                <strong>{session.title}</strong>
                <NewTabHint />
                {room}
                <Speakers session={session} />
                {session.track && (
                    <span class="track">{session.track.name}</span>
                )}
            </div>
        </a>
    );
}

/**
 * Tiles for `items` (a subset of `room.items`, e.g. one day). Next/Now markers are relative to the whole room.
 * With `place` (calendar view) tiles get their grid position and no Now marker, and name their room for screen
 * readers, since there the room is only visible as a column heading.
 *
 * @param props.room Room the sessions belong to.
 * @param props.items Sessions to render, in the order they should appear.
 * @param props.now Time to render as "now", as milliseconds since the epoch.
 * @param props.links Map from a title keyword to a URL, for breaks that have a page to link to.
 * @param props.place Function placing a session in a grid (calendar view); omitted for a plain list.
 * @param props.current Session that gets the `now` id, the target of `#now`.
 */
export function SessionList({
    room,
    items,
    now,
    links,
    place,
    current,
}: {
    room: Room;
    items: Session[];
    now: number;
    links: Record<string, string>;
    place?: (session: Session) => Placement;
    current?: Session;
}) {
    const formatters = useMemo(
        () => ({ event: fmt(room.timezone), local: fmt(undefined) }),
        [room.timezone],
    );
    const next = talksOf(room).find((session) => +session.start > now);
    const upcoming = room.items.find((session) => +session.start > now); // the Now marker goes right before this, break or talk
    const showNow =
        !room.items.some((session) => isLive(session, now)) &&
        +room.items[0].end <= now; // only once under way, between sessions
    return (
        <>
            {items.map((session) => {
                const placement = place?.(session);
                const colors = session.track && trackColors(session.track);
                const style =
                    [
                        placement?.style,
                        colors &&
                            `--track:${colors.text};--track-light:${colors.light}`,
                    ]
                        .filter(Boolean)
                        .join(";") || undefined;
                const live = isLive(session, now);
                const className = [
                    "session",
                    isKeynote(session) && "keynote",
                    live ? "live" : +session.end <= now && "past",
                    placement?.size,
                ]
                    .filter(Boolean)
                    .join(" ");
                const time = (
                    <time
                        datetime={new Date(session.start).toISOString()}
                    >
                        {formatters.event.time.format(session.start)}–
                        {formatters.event.time.format(session.end)}
                        <LocalTime session={session} formatters={formatters} />
                    </time>
                );
                const roomName = place && (
                    <span class="sr-only"> Room: {room.name}.</span>
                );
                const marker = !place && session === upcoming && showNow && (
                    <div class="now-line">Now</div>
                );
                const tile = session.isBreak ? (
                    <BreakTile
                        session={session}
                        className={className}
                        style={style}
                        id={session === current ? "now" : undefined}
                        time={time}
                        room={roomName}
                        links={links}
                    />
                ) : (
                    <TalkTile
                        session={session}
                        className={className}
                        style={style}
                        id={session === current ? "now" : undefined}
                        time={time}
                        room={roomName}
                        badge={
                            live ? (
                                <span class="badge">Live</span>
                            ) : (
                                session === next && (
                                    <span class="badge next">Next</span>
                                )
                            )
                        }
                    />
                );
                return (
                    <Fragment key={`${+session.start}-${session.title}`}>
                        {marker}
                        {tile}
                    </Fragment>
                );
            })}
        </>
    );
}
