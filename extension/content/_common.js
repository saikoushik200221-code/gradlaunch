/**
 * _common.js — shared helpers injected into every ATS content script.
 *
 * Loaded *before* the per-ATS script via manifest.json content_scripts[].js order.
 * Exposes `window.GradLaunch` with:
 *   - injectFillButton(hostEl, { atsName, onClick }) — renders the floating CTA
 *   - fillBySelector(fields, selectorMap) — for adapters that return CSS selectors
 *   - fillByName(fields) — for adapters that return raw input names
 *   - fireEvents(el) — dispatch input/change/blur so React/Vue pick up the value
 *   - requestPrefill(cb) — ask background.js for the /api/hybrid/prefill response
 *   - openToast(message, tone) — lightweight in-page notification
 *   - waitFor(selector, timeout) — promise that resolves when an element appears
 */
(function () {
    if (window.GradLaunch) return;

    const BRAND = {
        grad: "GradLaunch",
        bg: "linear-gradient(135deg, #c8ff00 0%, #8b5cf6 100%)",
        color: "#0a0a0a",
    };

    const STYLE = `
        .gl-btn {
            background: ${BRAND.bg};
            color: ${BRAND.color};
            padding: 12px 22px;
            border-radius: 14px;
            border: none;
            font-weight: 800;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            cursor: pointer;
            margin: 12px 0;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 10px 30px rgba(200,255,0,0.2);
            transition: transform 120ms ease, filter 120ms ease;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .gl-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .gl-btn:active { transform: translateY(0); filter: brightness(0.95); }
        .gl-btn[disabled] { opacity: 0.6; cursor: not-allowed; }
        .gl-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0a0a0a;
            color: #fff;
            padding: 12px 18px;
            border-radius: 14px;
            font-family: system-ui, sans-serif;
            font-size: 13px;
            font-weight: 600;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            z-index: 2147483647;
            max-width: 360px;
            animation: gl-slide 160ms ease-out;
        }
        .gl-toast.gl-ok { border-left: 4px solid #c8ff00; }
        .gl-toast.gl-err { border-left: 4px solid #ec4899; }
        .gl-toast.gl-info { border-left: 4px solid #8b5cf6; }
        @keyframes gl-slide { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
    `;

    function ensureStyle() {
        if (document.getElementById("gl-style")) return;
        const s = document.createElement("style");
        s.id = "gl-style";
        s.textContent = STYLE;
        document.head.appendChild(s);
    }

    function fireEvents(el) {
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
    }

    /** Set value on React-controlled inputs by calling the native setter. */
    function reactSetValue(el, value) {
        const proto = el.tagName === "SELECT"
            ? window.HTMLSelectElement.prototype
            : el.tagName === "TEXTAREA"
              ? window.HTMLTextAreaElement.prototype
              : window.HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) desc.set.call(el, value);
        else el.value = value;
    }

    function setFieldValue(el, value) {
        if (!el || value == null) return false;
        try {
            if (el.tagName === "SELECT") {
                const opts = Array.from(el.options || []);
                const match = opts.find(
                    o => o.value === value ||
                         o.text?.toLowerCase() === String(value).toLowerCase()
                );
                if (match) {
                    reactSetValue(el, match.value);
                    fireEvents(el);
                    return true;
                }
                return false;
            }
            if (el.type === "checkbox" || el.type === "radio") {
                const shouldCheck = value === true || /^(yes|true|on)$/i.test(String(value));
                if (el.checked !== shouldCheck) el.click();
                return true;
            }
            reactSetValue(el, value);
            fireEvents(el);
            return true;
        } catch (e) {
            console.warn("[GradLaunch] setFieldValue failed:", e);
            return false;
        }
    }

    function fillByName(fields) {
        let filled = 0;
        for (const [name, value] of Object.entries(fields || {})) {
            if (value == null || value === "") continue;
            const el = document.querySelector(
                `[name="${cssEscape(name)}"], [name^="${cssEscape(name)}"], [id="${cssEscape(name)}"]`
            );
            if (el && setFieldValue(el, value)) filled++;
        }
        return filled;
    }

    function fillBySelector(fields, selectorMap) {
        let filled = 0;
        for (const [key, sel] of Object.entries(selectorMap || {})) {
            const value = fields?.[key];
            if (value == null || value === "") continue;
            // Workday-style "data-automation-id" shorthand: if the entry is just
            // a string without CSS punctuation, use it as a data-automation-id.
            const selector = /[[\]*\s.>#,:()"]/.test(sel)
                ? sel
                : `[data-automation-id="${cssEscape(sel)}"], [data-automation-id^="${cssEscape(sel)}"]`;
            const el = document.querySelector(selector);
            if (el && setFieldValue(el, value)) filled++;
        }
        return filled;
    }

    function cssEscape(str) {
        return String(str).replace(/"/g, '\\"');
    }

    function requestPrefill(cb) {
        chrome.runtime.sendMessage(
            {
                type: "GET_PREFILL_DATA",
                url: window.location.href,
                html: document.documentElement.outerHTML.slice(0, 200000), // cap payload
            },
            cb
        );
    }

    function openToast(message, tone = "info", ttl = 3600) {
        ensureStyle();
        const t = document.createElement("div");
        t.className = `gl-toast gl-${tone}`;
        t.textContent = message;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), ttl);
    }

    function waitFor(selector, timeout = 10000) {
        return new Promise((resolve) => {
            const found = document.querySelector(selector);
            if (found) return resolve(found);
            const obs = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) { obs.disconnect(); resolve(el); }
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
        });
    }

    function injectFillButton({ anchorSelector, atsName, onClick, label = "Auto-fill with GradLaunch" }) {
        ensureStyle();

        const render = () => {
            const anchor = document.querySelector(anchorSelector);
            if (!anchor) return;
            if (document.getElementById("gradlaunch-fill-btn")) return;

            const btn = document.createElement("button");
            btn.id = "gradlaunch-fill-btn";
            btn.className = "gl-btn";
            btn.type = "button";
            btn.innerText = `✨ ${label}`;

            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.disabled = true;
                btn.innerText = "⌛ Analyzing...";
                onClick(btn);
            });

            anchor.parentNode.insertBefore(btn, anchor);
            console.log(`[GradLaunch] ${atsName} button injected`);
        };

        render();
        const obs = new MutationObserver(render);
        obs.observe(document.body, { childList: true, subtree: true });
    }

    window.GradLaunch = {
        injectFillButton,
        fillBySelector,
        fillByName,
        fireEvents,
        setFieldValue,
        requestPrefill,
        openToast,
        waitFor,
    };
})();
