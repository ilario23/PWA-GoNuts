import { useEffect, useState } from "react";

export interface VisualViewportSheet {
  /** Gap between the layout-viewport bottom and the visual-viewport bottom
   *  (i.e. the on-screen keyboard height), in CSS pixels. */
  inset: number;
  /** Height the sheet should cap itself to so it stays within the visible area. */
  maxHeight: number;
}

function isEditableFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

/**
 * iOS positions `position: fixed` elements against the *layout* viewport, so a
 * bottom-anchored sheet does not follow the *visual* viewport when the on-screen
 * keyboard opens/closes — leaving a gap below it (or hiding content behind the
 * keyboard). This tracks the visual viewport so a sheet can be pinned to it via
 * inline `bottom` / `maxHeight`.
 *
 * The bottom inset is only applied while an editable element is actually
 * focused. iOS frequently leaves `visualViewport.height` a little short after
 * the keyboard is dismissed (and may not emit a final `resize`), which would
 * otherwise strand the sheet lifted above the bottom edge. Tying the lift to
 * focus guarantees it snaps back to 0 the instant the keyboard goes away.
 *
 * Returns `null` while inactive or when the API is unavailable, in which case
 * callers should fall back to their static CSS height.
 *
 * @param active       only measure while the sheet is open on mobile
 * @param heightRatio  fraction of the viewport to fill when no keyboard is showing
 */
export function useVisualViewportSheet(
  active: boolean,
  heightRatio = 0.92,
): VisualViewportSheet | null {
  const [viewport, setViewport] = useState<VisualViewportSheet | null>(null);

  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboardInset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      // A non-zero inset only counts as the keyboard if an editable element is
      // focused — otherwise it's iOS leaving the visual viewport short after a
      // dismissal, and the sheet must sit flush with the bottom.
      const keyboardOpen = keyboardInset > 4 && isEditableFocused();
      const inset = keyboardOpen ? keyboardInset : 0;
      const maxHeight = Math.round(
        keyboardOpen ? vv.height - 8 : window.innerHeight * heightRatio,
      );
      setViewport({ inset, maxHeight });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    // Recompute on focus changes: the keyboard can be dismissed without the
    // visual viewport emitting a (clean) resize. Defer a frame so
    // `document.activeElement` has settled.
    const onFocusChange = () => requestAnimationFrame(update);
    window.addEventListener("focusin", onFocusChange);
    window.addEventListener("focusout", onFocusChange);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("focusin", onFocusChange);
      window.removeEventListener("focusout", onFocusChange);
      setViewport(null);
    };
  }, [active, heightRatio]);

  return viewport;
}
