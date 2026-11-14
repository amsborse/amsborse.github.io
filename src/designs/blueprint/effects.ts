/** Decorative drafting cursor. No content or navigation depends on pointer position. */
export function mount(): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const overlay = document.createElement("div");
  overlay.className = "bp-crosshair";
  overlay.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  const horizontal = document.createElement("span");
  horizontal.className = "bp-crosshair__x";
  const vertical = document.createElement("span");
  vertical.className = "bp-crosshair__y";
  const label = document.createElement("span");
  label.className = "bp-crosshair__label";
  overlay.append(horizontal, vertical, label);
  document.body.append(overlay);
  let frame = 0;
  let x = 0;
  let y = 0;
  let disposed = false;
  const hide = () => {
    overlay.hidden = true;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };
  const enabled = () => !disposed && !reduced.matches && fine.matches && !document.hidden;
  const editable = (target: EventTarget | null) =>
    target instanceof Element &&
    target.closest(
      "input,textarea,select,[contenteditable]:not([contenteditable='false']),[role='textbox']"
    );
  const move = (event: PointerEvent) => {
    if (!enabled() || event.pointerType !== "mouse" || editable(event.target)) {
      hide();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (!enabled()) return;
      overlay.style.setProperty("--bp-x", `${Math.round(x)}px`);
      overlay.style.setProperty("--bp-y", `${Math.round(y)}px`);
      label.textContent = `X ${String(Math.round(x)).padStart(4, "0")} / Y ${String(Math.round(y)).padStart(4, "0")}`;
      overlay.hidden = false;
    });
  };
  const focus = (event: FocusEvent) => {
    if (editable(event.target)) hide();
  };
  document.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", hide);
  document.addEventListener("visibilitychange", hide);
  document.addEventListener("focusin", focus);
  window.addEventListener("blur", hide);
  reduced.addEventListener("change", hide);
  fine.addEventListener("change", hide);
  return () => {
    disposed = true;
    hide();
    document.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", hide);
    document.removeEventListener("visibilitychange", hide);
    document.removeEventListener("focusin", focus);
    window.removeEventListener("blur", hide);
    reduced.removeEventListener("change", hide);
    fine.removeEventListener("change", hide);
    overlay.remove();
  };
}
