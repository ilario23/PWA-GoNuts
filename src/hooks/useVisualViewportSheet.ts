import { useEffect, useState } from "react";

export interface VisualViewportSheet {
  /** Gap between the layout-viewport bottom and the visual-viewport bottom
   *  (i.e. the on-screen keyboard height), in CSS pixels. */
  inset: number;
  /** Height the sheet should cap itself to so it stays within the visible area. */
  maxHeight: number;
}

/**
 * iOS positions `position: fixed` elements against the *layout* viewport, so a
 * bottom-anchored sheet does not follow the *visual* viewport when the on-screen
 * keyboard opens/closes — leaving a gap below it (or hiding content behind the
 * keyboard). This tracks the visual viewport so a sheet can be pinned to it via
 * inline `bottom` / `maxHeight`.
 *
 * Returns `null` while inactive or when the API is unavailable, in which case
 * callers should fall back to their static CSS height.
 *
 * @param active       only measure while the sheet is open on mobile
 * @param heightRatio  fraction of the visible viewport to fill when no keyboard
 *                     is showing
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
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      const keyboardOpen = inset > 4;
      const maxHeight = Math.round(
        keyboardOpen ? vv.height - 8 : vv.height * heightRatio,
      );
      setViewport({ inset, maxHeight });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setViewport(null);
    };
  }, [active, heightRatio]);

  return viewport;
}
