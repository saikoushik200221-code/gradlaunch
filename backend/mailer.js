const nodemailer = require('nodemailer');

let transporter = null;

function initMailer() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.warn('[GradLaunch] EMAIL_USER/EMAIL_PASS not set. Email notifications disabled.');
        return;
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    console.log('[GradLaunch] Nodemailer configured for', user);
}

async function sendJobAlertEmail(toEmail, userName, jobs) {
    if (!transporter) return;

    const jobListHtml = jobs.map(j => `
        <tr>
            <td style="padding:12px;border-bottom:1px solid #eee">
                <strong style="color:#6C63FF">${j.title}</strong><br>
                <span style="color:#666">${j.company} &middot; ${j.location}</span><br>
                <span style="color:#22c55e;font-weight:bold">${j.salary || 'Salary not listed'}</span>
                <span style="margin-left:12px;color:#6C63FF;font-weight:bold">${j.match}% match</span>
            </td>
        </tr>
    `).join('');

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e0e0e0;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6C63FF,#4F46E5);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:24px;color:#fff">🚀 GradLaunch Job Alerts</h1>
            <p style="margin:8px 0 0;color:#c7d2fe">New jobs matching your profile, ${userName || 'there'}!</p>
        </div>
        <div style="padding:24px">
            <table style="width:100%;border-collapse:collapse;background:#111827;border-radius:12px;overflow:hidden">
                ${jobListHtml}
            </table>
            <div style="text-align:center;margin-top:24px">
                <a href="https://gradlaunch.ai/jobs" style="display:inline-block;padding:14px 32px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold">View All Jobs →</a>
            </div>
        </div>
        <div style="padding:16px;text-align:center;color:#666;font-size:12px">
            You received this because you enabled job alerts on GradLaunch.
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"GradLaunch" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `🚀 ${jobs.length} New Job${jobs.length > 1 ? 's' : ''} Matching Your Profile!`,
            html
        });
        console.log(`[GradLaunch] Job alert email sent to ${toEmail}`);
    } catch (err) {
        console.error('[GradLaunch] Failed to send job alert email:', err.message);
    }
}

async function sendInterviewReminderEmail(toEmail, userName, app) {
    if (!transporter) return;

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e0e0e0;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:24px;color:#fff">📅 Interview Reminder</h1>
            <p style="margin:8px 0 0;color:#fef3c7">You have an upcoming interview, ${userName || 'there'}!</p>
        </div>
        <div style="padding:24px">
            <div style="background:#111827;border-radius:12px;padding:20px">
                <h2 style="margin:0 0 8px;color:#f59e0b">${app.title || 'Position'}</h2>
                <p style="margin:0 0 4px;color:#9ca3af">${app.company || 'Company'}</p>
                <p style="margin:12px 0 0;color:#fbbf24;font-weight:bold;font-size:18px">📅 ${app.interviewDate}</p>
            </div>
            <div style="text-align:center;margin-top:24px">
                <a href="https://gradlaunch.ai/tracker" style="display:inline-block;padding:14px 32px;background:#f59e0b;color:#000;text-decoration:none;border-radius:12px;font-weight:bold">View Tracker →</a>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"GradLaunch" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `📅 Interview Reminder: ${app.title} at ${app.company}`,
            html
        });
        console.log(`[GradLaunch] Interview reminder sent to ${toEmail}`);
    } catch (err) {
        console.error('[GradLaunch] Failed to send interview reminder:', err.message);
    }
}

module.exports = { initMailer, sendJobAlertEmail, sendInterviewReminderEmail };
