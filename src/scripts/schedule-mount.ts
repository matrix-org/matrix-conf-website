import { pretalxSchedulePage } from "../data/pretalx";
import { loadSchedule, type Room } from "./schedule";

/**
 * Selects which rooms a `.schedule-list` element should show.
 *
 * @param all Every room known to the loaded schedule, keyed by pretalx room id.
 * @param element The `.schedule-list` element being rendered, e.g. to read its `data-*` attributes.
 * @returns The rooms to render, or an empty array if none apply.
 */
type Pick = (all: Map<number, Room>, element: HTMLElement) => Room[];

/**
 * Renders the picked rooms as HTML.
 *
 * @param rooms Rooms picked by {@link Pick}.
 * @param links Map from a title keyword to a URL, read from the element's `data-links` attribute.
 * @param now Time to render as "now", as milliseconds since the epoch.
 * @returns HTML to put inside the `.schedule-list` element.
 */
type Build = (
    rooms: Room[],
    links: Record<string, string>,
    now: number,
) => string;

/**
 * Fills every `.schedule-list` element on the page with the schedule and keeps it up to date.
 *
 * Loads the schedule once, then re-renders every element every minute so live/next markers and break
 * squeezing stay current. A render is skipped while a link inside the element has keyboard focus, so a
 * refresh never steals focus from the visitor.
 *
 * @param pick Selects which rooms an element should show.
 * @param build Renders the picked rooms as HTML.
 */
export function mountSchedule(pick: Pick, build: Build): void {
    async function render(element: HTMLElement) {
        const links: Record<string, string> = JSON.parse(
            element.dataset.links ?? "{}",
        );
        const all = await loadSchedule().catch(() => undefined);
        const rooms = pick(all ?? new Map(), element);
        if (!rooms.length) {
            element.innerHTML = `<p><a href="${pretalxSchedulePage}" target="_blank" rel="noopener noreferrer">Open the full schedule on the CfP site</a></p>`;
            return;
        }
        const html = build(rooms, links, Date.now());
        if (
            html !== element.dataset.html &&
            !element.contains(document.activeElement)
        ) {
            // never rebuild under a focused link
            element.innerHTML = html;
            element.dataset.html = html;
        }
    }
    const renderAll = () =>
        document
            .querySelectorAll<HTMLElement>(".schedule-list")
            .forEach(render);
    renderAll();
    setInterval(renderAll, 60_000);
}
