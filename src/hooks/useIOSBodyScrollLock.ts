import { useEffect } from "react";

/**
 * Locks the document scroll while `active` (iOS standalone PWA modal pattern).
 *
 * On mobile the window/document is the scroll container. Radix's
 * react-remove-scroll sets body `overflow: hidden`, but that does NOT stop iOS
 * from scrolling the *layout viewport* to reveal a focused input inside a
 * `position: fixed` sheet. In a standalone PWA that drifts the fixed bottom nav
 * upward and, worse, iOS does not restore `window.scrollY` after the keyboard
 * closes — stranding the page scrolled-up on the next view.
 *
 * Pinning the body with `position: fixed; top: -scrollY` makes the document
 * genuinely unscrollable, so iOS only moves the *visual* viewport (which the
 * sheet already follows via {@link useVisualViewportSheet}). The exact scroll
 * offset is restored on release.
 */
export function useIOSBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
