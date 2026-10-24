import { Fragment } from "preact";
import { useRef } from "preact/hooks";
import { pretalxSchedulePage } from "../../data/pretalx";
import { scheduleDays } from "../../scripts/schedule-days";
import { DateHeading } from "./DateHeading";
import { SessionList } from "./SessionList";
import { useScroll } from "./useScroll";
import { useNow, useSchedule } from "./useSchedule";

/**
 * The whole schedule of one room, day after day.
 *
 * @param props.room Room to show, as its pretalx room id or its room name (matched case-insensitively).
 * @param props.scroll "list" if the schedule scrolls in its own box, "page" if the page scrolls; either way what is on
 *   now is brought into view once. Omit to leave scrolling alone.
 */
export default function RoomSchedule({
    room: wanted,
    scroll,
}: {
    room: number | string;
    scroll?: "list" | "page";
}) {
    const now = useNow();
    const all = useSchedule(now);
    const room =
        all?.get(Number(wanted)) ??
        [...(all?.values() ?? [])].find(
            (candidate) =>
                candidate.name.toLowerCase() === String(wanted).toLowerCase(),
        );
    const list = useRef<HTMLDivElement>(null);
    useScroll(list, scroll, Boolean(room));
    return (
        <div
            class="schedule-list"
            role="region"
            aria-label="Room schedule"
            ref={list}
        >
            {room ? (
                <>
                    {scheduleDays([room]).map((day) => (
                        <Fragment key={day.id}>
                            <DateHeading id={day.id} label={day.label} />
                            <SessionList
                                room={room}
                                items={day.sessionsOfRoom(room)}
                                now={now}
                                links={{}}
                            />
                        </Fragment>
                    ))}
                </>
            ) : (
                <p>
                    <a
                        href={pretalxSchedulePage}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open the full schedule on the CfP site
                    </a>
                </p>
            )}
        </div>
    );
}
