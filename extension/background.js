// background.js — Service worker for GradLaunch Copilot.
//
// Responsibilities:
//   1. Accept the JWT from the web dashboard via chrome.runtime.sendMessage
//      (externally_connectable).
//   2. Respond to content-script requests to call /api/hybrid/prefill.
//   3. Allow the popup / content scripts to PING and discover the API base.

const DEFAULT_API_BASES = [
    'https://gradlaunch-api.onrender.com',
    'http://localhost:3001',
];

async function getApiBase() {
    const { apiBase } = await chrome.storage.local.get(['apiBase']);
    return apiBase || DEFAULT_API_BASES[0];
}

async function probeApiBase() {
    // Walk the default list and return the first that responds to /healthz.
    for (const base of DEFAULT_API_BASES) {
        try {
            const res = await fetch(`${base}/healthz`, { method: 'GET' });
            if (res.ok) {
                await chrome.storage.local.set({ apiBase: base });
                return base;
            }
        } catch (_) { /* continue */ }
    }
    return DEFAULT_API_BASES[0];
}

chrome.runtime.onInstalled.addListener(async () => {
    console.log('[GradLaunch] Copilot installed');
    const base = await probeApiBase();
    console.log('[GradLaunch] API base:', base);
});

// ── External bridge (from the Vite dashboard) ────────────────────────────────
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    // Origin gate — only trust known dashboard origins.
    const allowed = [
        'http://localhost:5173',
        'https://gradlaunch.vercel.app',
    ];
    const origin = sender?.origin || sender?.url;
    const isAllowed = allowed.some(a => origin && origin.startsWith(a));
    if (!isAllowed) {
        sendResponse({ success: false, error: 'UNAUTHORIZED_ORIGIN' });
        return false;
    }

    if (message?.type === 'SET_AUTH_TOKEN' && message.token) {
        chrome.storage.local.set(
            { jwt: message.token, apiBase: message.apiBase || DEFAULT_API_BASES[0] },
            () => {
                console.log('[GradLaunch] JWT synchronized from dashboard');
                sendResponse({ success: true });
            }
        );
        return true;
    }

    if (message?.type === 'CLEAR_AUTH_TOKEN') {
        chrome.storage.local.remove(['jwt'], () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (message?.type === 'PING') {
        sendResponse({ success: true, pong: true, version: chrome.runtime.getManifest().version });
        return false;
    }

    sendResponse({ success: false, error: 'UNKNOWN_MESSAGE_TYPE' });
    return false;
});

// ── Content script bridge ────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'GET_PREFILL_DATA') {
        (async () => {
            const { jwt } = await chrome.storage.local.get(['jwt']);
            if (!jwt) {
                sendResponse({ success: false, error: 'NOT_LOGGED_IN' });
                return;
            }
            const apiBase = await getApiBase();
            try {
                const response = await fetch(`${apiBase}/api/hybrid/prefill`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: message.url,
                        html: (message.html || '').slice(0, 200000),
                    }),
                });
                if (!response.ok) {
                    const txt = await response.text().catch(() => '');
                    sendResponse({
                        success: false,
                        error: `HTTP ${response.status}`,
                        detail: txt.slice(0, 500),
                    });
                    return;
                }
                const data = await response.json();
                sendResponse(data);
            } catch (err) {
                console.error('[GradLaunch] prefill fetch failed:', err);
                sendResponse({ success: false, error: err.message || 'NETWORK_ERROR' });
            }
        })();
        return true; // async
    }

    if (message?.type === 'GET_AUTH_STATUS') {
        chrome.storage.local.get(['jwt'], ({ jwt }) => {
            sendResponse({ loggedIn: Boolean(jwt) });
        });
        return true;
    }

    return false;
});
