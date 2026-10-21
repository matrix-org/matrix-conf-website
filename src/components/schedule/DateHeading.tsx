/**
 * The heading in front of the sessions of one day.
 *
 * @param props.id ISO date of the day, also the anchor id of the heading.
 * @param props.label Date label shown in the heading, e.g. "Wednesday, 21 October".
 */
export function DateHeading({ id, label }: { id: string; label: string }) {
    return (
        <div class="date-separator" id={id}>
            <h3 class="date">{label}</h3>
            <div class="line" aria-hidden="true" />
        </div>
    );
}
