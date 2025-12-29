import { useEffect } from "react";

export function IOSViewportFix() {
    useEffect(() => {
        function setAppHeight() {
            const doc = document.documentElement;
            doc.style.setProperty("--app-height", `${window.innerHeight}px`);
        }

        window.addEventListener("resize", setAppHeight);
        window.addEventListener("orientationchange", setAppHeight);

        // Initial set
        setAppHeight();

        return () => {
            window.removeEventListener("resize", setAppHeight);
            window.removeEventListener("orientationchange", setAppHeight);
        };
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: '5px',
                backgroundColor: 'red',
                zIndex: 9999,
                pointerEvents: 'none'
            }}
        />
    );
}
