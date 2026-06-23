import { useEffect, useState } from "react";

/**
 * TEMPORARY on-device diagnostic for the iOS PWA keyboard / bottom-nav issue.
 * Shows live viewport metrics so we can see exactly what iOS reports in each
 * state (rest / keyboard open / just-closed). Remove once the nav fix lands.
 */
export function ViewportDebug() {
  const [m, setM] = useState<Record<string, number | string>>({});

  useEffect(() => {
    const vv = window.visualViewport;

    const read = () => {
      const el = document.activeElement as HTMLElement | null;
      setM({
        innerH: window.innerHeight,
        vvH: vv ? Math.round(vv.height) : "n/a",
        vvTop: vv ? Math.round(vv.offsetTop) : "n/a",
        vvScale: vv ? +vv.scale.toFixed(2) : "n/a",
        offset: vv ? Math.round(window.innerHeight - vv.height - vv.offsetTop) : 0,
        scrollY: Math.round(window.scrollY),
        docScroll: Math.round(document.scrollingElement?.scrollTop ?? 0),
        screenH: window.screen.height,
        focus: el ? el.tagName.toLowerCase() : "none",
      });
    };

    read();
    const id = window.setInterval(read, 200);
    vv?.addEventListener("resize", read);
    vv?.addEventListener("scroll", read);
    window.addEventListener("focusin", read);
    window.addEventListener("focusout", read);

    return () => {
      window.clearInterval(id);
      vv?.removeEventListener("resize", read);
      vv?.removeEventListener("scroll", read);
      window.removeEventListener("focusin", read);
      window.removeEventListener("focusout", read);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "max(0.25rem, env(safe-area-inset-top))",
        left: "0.25rem",
        zIndex: 99999,
        background: "rgba(0,0,0,0.82)",
        color: "#0f0",
        font: "600 11px/1.35 ui-monospace, monospace",
        padding: "6px 8px",
        borderRadius: 8,
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      {Object.entries(m)
        .map(([k, v]) => `${k.padEnd(9)}${v}`)
        .join("\n")}
    </div>
  );
}
