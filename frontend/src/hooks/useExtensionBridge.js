/**
 * useExtensionBridge — keeps the GradLaunch Chrome extension's stored JWT
 * in sync with the web dashboard's localStorage token.
 *
 * How it works:
 *   1. The extension declares the dashboard origin in manifest.json's
 *      `externally_connectable.matches`. Pages on that origin can call
 *      chrome.runtime.sendMessage(<extension-id>, …) from the *page context*.
 *   2. We provide the extension id via VITE_EXTENSION_ID env var (set at
 *      build time), or fall back to auto-discovery by pinging a set of
 *      known ids. If none responds, the bridge silently no-ops.
 *   3. On login/logout and on mount, we push {type:"SET_AUTH_TOKEN", token}
 *      or {type:"CLEAR_AUTH_TOKEN"} to the extension.
 *
 * Usage in a React tree:
 *   useExtensionBridge(token); // null = logged out
 */
import { useEffect, useRef } from 'react';

const DEFAULT_EXTENSION_IDS = [
    import.meta.env?.VITE_EXTENSION_ID,
    // You can pin additional known IDs here for staging/prod deploys.
].filter(Boolean);

function canUseExternallyConnectable() {
    return typeof window !== 'undefined'
        && typeof window.chrome !== 'undefined'
        && window.chrome.runtime
        && typeof window.chrome.runtime.sendMessage === 'function';
}

async function pingExtension(extId) {
    return new Promise((resolve) => {
        try {
            window.chrome.runtime.sendMessage(
                extId,
                { type: 'PING' },
                (resp) => {
                    // lastError is set if no extension with this id listens.
                    if (window.chrome.runtime?.lastError) {
                        resolve(false);
                    } else {
                        resolve(Boolean(resp?.pong));
                    }
                }
            );
        } catch (_) {
            resolve(false);
        }
    });
}

async function discoverExtensionId() {
    if (!canUseExternallyConnectable()) return null;
    for (const id of DEFAULT_EXTENSION_IDS) {
        // eslint-disable-next-line no-await-in-loop
        if (await pingExtension(id)) return id;
    }
    return null;
}

function sendToExtension(extId, payload) {
    return new Promise((resolve) => {
        if (!canUseExternallyConnectable() || !extId) return resolve(false);
        try {
            window.chrome.runtime.sendMessage(extId, payload, (resp) => {
                if (window.chrome.runtime?.lastError) return resolve(false);
                resolve(Boolean(resp?.success));
            });
        } catch (_) {
            resolve(false);
        }
    });
}

/**
 * @param {string|null} token - the current JWT (null when logged out)
 * @param {object} [opts]
 * @param {string} [opts.apiBase] - backend base URL to pin in the extension
 */
export default function useExtensionBridge(token, opts = {}) {
    const extIdRef = useRef(null);

    // Discover the extension id once per mount.
    useEffect(() => {
        let cancelled = false;
        discoverExtensionId().then((id) => {
            if (!cancelled) extIdRef.current = id;
        });
        return () => { cancelled = true; };
    }, []);

    // Sync token on change.
    useEffect(() => {
        const extId = extIdRef.current;
        const run = async () => {
            const id = extId || await discoverExtensionId();
            if (!id) return;
            if (token) {
                await sendToExtension(id, {
                    type: 'SET_AUTH_TOKEN',
                    token,
                    apiBase: opts.apiBase || import.meta.env?.VITE_API_URL || 'https://gradlaunch-api.onrender.com',
                });
            } else {
                await sendToExtension(id, { type: 'CLEAR_AUTH_TOKEN' });
            }
        };
        run();
    }, [token, opts.apiBase]);
}

export { sendToExtension, discoverExtensionId };
