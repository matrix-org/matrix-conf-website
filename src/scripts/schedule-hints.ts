/** Room hints ("Where is this room?"): one open at a time; click outside or Escape closes (focus goes back to the button). */
export function initRoomHints(): void {
    const open = () => document.querySelectorAll<HTMLDetailsElement>(".room-info[open]");
    document.addEventListener("toggle", (e) => {
        if (e.target instanceof HTMLDetailsElement && e.target.classList.contains("room-info") && e.target.open) open().forEach((d) => d !== e.target && (d.open = false));
    }, true);
    document.addEventListener("click", (e) => { if (!(e.target as Element).closest(".room-info")) open().forEach((d) => (d.open = false)); });
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        open().forEach((d) => { d.open = false; d.querySelector("summary")?.focus(); });
    });
}
