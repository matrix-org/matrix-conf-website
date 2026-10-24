import { fmt, isKeynote, talksOf, trackColors } from "../../scripts/schedule";
import { Speakers } from "./Speakers";
import { useNow, useSchedule } from "./useSchedule";

const relative = new Intl.RelativeTimeFormat("en");

/** "in 25 minutes", "in 3 hours" or "in 2 days", whichever unit fits the time left until `start`. */
function startsIn(start: Date, now: number): string {
    const minutes = Math.max(1, Math.round((+start - now) / 60_000));
    if (minutes < 60) return relative.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (hours < 24) return relative.format(hours, "hour");
    return relative.format(Math.round(hours / 24), "day");
}

/**
 * "Now streaming" or "Up next" for one room.
 *
 * @param props.room Pretalx room id to show the current or next talk of.
 */
export default function NowStreaming({ room: id }: { room: number }) {
    const now = useNow();
    const room = useSchedule(now)?.get(id);
    if (!room) return null;
    const talks = talksOf(room);
    const live = talks.find((talk) => +talk.start <= now && now < +talk.end);
    const next = talks.find((talk) => +talk.start > now);
    const talk = live ?? next;
    const time = fmt(room.timezone).time;
    return (
        <div
            class="now"
            style={`--track:${talk?.track ? trackColors(talk.track).text : "#636569"}`}
            data-keynote={(talk && isKeynote(talk)) || undefined}
        >
            {talk ? (
                <>
                    <div class={`label${live ? " live" : ""}`}>
                        {live ? "Now streaming" : "Up next"}
                    </div>
                    <div class="title">
                        <a
                            href={talk.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {talk.title}
                        </a>
                    </div>
                    <div class="when">
                        {time.format(talk.start)}–{time.format(talk.end)}
                    </div>
                    <Speakers session={talk} />
                    {talk.track && <span class="track">{talk.track.name}</span>}
                    {live && next && (
                        <div class="then">
                            <span class="label">{startsIn(next.start, now)}</span>{" "}
                            <a
                                href={next.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {next.title}
                            </a>{" "}
                            <span class="who">· {time.format(next.start)}</span>
                        </div>
                    )}
                </>
            ) : (
                <div class="label">Nothing scheduled</div>
            )}
        </div>
    );
}
