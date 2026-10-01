import { pretalxSchedule, pretalxTalkBase } from "../data/pretalx";

/** A pretalx track: a category a session can belong to, shown as a coloured pill. */
export type Track = {
    /** Track name, e.g. "Keynote". */
    name: string;
    /** Track colour as a `#rrggbb` hex string, as pretalx has it. */
    color: string;
};

/** A pretalx speaker. */
export type Speaker = {
    /** Speaker's display name. */
    name: string;
    /** URL of the speaker's avatar thumbnail, if they have one. */
    avatar?: string;
};

/** One talk or break in the schedule. */
export type Session = {
    /** True for a break (coffee, lunch, switchover) rather than a talk; breaks have no pretalx talk page. */
    isBreak: boolean;
    /** True when the talk will be recorded or streamed. Always false for a break. */
    recorded: boolean;
    /** Speakers of the talk, in pretalx order. Always empty for a break. */
    speakers: Speaker[];
    /** Track the talk belongs to, if any. Always undefined for a break. */
    track?: Track;
    /** URL of the pretalx talk page. Empty for a break, which has no page. */
    url: string;
    /** Talk title, or the break's name (e.g. "Coffee Break"). */
    title: string;
    /** Start time. */
    start: Date;
    /** End time. */
    end: Date;
};

/** A pretalx room with all of its sessions for the whole event. */
export type Room = {
    /** Room name, e.g. "Sofya". */
    name: string;
    /** Where the room is, as pretalx describes it. Empty if pretalx has no description for it. */
    description: string;
    /** Position of the room among the others, as pretalx orders them. */
    order: number;
    /** Talks and breaks together, sorted by start time. Use {@link talksOf} for talks only. */
    items: Session[];
    /** IANA time zone the event runs in, e.g. "Europe/Stockholm". */
    timezone: string;
};

/**
 * The talks in `room`, in order, without its breaks.
 *
 * Not stored on `Room` itself: `items` is already sorted, and filtering it is cheap enough (a room has at
 * most a few dozen sessions) that keeping a second array in sync would only add a place for the two to drift
 * apart.
 *
 * @param room Room to get the talks of.
 * @returns `room.items` without the breaks.
 */
export function talksOf(room: Room): Session[] {
    return room.items.filter((session) => !session.isBreak);
}

/**
 * Whether `session` is a keynote, which the schedule highlights with a rainbow.
 *
 * @param session Session to check.
 * @returns True if the session's track is named "Keynote".
 */
export function isKeynote(session: Session): boolean {
    return session.track?.name.toLowerCase() === "keynote";
}

/** The room fields as pretalx has them, before the session lists are attached. */
type RoomInfo = {
    /** Room name, e.g. "Sofya". */
    name: string;
    /** Where the room is, as pretalx describes it. Empty if pretalx has no description for it. */
    description: string;
    /** Position of the room among the others, as pretalx orders them. */
    order: number;
};

let cache: Promise<Map<number, Room>> | undefined;

/**
 * Loads the conference schedule from pretalx and groups it by room.
 *
 * Only real talks (they have a pretalx `code`) and breaks are kept; anything else in the pretalx feed is
 * skipped. The result is cached for the lifetime of the page; a failed request is not cached, so the next
 * call retries.
 *
 * @returns A map from pretalx room id to that room's sessions.
 */
export function loadSchedule(): Promise<Map<number, Room>> {
    cache ??= fetch(pretalxSchedule, { signal: AbortSignal.timeout(8000) }) // a hung request must not hide the content
        .then((response) =>
            response.ok ? response.json() : Promise.reject(response.status),
        )
        .then((data) => {
            const tracks = new Map<number, Track>(
                data.tracks.map((track: any) => [
                    track.id,
                    { name: track.name.en, color: track.color },
                ]),
            );
            const people = new Map<string, Speaker>(
                data.speakers.map((speaker: any) => [
                    speaker.code,
                    {
                        name: speaker.name,
                        avatar:
                            speaker.avatar_thumbnail_tiny ??
                            speaker.avatar_thumbnail_default ??
                            undefined,
                    },
                ]),
            );
            const roomInfo = new Map<number, RoomInfo>(
                data.rooms.map((room: any, index: number) => [
                    room.id,
                    {
                        name: room.name.en,
                        description: room.description?.en ?? "",
                        order: index,
                    },
                ]),
            );
            const rooms = new Map<number, Room>();
            for (const talk of data.talks) {
                const isBreak = !talk.code && talk.slot_type === "break";
                if (!talk.code && !isBreak) continue;
                const room: Room = rooms.get(talk.room) ?? {
                    ...(roomInfo.get(talk.room) ?? {
                        name: String(talk.room),
                        description: "",
                        order: 999,
                    }),
                    items: [],
                    timezone: data.timezone,
                };
                const session: Session = {
                    isBreak,
                    recorded: !talk.do_not_record,
                    speakers: isBreak
                        ? []
                        : talk.speakers
                              .map((code: string) => people.get(code))
                              .filter(Boolean),
                    track: tracks.get(talk.track),
                    url: `${pretalxTalkBase}${talk.code}/`,
                    title: isBreak ? talk.title.en : talk.title,
                    start: new Date(talk.start),
                    end: new Date(talk.end),
                };
                room.items.push(session);
                rooms.set(talk.room, room);
            }
            rooms.forEach((room) =>
                room.items.sort(
                    (sessionA, sessionB) => +sessionA.start - +sessionB.start,
                ),
            );
            return rooms;
        });
    cache.catch(() => (cache = undefined)); // allow retry on the next refresh
    return cache;
}

/**
 * Escapes text for use inside HTML.
 *
 * @param text Plain text to escape.
 * @returns `text` with `& < > " '` replaced by their numeric character references.
 */
export const esc = (text: string) =>
    text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Time and day formatters for a given time zone.
 *
 * @param tz IANA time zone, e.g. "Europe/Stockholm".
 * @returns `time`, an "HH:mm" formatter, and `day`, a "Weekday, D Month" formatter.
 */
export const fmt = (tz: string) => ({
    time: new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
    }),
    day: new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: tz,
    }),
});

/** Colours to render a track in. */
export type TrackColors = {
    /** Pill background colour, as a CSS colour value. */
    background: string;
    /** Pill text colour, as a CSS colour value. */
    foreground: string;
    /** Track colour lightened until it reads as text and as a border on the black page. */
    text: string;
};

/** Text on tiles is dimmed to 70% for past sessions; this luminance keeps it above 4.5:1 contrast then. */
const MIN_TEXT_LUMINANCE = 0.4;

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminanceOf(color: string): number {
    const [red, green, blue] = [1, 3, 5]
        .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
        .map((channel) =>
            channel <= 0.03928
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4,
        );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Lightens a `#rrggbb` colour towards white until it reaches {@link MIN_TEXT_LUMINANCE}. */
function readableOnBlack(color: string): string {
    for (let lighten = 0; lighten < 1; lighten += 0.05) {
        const channels = [1, 3, 5].map((i) =>
            Math.round(
                parseInt(color.slice(i, i + 2), 16) * (1 - lighten) +
                    255 * lighten,
            )
                .toString(16)
                .padStart(2, "0"),
        );
        const candidate = `#${channels.join("")}`;
        if (luminanceOf(candidate) >= MIN_TEXT_LUMINANCE) return candidate;
    }
    return "#fff";
}

/**
 * Picks readable colours for a track.
 *
 * The pill uses the track colour as pretalx has it, except near-black colours (e.g. Keynote), which are inverted to
 * white so the pill still shows on the black page.
 *
 * @param track Track to pick colours for.
 * @returns The pill background and foreground colours and a colour for text on black.
 */
export function trackColors(track: Track): TrackColors {
    const luminance = luminanceOf(track.color);
    const background = luminance < 0.01 ? "#fff" : track.color;
    const foreground = luminance < 0.01 || luminance > 0.179 ? "#000" : "#fff";
    return { background, foreground, text: readableOnBlack(track.color) };
}

/**
 * Renders a track as a coloured pill, in the style used on the 2025 watch page.
 *
 * @param track Track to render, or undefined for no pill.
 * @returns The pill's HTML, or an empty string if `track` is undefined.
 */
export function pill(track?: Track): string {
    if (!track) return "";
    const { background, foreground } = trackColors(track);
    return `<span class="pill" style="background-color:${background};color:${foreground}">${esc(track.name)}</span>`;
}

/**
 * Renders a session's speakers as overlapping avatars, for those who have one, followed by their names.
 *
 * @param session Session to render the speakers of.
 * @returns HTML for the speakers, or an empty string if the session has none.
 */
export function speakersHtml(session: Session): string {
    if (!session.speakers.length) return "";
    const faces = session.speakers.filter((speaker) => speaker.avatar);
    const shown = faces
        .slice(0, 4)
        .map(
            (speaker) =>
                `<img class="avatar" src="${esc(speaker.avatar!)}" alt="" width="24" height="24" loading="lazy">`,
        )
        .join("");
    const more =
        faces.length > 4
            ? `<span class="avatar more">+${faces.length - 4}</span>`
            : "";
    const names = session.speakers.map((speaker) => speaker.name).join(", ");
    return `<span class="who">${faces.length ? `<span class="avatars">${shown}${more}</span>` : ""}<span class="names">${esc(names)}</span></span>`;
}
