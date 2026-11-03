import { useEffect } from "preact/hooks";

/** Room hints ("Where is this room?"): one open at a time; click outside or Escape closes (focus goes back to the button). */
export function useRoomHints(): void {
    useEffect(() => {
        const open = () =>
            document.querySelectorAll<HTMLDetailsElement>(".room-info[open]");
        const onToggle = (event: Event) => {
            if (
                event.target instanceof HTMLDetailsElement &&
                event.target.classList.contains("room-info") &&
                event.target.open
            )
                open().forEach(
                    (details) =>
                        details !== event.target && (details.open = false),
                );
        };
        const onClick = (event: MouseEvent) => {
            if (!(event.target as Element).closest(".room-info"))
                open().forEach((details) => (details.open = false));
        };
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            open().forEach((details) => {
                details.open = false;
                details.querySelector("summary")?.focus();
            });
        };
        document.addEventListener("toggle", onToggle, true);
        document.addEventListener("click", onClick);
        document.addEventListener("keydown", onKeydown);
        return () => {
            document.removeEventListener("toggle", onToggle, true);
            document.removeEventListener("click", onClick);
            document.removeEventListener("keydown", onKeydown);
        };
    }, []);
}
