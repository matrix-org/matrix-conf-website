import { useEffect, useState } from "preact/hooks";
import { loadSchedule, type Room } from "../../scripts/schedule";

/** How often the schedule re-renders, so live/next markers and break squeezing stay current. */
const REFRESH = 60_000;

/**
 * The current time, updated every minute.
 *
 * @returns The current time, as milliseconds since the epoch.
 */
export function useNow(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), REFRESH);
        return () => clearInterval(timer);
    }, []);
    return now;
}

/**
 * The loaded schedule, or undefined until it has loaded. A failed load is tried again on the next refresh.
 *
 * @param now Current time from {@link useNow}; a change of it retries a failed load.
 * @returns Every room keyed by pretalx room id, or undefined while loading or after a failed load.
 */
export function useSchedule(now: number): Map<number, Room> | undefined {
    const [rooms, setRooms] = useState<Map<number, Room>>();
    useEffect(() => {
        if (!rooms) loadSchedule().then(setRooms, () => undefined);
    }, [now]);
    return rooms;
}
