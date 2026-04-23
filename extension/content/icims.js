/**
 * content/icims.js — iCIMS ATS content script.
 *
 * Hosts:
 *   https://careers-{company}.icims.com/jobs/...
 *   https://{company}.icims.com/jobs/...
 *
 * iCIMS forms use deterministic `id` prefixes that vary slightly between
 * tenants. The backend ICIMSAdapter returns CSS attribute-contains selectors
 * (e.g. `input[id*="firstname" i]`). We pass them straight to
 * `fillBySelector`, which is tolerant of selector punctuation.
 */
(function () {
    if (!window.GradLaunch) {
        console.warn('[GradLaunch] _common.js not loaded before icims.js');
        return;
    }
    const GL = window.GradLaunch;

    console.log('[GradLaunch] iCIMS content script active');

    function fillICIMS(fields, selectorMap) {
        let filled = 0;
        filled += GL.fillBySelector(fields, selectorMap || {});

        // Fallback attribute selectors that commonly work on iCIMS tenants.
        const fallback = {
            firstName: ['input[id*="firstname" i]', 'input[name*="firstname" i]'],
            lastName:  ['input[id*="lastname" i]', 'input[name*="lastname" i]'],
            email:     ['input[type="email"]', 'input[id*="email" i]'],
            phone:     ['input[type="tel"]', 'input[id*="phone" i]'],
            address:   ['input[id*="address" i]'],
            city:      ['input[id*="city" i]'],
            state:     ['select[id*="state" i]', 'input[id*="state" i]'],
            zip:       ['input[id*="zip" i]', 'input[id*="postal" i]'],
            country:   ['select[id*="country" i]'],
            linkedin:  ['input[id*="linkedin" i]', 'input[name*="linkedin" i]'],
            website:   ['input[id*="website" i]', 'input[id*="portfolio" i]'],
        };
        for (const [key, sels] of Object.entries(fallback)) {
            const val = fields[key];
            if (val == null || val === '') continue;
            for (const sel of sels) {
                const el = document.querySelector(sel);
                if (el && !el.value && GL.setFieldValue(el, val)) { filled++; break; }
            }
        }
        return filled;
    }

    async function init() {
        // iCIMS shows the "Apply for this job" button first; the full form
        // opens in an iframe named iCIMS_MainIFrame or loads inline via
        // pushState. We attempt both.
        const anchor = await GL.waitFor(
            '#iCIMS_apply, a.iCIMS_Anchor, button#apply_icims, input[type="submit"], button[type="submit"]',
            8000
        );
        if (!anchor) return;

        GL.injectFillButton({
            anchorSelector: '#iCIMS_apply, a.iCIMS_Anchor, button#apply_icims, input[type="submit"]',
            atsName: 'iCIMS',
            onClick: (btn) => {
                GL.requestPrefill((resp) => {
                    if (!resp) {
                        btn.innerText = '❌ No response';
                        GL.openToast('Extension could not reach GradLaunch', 'err');
                        return;
                    }
                    if (resp.error || !resp.success) {
                        const msg = resp.error || 'Prefill failed';
                        btn.innerText = `❌ ${msg}`;
                        GL.openToast(msg === 'NOT_LOGGED_IN'
                            ? 'Sign in at gradlaunch.vercel.app, then retry.'
                            : `Prefill error: ${msg}`, 'err');
                        return;
                    }
                    const filled = fillICIMS(resp.fields || {}, resp.selectorMap || {});
                    btn.innerText = `✅ Filled ${filled} field${filled === 1 ? '' : 's'}`;
                    GL.openToast(`GradLaunch filled ${filled} iCIMS fields`, 'ok');
                });
            },
        });
    }

    init();
})();
