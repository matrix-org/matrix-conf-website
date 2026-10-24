import type { Ref } from "preact";
import { trackColors, type Track } from "../../scripts/schedule";

/** What the visitor narrowed the schedule down to. Empty sets and an empty query mean no narrowing. */
export type Filters = {
    /** Names of the rooms to show. */
    rooms: Set<string>;
    /** Names of the tracks to show. */
    tracks: Set<string>;
    /** Show only talks that are not recorded. */
    notRecorded: boolean;
    /** Text a session's title or speakers must contain, lowercased. */
    query: string;
};

/** @returns Filters that show everything. */
export const noFilters = (): Filters => ({
    rooms: new Set(),
    tracks: new Set(),
    notRecorded: false,
    query: "",
});

/**
 * Whether `filters` narrow the schedule down at all.
 *
 * @param filters Filters to check.
 * @returns True if any filter is set.
 */
export const isActive = (filters: Filters) =>
    Boolean(
        filters.rooms.size ||
            filters.tracks.size ||
            filters.notRecorded ||
            filters.query,
    );

/** `set` with `value` added, or removed if it was in. */
function toggled(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    return next;
}

/**
 * The dialog to choose the filters in.
 *
 * @param props.dialog Ref to the `<dialog>`, so the button that opens it can reach it.
 * @param props.rooms Names of the rooms to offer.
 * @param props.tracks Tracks to offer.
 * @param props.draft What is checked in the form right now; only {@link props.onApply} makes it count.
 * @param props.onDraft Called with the form's new state on every change.
 * @param props.onApply Called when the form is submitted.
 * @param props.onClear Called when the filters are cleared.
 */
export function FilterDialog({
    dialog,
    rooms,
    tracks,
    draft,
    onDraft,
    onApply,
    onClear,
}: {
    dialog: Ref<HTMLDialogElement>;
    rooms: string[];
    tracks: Track[];
    draft: Filters;
    onDraft: (filters: Filters) => void;
    onApply: () => void;
    onClear: () => void;
}) {
    const close = () => (dialog as { current: HTMLDialogElement }).current.close();
    return (
        <dialog
            ref={dialog}
            id="schedule-filter"
            class="schedule-filter"
            aria-labelledby="schedule-filter-title"
        >
            <form method="dialog" onSubmit={onApply}>
                <div class="filter-heading">
                    <h2 id="schedule-filter-title">Filters</h2>
                    <button
                        type="button"
                        class="cancel-filters"
                        aria-label="Close filters"
                        onClick={close}
                    >
                        ×
                    </button>
                </div>
                <fieldset class="filter-tracks">
                    <legend>Tracks</legend>
                    <p>Leave all unchecked to show every track and break.</p>
                    <div class="filter-options">
                        {tracks.map((track) => (
                            <label
                                key={track.name}
                                class="track-option"
                                style={`--track:${trackColors(track).text}`}
                            >
                                <input
                                    type="checkbox"
                                    name="track"
                                    value={track.name}
                                    checked={draft.tracks.has(track.name)}
                                    onChange={() =>
                                        onDraft({
                                            ...draft,
                                            tracks: toggled(
                                                draft.tracks,
                                                track.name,
                                            ),
                                        })
                                    }
                                />
                                <span>{track.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset class="filter-rooms">
                    <legend>Rooms</legend>
                    <p>Leave all unchecked to show every room.</p>
                    <div class="filter-options">
                        {rooms.map((name) => (
                            <label key={name}>
                                <input
                                    type="checkbox"
                                    name="room"
                                    value={name}
                                    checked={draft.rooms.has(name)}
                                    onChange={() =>
                                        onDraft({
                                            ...draft,
                                            rooms: toggled(draft.rooms, name),
                                        })
                                    }
                                />
                                <span>{name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset class="filter-recording">
                    <legend>Recording</legend>
                    <div class="filter-options">
                        <label>
                            <input
                                type="checkbox"
                                name="notRecorded"
                                checked={draft.notRecorded}
                                onChange={() =>
                                    onDraft({
                                        ...draft,
                                        notRecorded: !draft.notRecorded,
                                    })
                                }
                            />
                            <span>Not recorded</span>
                        </label>
                    </div>
                </fieldset>
                <div class="filter-search">
                    <label for="schedule-search">
                        Search sessions and speakers
                    </label>
                    <input
                        id="schedule-search"
                        name="search"
                        type="search"
                        value={draft.query}
                        onInput={(event) =>
                            onDraft({
                                ...draft,
                                query: event.currentTarget.value,
                            })
                        }
                    />
                </div>
                <div class="filter-actions">
                    <button
                        type="button"
                        class="clear-filters"
                        onClick={() => {
                            close();
                            onClear();
                        }}
                    >
                        Clear filters
                    </button>
                    <button type="submit">Show results</button>
                </div>
            </form>
        </dialog>
    );
}
