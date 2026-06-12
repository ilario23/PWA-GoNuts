import { useEffect, useRef, useState } from "react";

/**
 * Tracks vertical scroll *direction* and reports whether chrome should
 * collapse — Instagram-style. Scrolling down (toward more content) returns
 * `true`; scrolling up returns `false`. We always report expanded near the top
 * so the nav is full-size when you land on a page.
 *
 * Listens on the window: on mobile the whole document scrolls (the layout's
 * containers only set `min-height`, so nothing scrolls internally), so window
 * scroll is the real signal driving the bottom nav.
 *
 * Direction-based (not position-based): the flip happens on a change of
 * direction, with a small threshold to swallow jitter and rubber-banding.
 */
export function useScrollDirection(
  { threshold = 8, topOffset = 16 }: { threshold?: number; topOffset?: number } = {}
): boolean {
  const [collapsed, setCollapsed] = useState(false);
  // Anchor for the accumulated delta; updated only once we cross the threshold
  // so slow scrolls still register instead of being nibbled away frame by frame.
  const anchorY = useRef(0);

  useEffect(() => {
    const readY = () =>
      window.scrollY ?? document.scrollingElement?.scrollTop ?? 0;

    anchorY.current = readY();
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = readY();

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

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, topOffset]);

  return collapsed;
}
