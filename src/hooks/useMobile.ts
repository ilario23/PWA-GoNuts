import { useState, useEffect } from 'react';

export function useMobile() {
    // Initialize with a safe default - check window only if available
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768;
        }
        return false;
    });

    useEffect(() => {
        // Double-check window exists (for SSR safety)
        if (typeof window === 'undefined') return;
        
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}
