import { useEffect, useRef } from "preact/hooks";
import type { RefObject } from "preact";

/** What is on now: the live talk, else the gap the schedule is in, else the next talk. */
const CURRENT = ".session.live, .now-line, .session:has(.badge.next)";

/**
 * Keeps a schedule on what is on now and, for a list that scrolls in its own box, fades its edges.
 *
 * The edges fade only while there is more to scroll to, so the CSS is told how far the list is scrolled
 * (`--scroll-top`, `--scroll-bottom`).
 *
 * @param list The schedule's container.
 * @param scroll "list" if the container scrolls in its own box, "page" if the page scrolls, or undefined to leave scrolling alone.
 * @param loaded Whether the schedule has rendered; the first time it has, what is on now is brought into view.
 */
export function useScroll(
    list: RefObject<HTMLElement>,
    scroll: "list" | "page" | undefined,
    loaded: boolean,
): void {
    const update = () => {
        const element = list.current;
        if (!element || scroll !== "list") return;
        element.style.setProperty("--scroll-top", `${element.scrollTop}px`);
        element.style.setProperty(
            "--scroll-bottom",
            `${element.scrollHeight - element.clientHeight - element.scrollTop}px`,
        );
    };
    useEffect(() => {
        const element = list.current;
        if (!element || scroll !== "list") return;
        element.addEventListener("scroll", update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => {
            element.removeEventListener("scroll", update);
            observer.disconnect();
        };
    }, [scroll]);
    useEffect(update); // the content, and with it how far there is to scroll, changed
    const started = useRef(false);
    useEffect(() => {
        const element = list.current;
        const marker = element?.querySelector<HTMLElement>(CURRENT);
        if (!loaded || started.current || !element || !scroll) return;
        started.current = true;
        if (!marker) return;
        if (scroll === "page") marker.scrollIntoView({ block: "center" });
        else if (element.scrollHeight > element.clientHeight)
            element.scrollTop =
                marker.getBoundingClientRect().top -
                element.getBoundingClientRect().top +
                element.scrollTop;
    }, [loaded]);
}
