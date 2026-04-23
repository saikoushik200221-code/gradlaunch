// popup.js — shows login status and detected ATS in the extension popup.

const ATS_PATTERNS = [
    { name: 'Greenhouse', test: (u) => /greenhouse\.io/.test(u) },
    { name: 'Lever',      test: (u) => /jobs\.lever\.co/.test(u) },
    { name: 'Ashby',      test: (u) => /ashbyhq\.com/.test(u) },
    { name: 'Workday',    test: (u) => /myworkdayjobs\.com/.test(u) },
    { name: 'iCIMS',      test: (u) => /icims\.com/.test(u) },
    { name: 'Workable',   test: (u) => /workable\.com/.test(u) },
];

function detectATS(url = '') {
    const hit = ATS_PATTERNS.find(p => p.test(url));
    return hit ? hit.name : 'None Detected';
}

document.addEventListener('DOMContentLoaded', async () => {
    const atsEl   = document.getElementById('ats-type');
    const loginEl = document.getElementById('login-status');

    chrome.storage.local.get(['jwt', 'apiBase'], (result) => {
        if (result.jwt) {
            loginEl.textContent = 'Logged In';
            loginEl.style.color = '#c8ff00';
        } else {
            loginEl.textContent = 'Not Logged In';
            loginEl.style.color = '#f87171';
        }
    });

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const ats = detectATS(tab?.url || '');
        atsEl.textContent = ats;
        atsEl.style.color = ats === 'None Detected' ? '#94a3b8' : '#c8ff00';
    } catch (e) {
        atsEl.textContent = 'Unknown';
    }

    // Dashboard button — always goes to the live app.
    const openDash = document.getElementById('open-dashboard');
    if (openDash) {
        openDash.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://gradlaunch.vercel.app' });
        });
    }

    // Logout button — clears the stored JWT.
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            chrome.storage.local.remove(['jwt'], () => {
                loginEl.textContent = 'Not Logged In';
                loginEl.style.color = '#f87171';
            });
        });
    }
});
