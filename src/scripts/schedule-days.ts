import { fmt, type Room, type Session } from "./schedule";

/** One day of the schedule, with its heading and a way to get a room's sessions on that day. */
export type Day = {
    /** ISO date (in the event's time zone), also the anchor id of the heading. */
    id: string;
    /** The date heading, ready to be put in front of the day's sessions. */
    heading: string;
    /**
     * The sessions of `room` that are on this day.
     *
     * @param room Room to get the sessions of.
     * @returns The room's sessions on this day, sorted by start time.
     */
    sessionsOfRoom: (room: Room) => Session[];
};

/**
 * The days that have sessions in any of `rooms`, in order.
 *
 * `sessionsOfRoom` filters `room.items` by day on every call rather than pre-building a per-room index: each room
 * only has a few dozen sessions, and every caller asks for at most one or two rooms per day, so an index would add
 * complexity without a measurable gain.
 *
 * @param rooms Rooms to collect the days of.
 * @returns One `Day` per date that has sessions in any of `rooms`, sorted by date.
 */
export function scheduleDays(rooms: Room[]): Day[] {
    const timeZone = rooms[0].timezone;
    const label = fmt(timeZone).day;
    const isoDate = new Intl.DateTimeFormat("sv-SE", { timeZone }); // sv-SE formats as YYYY-MM-DD
    const ids = [
        ...new Set(
            rooms.flatMap((room) =>
                room.items.map((session) => isoDate.format(session.start)),
            ),
        ),
    ].sort();
    return ids.map((id) => {
        const sessionsOfRoom = (room: Room) =>
            room.items.filter(
                (session) => isoDate.format(session.start) === id,
            );
        const firstSessionOfDay = rooms.flatMap(sessionsOfRoom)[0];
        const heading = `<div class="date-separator" id="${id}"><h3 class="date">${label.format(firstSessionOfDay.start)}</h3><div class="line" aria-hidden="true"></div></div>`;
        return { id, heading, sessionsOfRoom };
    });
}
