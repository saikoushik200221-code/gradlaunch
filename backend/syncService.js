const { chromium } = require('playwright');

/**
 * Syncs the status of an application by logging into the specified portal.
 * @param {string} portalUrl - The URL of the job portal login page.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<{status: string, message: string}>}
 */
async function syncApplicationStatus(portalUrl, email, password) {
    let browser;
    try {
        console.log(`[SyncService] Starting sync for ${portalUrl}...`);
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        // 1. Navigate to portal
        await page.goto(portalUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // 2. Attempt Login (Generic heuristics for common portals)
        try {
            // Find email/password fields
            const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[id*="email"]', 'input[id*="user"]'];
            const passSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id*="password"]'];

            let emailFound = false;
            for (const sel of emailSelectors) {
                if (await page.$(sel)) {
                    await page.fill(sel, email);
                    emailFound = true;
                    break;
                }
            }

            if (!emailFound) throw new Error("Could not find email field");

            for (const sel of passSelectors) {
                if (await page.$(sel)) {
                    await page.fill(sel, password);
                    break;
                }
            }

            // Click submit
            const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Sign In")', 'button:has-text("Login")'];
            let submitted = false;
            for (const sel of submitSelectors) {
                if (await page.$(sel)) {
                    await page.click(sel);
                    submitted = true;
                    break;
                }
            }

            if (!submitted) {
                // Try pressing Enter
                await page.keyboard.press('Enter');
            }

            // Wait for navigation after login
            await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => { });
        } catch (e) {
            console.warn("[SyncService] Login heuristic failed or already logged in:", e.message);
        }

        // 3. Status Extraction Heuristics
        // We look for status indicators in the page text
        const content = await page.innerText('body');
        const text = content.toLowerCase();

        let detectedStatus = 'Applied';
        let message = 'Sync successful: No status change detected.';

        if (text.includes('interview') || text.includes('phone screen') || text.includes('assessment')) {
            detectedStatus = 'Interview';
            message = 'Action Required: You have been invited for an interview or assessment!';
        } else if (text.includes('offer') || text.includes('congratulations')) {
            detectedStatus = 'Offer 🎉';
            message = 'Big News: An offer has been detected in your portal!';
        } else if (text.includes('rejected') || text.includes('not moving forward') || text.includes('closed') || text.includes('positioned filled')) {
            detectedStatus = 'Rejected';
            message = 'Update: The application has been closed or rejected.';
        }

        await browser.close();
        return { status: detectedStatus, message };

    } catch (error) {
        console.error('[SyncService] Sync failed:', error.message);
        if (browser) await browser.close();
        // Return a safe fallback so the app doesn't crash
        return {
            status: null,
            error: true,
            message: `Could not sync: ${error.message}`
        };
    }
}

module.exports = { syncApplicationStatus };
