import { fmt, type Room, type Session } from "./schedule";

export type Day = {
    /** ISO date (in the event's time zone), also the anchor id of the heading. */
    id: string;
    /** The date heading, ready to be put in front of the day's sessions. */
    heading: string;
    /** The sessions of `room` that are on this day. */
    of: (room: Room) => Session[];
};

/** The days that have sessions in any of `rooms`, in order. */
export function scheduleDays(rooms: Room[]): Day[] {
    const tz = rooms[0].tz;
    const label = fmt(tz).day;
    const iso = new Intl.DateTimeFormat("sv-SE", { timeZone: tz }); // sv-SE formats as YYYY-MM-DD
    const ids = [...new Set(rooms.flatMap((r) => r.items.map((x) => iso.format(x.start))))].sort();
    return ids.map((id) => {
        const of = (room: Room) => room.items.filter((x) => iso.format(x.start) === id);
        const first = rooms.flatMap(of)[0];
        const heading = `<div class="date-separator" id="${id}"><h3 class="date">${label.format(first.start)}</h3><div class="line" aria-hidden="true"></div></div>`;
        return { id, heading, of };
    });
}
