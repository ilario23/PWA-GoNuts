import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import packageJson from '../../package.json';

const STORAGE_KEY = 'app_version';

export function useVersionCheck() {
    const navigate = useNavigate();
    // Use a ref to ensure the check only runs once per mount
    const checkedRef = useRef(false);

    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;

        const currentVersion = packageJson.version;
        const storedVersion = localStorage.getItem(STORAGE_KEY);

        console.log('[VersionCheck] Current:', currentVersion, 'Stored:', storedVersion);

        if (storedVersion && storedVersion !== currentVersion) {
            console.log('[VersionCheck] Update detected, redirecting to changelog');
            // Update detected
            navigate('/changelog');
            localStorage.setItem(STORAGE_KEY, currentVersion);
        } else if (!storedVersion) {
            // First install or storage cleared
            console.log('[VersionCheck] First run or storage cleared, saving version');
            localStorage.setItem(STORAGE_KEY, currentVersion);
        } else {
            console.log('[VersionCheck] Version match, no action');
        }
    }, [navigate]);
}
