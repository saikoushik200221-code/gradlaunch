/**
 * content/workday.js — Workday ATS content script.
 *
 * Hosts:
 *   https://{tenant}.wd{n}.myworkdayjobs.com/...
 *   https://{tenant}.myworkdayjobs.com/...
 *
 * Workday uses an extremely stable set of data-automation-id attributes.
 * The backend's WorkdayAdapter returns a selectorMap whose values are the
 * raw data-automation-id strings; _common.js.fillBySelector knows how to
 * expand those into valid CSS attribute selectors.
 *
 * Workday gates the application behind a login/signup step. This script:
 *   1. Injects the button on the job posting page (primes the user).
 *   2. Re-injects on SPA route changes (Workday uses pushState heavily).
 *   3. Handles both "My Information" and "My Experience" sections.
 */
(function () {
    if (!window.GradLaunch) {
        console.warn('[GradLaunch] _common.js not loaded before workday.js');
        return;
    }
    const GL = window.GradLaunch;

    console.log('[GradLaunch] Workday content script active');

    function fillWorkday(fields, selectorMap) {
        let filled = 0;

        // Primary: use the selectorMap from the backend (data-automation-id).
        filled += GL.fillBySelector(fields, selectorMap || {});

        // Extra resolutions for tenant-specific variations.
        const extras = {
            firstName: ['input[data-automation-id*="firstName" i]', 'input[name*="firstName" i]'],
            lastName:  ['input[data-automation-id*="lastName" i]', 'input[name*="lastName" i]'],
            email:     ['input[type="email"][data-automation-id*="email" i]', 'input[type="email"]'],
            phoneNumber: ['input[data-automation-id*="phone" i][type="tel"]', 'input[type="tel"]'],
            addressLine1: ['input[data-automation-id*="addressLine1" i]'],
            city: ['input[data-automation-id*="city" i]'],
            postalCode: ['input[data-automation-id*="postalCode" i]', 'input[data-automation-id*="zip" i]'],
            linkedIn: ['input[data-automation-id*="linkedin" i]'],
            website:  ['input[data-automation-id*="website" i]', 'input[data-automation-id*="portfolio" i]'],
        };
        for (const [key, sels] of Object.entries(extras)) {
            const val = fields[key];
            if (val == null || val === '') continue;
            // Skip keys already filled in fillBySelector.
            for (const sel of sels) {
                const el = document.querySelector(sel);
                if (el && !el.value && GL.setFieldValue(el, val)) { filled++; break; }
            }
        }

        return filled;
    }

    async function injectAndWire() {
        // Preferred anchor: the "Apply" or "Autofill with Resume" button.
        const anchor = await GL.waitFor(
            'button[data-automation-id="adventureButton"], ' +
            'button[data-automation-id*="apply" i], ' +
            'a[data-automation-id*="apply" i], ' +
            'button[aria-label*="Apply" i]',
            8000
        );

        if (anchor && !document.getElementById('gradlaunch-fill-btn')) {
            GL.injectFillButton({
                anchorSelector: 'button[data-automation-id="adventureButton"], ' +
                                'button[data-automation-id*="apply" i], ' +
                                'button[aria-label*="Apply" i]',
                atsName: 'Workday',
                onClick: (btn) => runPrefill(btn),
            });
        }

        // Also inject on the My Information form itself.
        const infoAnchor = await GL.waitFor(
            'div[data-automation-id="myInformationPage"], ' +
            'div[data-automation-id="myExperiencePage"], ' +
            'input[data-automation-id="legalNameSection_firstName"]',
            12000
        );
        if (infoAnchor && !document.getElementById('gradlaunch-fill-btn-form')) {
            const btn = document.createElement('button');
            btn.id = 'gradlaunch-fill-btn-form';
            btn.className = 'gl-btn';
            btn.type = 'button';
            btn.style.position = 'fixed';
            btn.style.top = '84px';
            btn.style.right = '24px';
            btn.style.zIndex = '2147483646';
            btn.innerText = '✨ Auto-fill with GradLaunch';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.disabled = true;
                btn.innerText = '⌛ Analyzing...';
                runPrefill(btn);
            });
            document.body.appendChild(btn);
        }
    }

    function runPrefill(btn) {
        GL.requestPrefill((resp) => {
            if (!resp) {
                btn.innerText = '❌ No response';
                GL.openToast('No response from GradLaunch', 'err');
                btn.disabled = false;
                return;
            }
            if (resp.error || !resp.success) {
                const msg = resp.error || 'Prefill failed';
                btn.innerText = `❌ ${msg}`;
                GL.openToast(msg === 'NOT_LOGGED_IN'
                    ? 'Sign in at gradlaunch.vercel.app, then retry.'
                    : `Prefill error: ${msg}`, 'err');
                btn.disabled = false;
                return;
            }
            const filled = fillWorkday(resp.fields || {}, resp.selectorMap || {});
            btn.innerText = `✅ Filled ${filled} field${filled === 1 ? '' : 's'}`;
            GL.openToast(`GradLaunch filled ${filled} Workday fields`, 'ok');
            setTimeout(() => {
                btn.disabled = false;
                btn.innerText = '🔁 Re-fill';
            }, 1500);
        });
    }

    injectAndWire();

    // Workday is a heavy SPA; re-wire on URL change.
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            const existing = document.getElementById('gradlaunch-fill-btn');
            if (existing) existing.remove();
            const existing2 = document.getElementById('gradlaunch-fill-btn-form');
            if (existing2) existing2.remove();
            setTimeout(injectAndWire, 700);
        }
    }).observe(document.body, { childList: true, subtree: true });
})();
