import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Tracks vertical scroll *direction* inside a scroll container and reports
 * whether chrome should collapse — Instagram-style. Scrolling down (toward more
 * content) returns `true`; scrolling up returns `false`. We always report
 * expanded near the top so the nav is full-size when you land on a page.
 *
 * Direction-based (not position-based): the flip happens on a change of
 * direction, with a small threshold to swallow jitter and rubber-banding.
 */
export function useScrollDirection(
  ref: RefObject<HTMLElement | null>,
  { threshold = 8, topOffset = 16 }: { threshold?: number; topOffset?: number } = {}
): boolean {
  const [collapsed, setCollapsed] = useState(false);
  // Anchor for the accumulated delta; updated only once we cross the threshold
  // so slow scrolls still register instead of being nibbled away frame by frame.
  const anchorY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    anchorY.current = el.scrollTop;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = el.scrollTop;

      // Near the top: always expanded.
      if (y <= topOffset) {
        anchorY.current = y;
        setCollapsed(false);
        return;
      }

      const delta = y - anchorY.current;
      if (Math.abs(delta) < threshold) return;

      setCollapsed(delta > 0); // scrolling down -> collapse
      anchorY.current = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref, threshold, topOffset]);

  return collapsed;
}
