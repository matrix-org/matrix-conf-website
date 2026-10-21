import { Fragment } from "preact";
import { pretalxSchedulePage } from "../../data/pretalx";
import { scheduleDays } from "../../scripts/schedule-days";
import { DateHeading } from "./DateHeading";
import { SessionList } from "./SessionList";
import { useNow, useSchedule } from "./useSchedule";

/**
 * The whole schedule of one room, day after day.
 *
 * @param props.room Room to show, as its pretalx room id or its room name (matched case-insensitively).
 */
export default function RoomSchedule({ room: wanted }: { room: number | string }) {
    const now = useNow();
    const all = useSchedule(now);
    const room =
        all?.get(Number(wanted)) ??
        [...(all?.values() ?? [])].find(
            (candidate) =>
                candidate.name.toLowerCase() === String(wanted).toLowerCase(),
        );
    if (!room)
        return (
            <p>
                <a
                    href={pretalxSchedulePage}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Open the full schedule on the CfP site
                </a>
            </p>
        );
    return (
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
    );
}
