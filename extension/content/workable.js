/**
 * content/workable.js — Workable ATS content script.
 *
 * Hosts: https://apply.workable.com/*, https://jobs.workable.com/*
 *
 * Workable forms use a mix of name-based and id-based selectors. We ship
 * a best-effort map and a fallback to fillByName.
 */
(function () {
    if (!window.GradLaunch) return;
    const GL = window.GradLaunch;

    console.log('[GradLaunch] Workable content script active');

    const selectorMap = {
        firstName: 'input[name="firstname"], input[id*="firstname" i]',
        lastName:  'input[name="lastname"],  input[id*="lastname" i]',
        email:     'input[type="email"], input[name="email"]',
        phone:     'input[type="tel"], input[name="phone"]',
        linkedin:  'input[name*="linkedin" i]',
        website:   'input[name*="website" i], input[name*="portfolio" i]',
    };

    function fillWorkable(fields) {
        let filled = GL.fillBySelector(fields, selectorMap);
        filled += GL.fillByName(fields);
        return filled;
    }

    GL.injectFillButton({
        anchorSelector: 'button[type="submit"], button.btn--primary, button[data-ui="apply"]',
        atsName: 'Workable',
        onClick: (btn) => {
            GL.requestPrefill((resp) => {
                if (resp?.success) {
                    const n = fillWorkable(resp.fields || {});
                    btn.innerText = `✅ Filled ${n}`;
                    GL.openToast(`Filled ${n} Workable fields`, 'ok');
                } else {
                    btn.innerText = '❌ Error';
                    GL.openToast(resp?.error || 'Prefill failed', 'err');
                }
            });
        },
    });
})();
