import { useEffect } from 'react';

/**
 * Hook to fix iOS viewport height issues in PWA/Safari.
 * 
 * iOS Safari has a known bug where viewport units (vh, svh, dvh) are not
 * calculated correctly on initial page load, especially in PWA standalone mode.
 * This causes a gap at the bottom of the screen until the user navigates.
 * 
 * This hook sets a CSS custom property `--vh` that represents 1% of the actual
 * viewport height, which can be used in CSS as: height: calc(var(--vh, 1vh) * 100);
 * 
 * This is the industry-standard best practice used by many frameworks.
 * 
 * @see https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
 */
export function useViewportHeight() {
    useEffect(() => {
        // Function to update the --vh CSS custom property
        const updateViewportHeight = () => {
            // Get the actual viewport height
            const vh = window.innerHeight * 0.01;
            // Set the value in the root element's style
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        // Set the initial value
        updateViewportHeight();

        // Update on resize (handles orientation changes, keyboard open/close, etc.)
        window.addEventListener('resize', updateViewportHeight);

        // Also update on orientation change for older iOS versions
        window.addEventListener('orientationchange', () => {
            // Delay slightly to ensure the viewport has settled after orientation change
            setTimeout(updateViewportHeight, 100);
        });

        // iOS Safari sometimes needs a delayed recalculation on initial load
        // This handles the case where the viewport isn't ready immediately
        const initialTimeout = setTimeout(updateViewportHeight, 100);
        const secondaryTimeout = setTimeout(updateViewportHeight, 500);

        // Cleanup
        return () => {
            window.removeEventListener('resize', updateViewportHeight);
            window.removeEventListener('orientationchange', updateViewportHeight);
            clearTimeout(initialTimeout);
            clearTimeout(secondaryTimeout);
        };
    }, []);
}
