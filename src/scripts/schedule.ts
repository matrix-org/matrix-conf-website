import { pretalxSchedule, pretalxTalkBase } from "../data/pretalx";

export type Track = { name: string; color: string };
export type Speaker = { name: string; avatar?: string };
export type Session = { isBreak: boolean; noRecord: boolean; speakers: Speaker[]; track?: Track; url: string; title: string; who: string; start: Date; end: Date };
// `sessions` are talks only (now/next/player logic); `items` also include breaks (schedule list).
export type Room = { name: string; description: string; order: number; sessions: Session[]; items: Session[]; tz: string };

let cache: Promise<Map<number, Room>> | undefined;

// Real talks only (they have a `code`), grouped by pretalx room id, sorted by start.
export function loadSchedule(): Promise<Map<number, Room>> {
    cache ??= fetch(pretalxSchedule, { signal: AbortSignal.timeout(8000) }) // a hung request must not hide the content
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => {
            const tracks = new Map<number, Track>(d.tracks.map((t: any) => [t.id, { name: t.name.en, color: t.color }]));
            const people = new Map<string, Speaker>(d.speakers.map((s: any) => [s.code, { name: s.name, avatar: s.avatar_thumbnail_tiny ?? s.avatar_thumbnail_default ?? undefined }]));
            const roomInfo = new Map<number, { name: string; description: string; order: number }>(d.rooms.map((r: any, i: number) => [r.id, { name: r.name.en, description: r.description?.en ?? "", order: i }]));
            const rooms = new Map<number, Room>();
            for (const t of d.talks) {
                const isBreak = !t.code && t.slot_type === "break";
                if (!t.code && !isBreak) continue;
                const room: Room = rooms.get(t.room) ?? { ...(roomInfo.get(t.room) ?? { name: String(t.room), description: "", order: 999 }), sessions: [], items: [], tz: d.timezone };
                const item: Session = {
                    isBreak,
                    noRecord: !!t.do_not_record,
                    speakers: isBreak ? [] : t.speakers.map((c: string) => people.get(c)).filter(Boolean),
                    track: tracks.get(t.track),
                    url: `${pretalxTalkBase}${t.code}/`,
                    title: isBreak ? t.title.en : t.title,
                    who: isBreak ? "" : t.speakers.map((c: string) => people.get(c)?.name).filter(Boolean).join(", "),
                    start: new Date(t.start),
                    end: new Date(t.end),
                };
                room.items.push(item);
                if (!isBreak) room.sessions.push(item);
                rooms.set(t.room, room);
            }
            rooms.forEach((r) => [r.sessions, r.items].forEach((l) => l.sort((a, b) => +a.start - +b.start)));
            return rooms;
        });
    cache.catch(() => (cache = undefined)); // allow retry on the next refresh
    return cache;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const fmt = (tz: string) => ({
    time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }),
    day: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz }),
});

// Track colours as pretalx has them, except near-black ones (Keynote) which are inverted to show on the black page.
export function trackColors(track: Track): { bg: string; fg: string } {
    const [r, g, b] = [1, 3, 5]
        .map((i) => parseInt(track.color.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b; // WCAG relative luminance
    return {
        bg: lum < 0.01 ? "#fff" : track.color,
        fg: lum < 0.01 || lum > 0.179 ? "#000" : "#fff",
    };
}

// Track pill as on the 2025 watch page.
export function pill(track?: Track): string {
    if (!track) return "";
    const { bg, fg } = trackColors(track);
    // "Public Sector sponsored by Element" is too long for a pill (and the /watch cards); keep the full name as tooltip.
    const short = track.name.replace(/\s+sponsored by\s.*$/i, "");
    return `<span class="pill" title="${esc(track.name)}" style="background-color:${bg};color:${fg}">${esc(short)}</span>`;
}

// Speakers: overlapping avatars of everyone who has one (a talk can have several), then the names.
export function speakersHtml(x: Session): string {
    if (!x.speakers.length) return "";
    const faces = x.speakers.filter((p) => p.avatar);
    const shown = faces.slice(0, 4).map((p) => `<img class="avatar" src="${esc(p.avatar!)}" alt="" width="24" height="24" loading="lazy">`).join("");
    const more = faces.length > 4 ? `<span class="avatar more">+${faces.length - 4}</span>` : "";
    return `<span class="who">${faces.length ? `<span class="avatars">${shown}${more}</span>` : ""}<span class="names">${esc(x.who)}</span></span>`;
}
