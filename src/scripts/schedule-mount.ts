import { pretalxSchedulePage } from "../data/pretalx";
import { loadSchedule, type Room } from "./schedule";

type Pick = (all: Map<number, Room>, el: HTMLElement) => Room[];
type Build = (rooms: Room[], links: Record<string, string>, now: number) => string;

/** Fill every `.schedule-list` element with the schedule and keep it up to date. */
export function mountSchedule(pick: Pick, build: Build): void {
    async function render(el: HTMLElement) {
        const links: Record<string, string> = JSON.parse(el.dataset.links ?? "{}");
        const all = await loadSchedule().catch(() => undefined);
        const rooms = pick(all ?? new Map(), el);
        if (!rooms.length) {
            el.innerHTML = `<p><a href="${pretalxSchedulePage}" target="_blank" rel="noopener noreferrer">Open the full schedule on the CfP site</a></p>`;
            return;
        }
        const html = build(rooms, links, Date.now());
        if (html !== el.dataset.html && !el.contains(document.activeElement)) { // never rebuild under a focused link
            el.innerHTML = html;
            el.dataset.html = html;
        }
    }
    const renderAll = () => document.querySelectorAll<HTMLElement>(".schedule-list").forEach(render);
    renderAll();
    setInterval(renderAll, 60_000);
}
