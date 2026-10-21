import { createPortal } from "preact/compat";
import { Fragment } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { pretalxSchedulePage } from "../../data/pretalx";
import { fmt, type Track } from "../../scripts/schedule";
import { scheduleDays } from "../../scripts/schedule-days";
import { Calendar } from "./Calendar";
import { DateHeading } from "./DateHeading";
import { FilterDialog, isActive, noFilters, type Filters } from "./Filters";
import { useNow, useSchedule } from "./useSchedule";
import { useRoomHints } from "./useRoomHints";

/**
 * The schedule of every room as a calendar per day, with the controls to narrow it down.
 *
 * @param props.links Sessions without a pretalx page (breaks, hackathon, parties): title keyword -> link.
 */
export default function ConferenceSchedule({
    links,
}: {
    links: Record<string, string>;
}) {
    const now = useNow();
    const all = useSchedule(now);
    useRoomHints();
    const dialog = useRef<HTMLDialogElement>(null);
    const [applied, setApplied] = useState(noFilters);
    const [draft, setDraft] = useState(noFilters);
    const [announced, setAnnounced] = useState(false); // the result count is only read out after the visitor changed filters

    const allRooms = useMemo(
        () => [...(all?.values() ?? [])].sort((a, b) => a.order - b.order),
        [all],
    );
    const tracks = useMemo(() => {
        const byName = new Map<string, Track>();
        for (const room of allRooms)
            for (const session of room.items)
                if (session.track) byName.set(session.track.name, session.track);
        return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [allRooms]);
    const rooms = useMemo(
        () =>
            allRooms
                .filter(
                    (room) =>
                        !applied.rooms.size || applied.rooms.has(room.name),
                )
                .map((room) => ({
                    ...room,
                    items: room.items.filter((session) => {
                        if (
                            applied.tracks.size &&
                            (!session.track ||
                                !applied.tracks.has(session.track.name))
                        )
                            return false;
                        if (
                            applied.notRecorded &&
                            (session.isBreak || session.recorded)
                        )
                            return false;
                        const haystack = `${session.title} ${session.speakers.map((speaker) => speaker.name).join(" ")}`;
                        return haystack
                            .toLocaleLowerCase()
                            .includes(applied.query);
                    }),
                }))
                .filter((room) => room.items.length),
        [allRooms, applied],
    );
    const days = rooms.length ? scheduleDays(rooms) : [];

    useEffect(() => {
        // Direct date links load before the fetched headings exist.
        if (all && /^#\d{4}-\d{2}-\d{2}$/.test(location.hash))
            document.getElementById(location.hash.slice(1))?.scrollIntoView();
    }, [all]);

    if (!all)
        return (
            <p>
                <a href={pretalxSchedulePage}>
                    Open the full schedule on the CfP site
                </a>
            </p>
        );

    const apply = (filters: Filters) => {
        const next = {
            ...filters,
            query: filters.query.trim().toLocaleLowerCase(),
        };
        setApplied(next);
        setDraft(next);
        setAnnounced(true);
    };
    const count = rooms.reduce((total, room) => total + room.items.length, 0);

    const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const first = allRooms[0]?.items[0]?.start;
    const localZone = document.getElementById("schedule-local-zone");

    return (
        <>
            {localZone &&
                first &&
                createPortal(
                    fmt(viewerZone).time.format(first) ===
                        fmt(allRooms[0].timezone).time.format(first)
                        ? ` Your time zone (${viewerZone}) shows the same times.`
                        : ` Your time zone (${viewerZone}) is shown below each session.`,
                    localZone,
                )}
            <div class="schedule-controls">
                <nav
                    id="schedule-dates"
                    class="schedule-dates"
                    aria-label="Jump to date"
                >
                    {days.map((day) => (
                        <a key={day.id} href={`#${day.id}`}>
                            {day.labelShort}
                        </a>
                    ))}
                </nav>
                <button
                    class={`filter-button${isActive(applied) ? " active" : ""}`}
                    type="button"
                    aria-haspopup="dialog"
                    aria-controls="schedule-filter"
                    onClick={() => {
                        setDraft(applied);
                        dialog.current?.showModal();
                    }}
                >
                    {isActive(applied)
                        ? "Filter schedule (active)"
                        : "Filter schedule"}
                </button>
            </div>
            <FilterDialog
                dialog={dialog}
                rooms={allRooms.map((room) => room.name)}
                tracks={tracks}
                draft={draft}
                onDraft={setDraft}
                onApply={() => apply(draft)}
                onClear={() => apply(noFilters())}
            />
            <p class="sr-only" role="status" id="schedule-filter-status">
                {announced &&
                    `Showing ${count} sessions on ${days.length} ${days.length === 1 ? "date" : "dates"}.`}
            </p>
            <div
                class="schedule-list"
                role="region"
                aria-label="Conference schedule"
            >
                {days.length ? (
                    days.map((day) => (
                        <Fragment key={day.id}>
                            <DateHeading id={day.id} label={day.label} />
                            <Calendar
                                rooms={rooms}
                                day={day}
                                now={now}
                                links={links}
                            />
                        </Fragment>
                    ))
                ) : (
                    <p class="schedule-empty">
                        No sessions match these filters.
                    </p>
                )}
            </div>
            <a class="schedule-back" href="#full-schedule-start">
                ↑ Back to top
            </a>
        </>
    );
}
