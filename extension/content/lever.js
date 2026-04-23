/**
 * content/lever.js — Lever ATS content script.
 *
 * Host: https://jobs.lever.co/{company}/{postingId}
 *
 * Lever field names are short and stable (name, email, org, phone,
 * urls[LinkedIn], urls[GitHub], urls[Portfolio]). We feed the prefill
 * payload directly to fillByName and to an extra selectorMap for URLs.
 */
(function () {
    if (!window.GradLaunch) return;
    const GL = window.GradLaunch;

    console.log('[GradLaunch] Lever content script active');

    function fillLever(fields) {
        let filled = GL.fillByName(fields);

        const extraSelectors = {
            linkedin: 'input[name="urls[LinkedIn]"], input[name*="linkedin" i]',
            github:   'input[name="urls[GitHub]"], input[name*="github" i]',
            website:  'input[name="urls[Portfolio]"], input[name*="portfolio" i], input[name*="website" i]',
            company:  'input[name="org"]',
            location: 'input[name="location"]',
        };
        filled += GL.fillBySelector(fields, extraSelectors);
        return filled;
    }

    GL.injectFillButton({
        anchorSelector:
            '.postings-btn-wrapper a, button.postings-btn, button[type="submit"]',
        atsName: 'Lever',
        onClick: (btn) => {
            GL.requestPrefill((resp) => {
                if (!resp) {
                    btn.innerText = '❌ No response';
                    GL.openToast('No response from GradLaunch', 'err');
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
                const filled = fillLever(resp.fields || {});
                btn.innerText = `✅ Filled ${filled} field${filled === 1 ? '' : 's'}`;
                GL.openToast(`GradLaunch filled ${filled} Lever fields`, 'ok');
            });
        },
    });
})();
