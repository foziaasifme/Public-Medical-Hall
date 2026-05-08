/**
 * Automatically detects new deployment versions and clears outdated caches 
 * to ensure users always receive the latest app updates.
 */
export const checkVersionAndClearCache = async () => {
    try {
        // Appends a cache-busting timestamp to ensure we fetch the live version.json
        const response = await fetch(`/version.json?t=${new Date().getTime()}`);
        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.version;
        const currentVersion = localStorage.getItem('app_version');

        if (currentVersion !== latestVersion) {
            console.log(`Update detected: v${latestVersion} (was v${currentVersion}). Clearing cache...`);

            // 1. Clear Cache Storage (used by Service Workers)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map((cacheName) => {
                        console.log(`Deleting cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    })
                );
            }

            // 2. Unregister out-of-date Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 3. Update version in local storage to prevent infinite loops
            localStorage.setItem('app_version', latestVersion);

            // 4. Force a hard reload from the server
            window.location.reload();
        }
    } catch (error) {
        console.error('Failed to check app version:', error);
    }
};

/**
 * Registers the Service Worker for offline capabilities and caching
 */
export const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/service-worker.js')
                .then((registration) => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch((err) => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
};
