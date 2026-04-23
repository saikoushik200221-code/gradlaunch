/**
 * content/ashby.js — Ashby ATS content script.
 *
 * Handles both layouts:
 *   https://jobs.ashbyhq.com/{company}/{jobId}             (hosted)
 *   https://{company}.ashbyhq.com/jobs/{jobId}             (embed)
 *
 * Ashby renders a long React form. Field ids are deterministic but prefixed
 * with a random hash on each render, so we match by `name` attribute (which
 * is stable and equal to the field `path` returned by our backend adapter).
 */
(function () {
    if (!window.GradLaunch) {
        console.warn('[GradLaunch] _common.js not loaded before ashby.js');
        return;
    }
    const GL = window.GradLaunch;

    console.log('[GradLaunch] Ashby content script active');

    function fillAshby(fields) {
        let filled = 0;

        // Try matching by name first (system fields like _systemfield_name).
        filled += GL.fillByName(fields);

        // Ashby also exposes common fields with recognizable labels.
        const labelMap = {
            _systemfield_name: [
                'input[name="_systemfield_name"]',
                'input[name="name"]',
                'input[id*="name" i]:not([id*="lastname"]):not([id*="firstname"])',
            ],
            _systemfield_email: [
                'input[type="email"]',
                'input[name*="email" i]',
            ],
            _systemfield_phoneNumber: [
                'input[type="tel"]',
                'input[name*="phone" i]',
            ],
            _systemfield_location: [
                'input[name*="location" i]',
                'input[placeholder*="City" i]',
            ],
            _systemfield_linkedinUrl: [
                'input[name*="linkedin" i]',
            ],
            _systemfield_githubUrl: [
                'input[name*="github" i]',
            ],
            _systemfield_websiteUrl: [
                'input[name*="website" i]',
                'input[name*="portfolio" i]',
            ],
        };
        for (const [key, selectors] of Object.entries(labelMap)) {
            const val = fields[key];
            if (val == null || val === '') continue;
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && GL.setFieldValue(el, val)) { filled++; break; }
            }
        }
        return filled;
    }

    GL.injectFillButton({
        // Ashby application form is below a header; anchor to the submit/continue btn.
        anchorSelector: 'button[type="submit"], button._submit, button:has(span:contains("Submit"))',
        atsName: 'Ashby',
        onClick: (btn) => {
            GL.requestPrefill((resp) => {
                if (!resp) {
                    btn.innerText = '❌ No response';
                    GL.openToast('Extension could not reach GradLaunch API', 'err');
                    return;
                }
                if (resp.error || !resp.success) {
                    const msg = resp.error || 'Prefill failed';
                    btn.innerText = `❌ ${msg}`;
                    GL.openToast(msg === 'NOT_LOGGED_IN'
                        ? 'Open gradlaunch.vercel.app and sign in, then retry.'
                        : `Prefill error: ${msg}`, 'err');
                    return;
                }
                const filled = fillAshby(resp.fields || {});
                btn.innerText = `✅ Filled ${filled} field${filled === 1 ? '' : 's'}`;
                GL.openToast(`GradLaunch filled ${filled} Ashby fields`, 'ok');
            });
        },
    });

    // Fallback: if no submit button exists yet, inject above the first input.
    setTimeout(() => {
        if (document.getElementById('gradlaunch-fill-btn')) return;
        const firstInput = document.querySelector('form input, form textarea, form select');
        if (!firstInput) return;
        const btn = document.createElement('button');
        btn.id = 'gradlaunch-fill-btn';
        btn.className = 'gl-btn';
        btn.type = 'button';
        btn.innerText = '✨ Auto-fill with GradLaunch';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.disabled = true;
            btn.innerText = '⌛ Analyzing...';
            GL.requestPrefill((resp) => {
                if (resp?.success) {
                    const n = fillAshby(resp.fields || {});
                    btn.innerText = `✅ Filled ${n}`;
                    GL.openToast(`Filled ${n} Ashby fields`, 'ok');
                } else {
                    btn.innerText = '❌ Error';
                    GL.openToast(resp?.error || 'Prefill failed', 'err');
                }
            });
        });
        firstInput.parentNode.insertBefore(btn, firstInput);
    }, 2000);
})();
