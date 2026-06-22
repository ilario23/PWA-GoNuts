import { useEffect, useState } from "react";

/**
 * Returns the *signed* gap (CSS px) between the layout-viewport bottom and the
 * visual-viewport bottom, for positioning fixed bottom chrome (e.g. the nav).
 *
 *   offset = window.innerHeight - visualViewport.height - visualViewport.offsetTop
 *
 * Why signed, and why this fixes the iOS standalone PWA nav drift:
 *
 * A `position: fixed; bottom: 0` element anchors to the *layout* viewport
 * bottom. On iOS standalone the keyboard resizes the layout viewport, and after
 * it closes iOS frequently leaves `window.innerHeight` stale-small while
 * `visualViewport.height` already reports the true full height — so the nav gets
 * pinned high, with content showing beneath it.
 *
 * Feeding this offset into the nav's inline `bottom`
 * (`calc(margin + ${offset}px)`) compensates in every state:
 *   • normal           → offset 0    → nav sits at the bottom
 *   • keyboard visible → offset > 0  → nav rides just above the keyboard
 *   • stale post-close → offset < 0  → nav is pushed back down to the true
 *                                      visible bottom (clamping to 0, as a naive
 *                                      version would, is exactly what strands it)
 *
 * Listeners cover the dirty cases: iOS may not emit a clean `resize` when the
 * keyboard is dismissed, so we also recompute on focus changes and a couple of
 * deferred ticks (innerHeight can lag a frame behind the visual viewport).
 */
export function useVisualViewportBottomOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () =>
      setOffset(Math.round(window.innerHeight - vv.height - vv.offsetTop));

    // Recompute now, next frame, and shortly after — iOS leaves innerHeight
    // stale for a beat after the keyboard closes.
    const updateSoon = () => {
      update();
      requestAnimationFrame(update);
      setTimeout(update, 100);
      setTimeout(update, 300);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("focusin", updateSoon);
    window.addEventListener("focusout", updateSoon);
    window.addEventListener("orientationchange", updateSoon);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("focusin", updateSoon);
      window.removeEventListener("focusout", updateSoon);
      window.removeEventListener("orientationchange", updateSoon);
    };
  }, []);

  return offset;
}
