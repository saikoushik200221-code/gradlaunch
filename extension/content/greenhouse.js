/**
 * content/greenhouse.js — Greenhouse ATS content script.
 *
 * Hosts:
 *   https://boards.greenhouse.io/{company}/jobs/{jobId}
 *   https://job-boards.greenhouse.io/{company}/jobs/{jobId}
 *   https://{company}.greenhouse.io/...
 *
 * Greenhouse uses stable `name`/`id` attributes (first_name, last_name,
 * email, phone). We primarily use `fillByName`, with a label-driven
 * fallback for custom questions.
 */
(function () {
    if (!window.GradLaunch) return;
    const GL = window.GradLaunch;

    console.log('[GradLaunch] Greenhouse content script active');

    function fillGreenhouse(fields) {
        let filled = GL.fillByName(fields);

        // Greenhouse nests custom questions under name="job_application[answers_attributes][<n>][...]"
        // Try a label-based resolution for those.
        const questionLabels = Array.from(document.querySelectorAll('label[for]'));
        for (const [key, val] of Object.entries(fields || {})) {
            if (val == null || val === '') continue;
            const match = questionLabels.find(l => l.textContent &&
                l.textContent.toLowerCase().includes(String(key).toLowerCase()));
            if (match) {
                const id = match.getAttribute('for');
                const el = id && document.getElementById(id);
                if (el && !el.value) {
                    GL.setFieldValue(el, val);
                    filled++;
                }
            }
        }
        return filled;
    }

    GL.injectFillButton({
        anchorSelector: 'button#submit_app, #apply_button, button[type="submit"]',
        atsName: 'Greenhouse',
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
                const filled = fillGreenhouse(resp.fields || {});
                btn.innerText = `✅ Filled ${filled} field${filled === 1 ? '' : 's'}`;
                GL.openToast(`GradLaunch filled ${filled} Greenhouse fields`, 'ok');
            });
        },
    });
})();
