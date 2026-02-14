/**
 * useTheme — returns the current active theme ('cyberpunk' | 'matrix').
 *
 * Reads from localStorage first (set by SettingsPage / App.tsx).
 * Re-checks on every render so it stays in sync when the user toggles themes.
 */

import { useSyncExternalStore } from 'react';

type Theme = 'cyberpunk' | 'matrix';

function getTheme(): Theme {
    if (typeof document === 'undefined') return 'cyberpunk';
    return document.body.classList.contains('theme-matrix') ? 'matrix' : 'cyberpunk';
}

function subscribe(cb: () => void) {
    // Watch for class changes on <body>
    const observer = new MutationObserver(cb);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
}

export function useTheme(): Theme {
    return useSyncExternalStore(subscribe, getTheme, () => 'cyberpunk' as Theme);
}
