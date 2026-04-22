# GradLaunch → JobRight.ai Feature Parity Roadmap

_Last updated: April 22, 2026_

> **Phase 1 shipped in this workspace.** The following files were added or modified — run `npm run build` in `/frontend` and `npm start` in `/backend` to pick up the changes:
>
> **New files**
> - `frontend/src/components/MatchBreakdown.jsx` — radar chart + strengths / weaknesses / missing-skill chips, pure SVG (no new deps).
> - `frontend/src/components/ResumeDiffView.jsx` — line-level diff with accept/reject per hunk, keyword-coverage chips, ATS stat row.
>
> **Modified files**
> - `frontend/src/components/JobView.jsx` — replaced the fake `setTimeout` analysis with a real call to `/api/ai/analyze-job` and renders `MatchBreakdown`.
> - `frontend/src/components/JobSearch.jsx` — added a second filter row with recency chips (Any / 24h / 7d / 30d) and a salary slider ($0–$250k).
> - `frontend/src/components/ResumeTailor.jsx` — output panel now uses `ResumeDiffView` (original vs. tailored with per-hunk accept/reject).
> - `backend/server.js` — `/api/jobs` now accepts `minSalary`, `postedWithinDays`, `remote`, `h1b_sponsor`, `newGrad` query params.
> - `backend/matchScore.js` — returns the richer payload (`axes`, `strengths`, `weaknesses`, `matchedSkills`, `missingSkills`, `keywordGaps`, `confidence`) while preserving the legacy shape.


This document maps every JobRight.ai capability to a concrete delta against the current gradlaunch codebase (`/frontend` Vite+React, `/backend` Express+SQLite), and turns that delta into a phased, shippable plan.

---

## 1. Where gradlaunch stands today

A surprising amount of the JobRight.ai surface area is already scaffolded:

| Area | Status | Key files |
|---|---|---|
| User auth (email + Google OAuth, JWT) | Done | `backend/server.js`, `frontend/src/components/*Login*` |
| Resume upload + parse (PDF/DOCX) | Done | `backend/parser.js`, `backend/services/resume-matching.js` |
| Weighted match score (skills / exp / keywords / visa) | Done | `backend/matchScore.js` |
| Application tracker (6 stages) | Done | `frontend/src/components/AppTracker.jsx`, `applications` table |
| Resume versioning | Done | `resume_versions` table, `ResumeVersionManager.jsx` |
| Agent orchestrator + Greenhouse auto-apply | Partial | `AgentOrchestrator.js`, `hybridApply.js`, `services/greenhouse.js` |
| H1B / sponsorship intelligence | Partial | `visaIntelligence.js` |
| Job aggregation (Adzuna) | Partial | `services/adzuna.js` |
| A/B testing + analytics | Done | `services/ab-testing.js`, `services/analytics.js` |
| Rate limiting per ATS | Done | `backend/rateLimiter.js` |
| AI form filler | Scaffolded | `services/ai-form-filler.js`, `frontend/.../AIFormFiller.jsx` |

The real gaps are: **breadth of ATS coverage**, **browser-extension autofill**, **deep resume rewriting (not just keyword matching)**, **multi-source aggregation with de-dup**, **visual match-breakdown UI**, and an **AI coach persona** analogous to JobRight's "Orion."

---

## 2. Feature parity matrix

Each row is a JobRight.ai feature → what gradlaunch has → what still needs to ship. Priority: **P0** (parity-critical, ship first), **P1** (parity-important), **P2** (nice-to-have / differentiators).

### 2.1 AI job matching

| JobRight.ai | gradlaunch today | Gap | Priority |
|---|---|---|---|
| 0–100 match score per job | `matchScore.js` produces 0–100 with weighted breakdown | ✅ parity | — |
| "Why this score" panel: strengths / weaknesses / missing skills | Score + skill breakdown JSON, no rich UI | Add `MatchBreakdown.jsx` with strengths, weaknesses, missing-skill chips | **P0** |
| Match radar / visual chart | None | Add radar chart (recharts already in frontend deps) | **P1** |
| Real-time filtering of spam / fake listings | `is_trusted` flag exists but sparsely populated | Back-fill trust signals + add spam classifier to `jobs` ingest pipeline | **P1** |
| Re-score on profile change | Manual | Background job: when user saves profile or resume, re-score top N recent jobs | **P1** |

### 2.2 Resume tailoring

| JobRight.ai | gradlaunch today | Gap | Priority |
|---|---|---|---|
| "Recruiter-optimized resume for this role in <1 min" | `ResumeTailor.jsx` — mostly keyword substitution | Rewrite pipeline: extract JD competencies → rewrite bullets per role → ATS score → diff view | **P0** |
| Per-resume ATS score with keyword-coverage % | `resume_versions.ats_score` column exists; not computed end-to-end | Add `computeAtsScore(resumeText, jd)` returning `{score, matched, missing, stuffing_warnings}` | **P0** |
| "Accept / reject each change" diff UI | None | Add `ResumeDiffView.jsx` — line-level accept/reject persisted via `user_preferences` | **P1** |
| Version manager tied to job | `resume_versions.job_id` exists | Wire the tailoring flow to auto-create a child version per job application | **P0** |
| Export tailored resume as PDF/DOCX | `jspdf` already installed | Add `POST /api/resume/:id/export?format=pdf|docx` | **P1** |

### 2.3 Job aggregation & filtering

| JobRight.ai | gradlaunch today | Gap | Priority |
|---|---|---|---|
| Multi-source aggregation (LinkedIn, Indeed, Greenhouse boards, company career pages) | Adzuna only (100+ boards abstracted) | Add Careerjet (env already references it), JSearch/Serper, plus direct Greenhouse `boards-api.greenhouse.io` scraper and Lever `api.lever.co` public feeds | **P0** |
| Cross-source de-duplication | None | Add `jobs.canonical_id` (hash of normalized `title+company+location`) + upsert pipeline | **P0** |
| Smart filters: H1B, remote, new-grad, STEM OPT | ✅ built | — | — |
| Salary range slider | None | Add UI slider + `salary_min/salary_max` indices (columns already exist) | **P1** |
| Posting recency filter | `jobs.created_at` exists | Add "Past 24h / 7d / 30d" chips in `JobSearch.jsx` | **P1** |
| Company size / stage / industry | None | Enrich via Clearbit-style lookup or LinkedIn company data → `companies` table | **P2** |
| Saved searches + daily email alerts | `mailer.js` sends match alerts; no saved-search model | Add `saved_searches` table + cron worker | **P1** |

### 2.4 Application tracker / auto-apply

| JobRight.ai | gradlaunch today | Gap | Priority |
|---|---|---|---|
| 6-stage Kanban tracker | `AppTracker.jsx` — built | ✅ parity | — |
| Auto-status sync (pull from Gmail / ATS) | `syncService.js` skeleton (Playwright) — brittle | Replace Playwright portal login with Gmail IMAP-based parser (`subject` / `from` heuristics) | **P1** |
| Autofill supports 90% of ATSs (Workday, Greenhouse, Lever, iCIMS, Ashby, Workable) | Greenhouse working, Lever/Ashby/Workday detected but not filled | Add adapter per ATS under `backend/services/ats/<name>.js` implementing `detect`, `prefill`, `submit` | **P0** |
| One-click apply via browser extension | None | Ship a Chrome extension that talks to backend (`/api/autofill/profile`) and injects values | **P0** |
| Insider connection suggestions (people at the company) | None | Integrate LinkedIn search or OpenAlumni API | **P2** |
| Interview reminders | `mailer.js` sends these | ✅ parity | — |

### 2.5 AI coach (JobRight "Orion")

| JobRight.ai | gradlaunch today | Gap | Priority |
|---|---|---|---|
| Conversational coach on the dashboard | `Copilot.jsx` exists | Promote to persistent drawer; give it tools: `search_jobs`, `score_resume`, `tailor_resume`, `get_tracker_status` | **P1** |
| Proactive nudges ("You haven't applied in 3 days") | None | Add nudge engine reading `agent_activity_log` | **P2** |
| Mock interview / interview prep | None | Net-new feature: question bank per role + Gemini live Q&A | **P2** |
| Salary prediction | None | Aggregate from `salary_min/max` per role+location; use median as baseline | **P2** |

---

## 3. Phased roadmap

Rough estimates assume ~1 FTE dev, Gemini/Anthropic for AI. Scale down/up accordingly.

### Phase 1 — "It looks and feels like JobRight" (Weeks 1–2)

Goal: close the visible UX gap so a side-by-side demo is believable.

1. **`MatchBreakdown.jsx` component** (strengths / weaknesses / missing chips + radar chart). Pull data from existing `matchScore.js` payload.
2. **`ResumeDiffView.jsx`** — accept/reject changes inline. Wire to `POST /api/resume/tailor/:jobId` that returns `{original, suggested, diff[]}`.
3. **Salary slider + recency chips** in `JobSearch.jsx`. Backend query changes in `server.js` job search route.
4. **Job card polish** in `JobIntelligenceCard.jsx`: match ring, "Posted 3h ago," trust badge, company logo via Clearbit logo API fallback.

Exit criteria: screenshot-level parity with JobRight.ai dashboard and job detail.

### Phase 2 — ATS breadth & one-click apply (Weeks 3–5)

Goal: real auto-apply across the top 5 ATSs.

1. **ATS adapter layer.** Create `backend/services/ats/`:
   - `greenhouse.js` (exists — move here)
   - `lever.js`, `ashby.js`, `workable.js`, `icims.js`, `workday.js` each exporting `{ detect(url|html), prefill(profile, jd), submit(session) }`
   - Factory in `hybridApply.js` replaces current inline switch.
2. **Chrome extension** (`/extension` folder):
   - Content script that calls `detect()` on the active tab and pings backend for filled values.
   - Uses same JWT the webapp already stores; no second login.
3. **Rate limiter per ATS** — already exists in `rateLimiter.js`; just extend `ATS_LIMITS` table with new entries.
4. **`SmartApplyModal.jsx`** becomes a two-step flow: **preview** (show filled fields, diff to profile) → **apply** (single button, tracked in `applications`).

Exit criteria: apply to a real Lever + Ashby + Greenhouse job end-to-end without re-typing anything.

### Phase 3 — Aggregation depth (Weeks 6–7)

Goal: make "Jobs" tab dense and credible.

1. **New source adapters** in `backend/services/sources/`:
   - `careerjet.js` (keys already in `.env`)
   - `greenhouse_boards.js` — hits `boards-api.greenhouse.io/v1/boards/{slug}/jobs` for ~2k curated companies
   - `lever_boards.js` — hits `api.lever.co/v0/postings/{slug}`
   - `remoteok.js`, `hnjobs.js` for coverage
2. **Canonical de-dup.** Add migration for `jobs.canonical_id TEXT` (sha1 of normalized `title|company|location`). Upsert on ingest.
3. **Ingest worker** (`backend/workers/ingest.js`) run via Render cron every 2h.
4. **Saved searches** — new `saved_searches` table, nightly cron emits matching alerts through `mailer.js`.

### Phase 4 — AI coach & differentiators (Weeks 8–10)

1. Promote `Copilot.jsx` to a persistent side drawer with tool-use (give Gemini/Claude the tools listed in 2.5 above).
2. Nudge engine: read `agent_activity_log` → if no `apply` event in 72h, trigger in-app + email nudge.
3. Interview prep page: seed a question bank by role family (`SWE/DS/PM/Design`), Gemini generates follow-ups live.
4. Salary prediction widget on `JobView.jsx`: median from internal `jobs` data, fallback to Levels.fyi scraped public table.

### Phase 5 — Polish & growth (Weeks 11+)

1. Insider connections (LinkedIn / alumni networks — gated by API access / ToS).
2. Mobile PWA of the dashboard.
3. Team / recruiter-side product (out of parity scope).

---

## 4. Implementation specs (the parts worth spelling out)

### 4.1 Match breakdown payload

Change `backend/matchScore.js` to return a richer object so the UI has everything it needs:

```js
// backend/matchScore.js
module.exports.computeMatch = function (profile, job) {
  // ...existing weighted calc...
  return {
    score: 0..100,
    breakdown: {
      skills:    { score, matched: [...], missing: [...] },
      experience:{ score, years_required, years_have },
      education: { score, required, have },
      visa:      { score, required, have, sponsor_history },
      keywords:  { score, matched: [...], missing: [...] }
    },
    strengths:  [ "Strong React + TypeScript match", "3+ yrs exp aligns" ],
    weaknesses: [ "No Kubernetes", "GraphQL not on resume" ],
    confidence: "high" | "medium" | "low"
  };
};
```

Frontend `MatchBreakdown.jsx` consumes `breakdown` for the radar and `strengths`/`weaknesses` for the chip rows.

### 4.2 Resume tailor pipeline

```
/api/resume/tailor/:jobId  (POST, auth)
  1. Load base resume version (is_default = 1 for user)
  2. Load job.description + extracted keywords
  3. Gemini prompt: "Rewrite bullets emphasizing X, Y, Z competencies. Keep truthful. Flag any fabrications."
  4. computeAtsScore(rewritten, jd)
  5. Persist as new row in resume_versions (parent_version_id = base.id, job_id = :jobId)
  6. Return { original, rewritten, diff: [{path, before, after, reason}], ats_score }
```

Frontend: `ResumeDiffView.jsx` renders diff; each change has ✅/❌. Accepted changes are merged client-side and saved with `PUT /api/resume/version/:id`.

### 4.3 ATS adapter interface

```js
// backend/services/ats/_base.js
module.exports = {
  name: 'ats-slug',
  detect: async ({ url, html }) => boolean,
  prefill: async ({ profile, resumeText, jd }) => ({ fields: {...}, files: [...] }),
  submit:  async ({ session, prefilled }) => ({ status, confirmation_id, raw })
};
```

Tier 3 (auto-submit) is only attempted when:
- rate-limiter OK
- user has `autoApplyEnabled = true` on profile
- adapter confidence score >= 0.85

Everything else falls back to Tier 2 (prefill only, user clicks submit in extension).

### 4.4 Chrome extension skeleton

```
/extension
  manifest.json         (MV3, host_permissions for top ATSs)
  background.js         (session bridge to backend)
  content/
    greenhouse.js
    lever.js
    workday.js          (shadow DOM — needs special handling)
    ashby.js
    icims.js
    workable.js
  popup.html            (status + login link)
```

The extension reuses the JWT in `localStorage` via a `chrome.storage` sync when the user visits the gradlaunch dashboard (custom event bridge).

### 4.5 Canonical de-dup migration

```sql
-- backend/migrations/0XX_jobs_canonical_id.sql
ALTER TABLE jobs ADD COLUMN canonical_id TEXT;
CREATE INDEX idx_jobs_canonical ON jobs(canonical_id);
CREATE UNIQUE INDEX idx_jobs_canonical_source
  ON jobs(canonical_id, source);
```

Hash function (in `backend/services/sources/_normalize.js`):
```js
const crypto = require('crypto');
module.exports.canonicalId = (title, company, location) =>
  crypto.createHash('sha1')
    .update(`${title}|${company}|${location}`.toLowerCase().replace(/\s+/g, ' ').trim())
    .digest('hex');
```

---

## 5. Risks & open questions

1. **LinkedIn / Indeed scraping ToS.** JobRight.ai's "90% ATS coverage" is almost certainly driven by their extension, not server-side scraping. Your safest path is the same: extension-first, backend aggregation only from consenting APIs (Adzuna, Careerjet, Greenhouse/Lever public boards).
2. **Auto-submit liability.** If a Tier 3 auto-apply sends a wrong field, the user blames you. Default `autoApplyEnabled = false` and require explicit per-application toggle until confidence > 0.85.
3. **Gemini cost.** Resume tailoring is the heaviest call. Cache by `(resume_hash, job_hash)` — you already have `ai_generations` audit log; promote that to a real cache table.
4. **Visa data staleness.** `visaIntelligence.js` caches USCIS data for 5 min; fine for reads, but back-fill real data via `h1bdata.info` or USCIS disclosure CSVs on a quarterly cron.
5. **Background jobs on Render free tier.** Re-scoring and ingest workers will sleep. Either upgrade tier or run a lightweight GitHub Actions cron that `curl`s a protected endpoint.

---

## 6. First week of work (concrete checklist)

If I were opening a PR tomorrow, the order is:

1. `backend/matchScore.js` → return the richer `{breakdown, strengths, weaknesses}` object.
2. `frontend/src/components/MatchBreakdown.jsx` → new component, use `recharts` RadarChart.
3. Wire `MatchBreakdown` into `JobView.jsx` and `JobIntelligenceCard.jsx` (compact variant).
4. `backend/services/resumeTailor.js` → new module extracting the Gemini pipeline out of `server.js` (which is 108KB — this needs decomposition anyway).
5. `POST /api/resume/tailor/:jobId` route in `server.js` delegating to the new module.
6. `frontend/src/components/ResumeDiffView.jsx` using a simple line-diff (`diff` npm package).
7. Add salary slider + recency chips in `JobSearch.jsx`; the query params are plumbed already.

That gets you a demo that looks and feels like JobRight.ai inside 2 weeks. Phase 2 onwards is where it starts to *behave* like JobRight.ai.

---

## Sources

- [Jobright: Your AI Job Search Copilot](https://jobright.ai)
- [Jobright AI Review 2026 — ResumeHog](https://resumehog.com/blog/posts/jobright-ai-review-2026-is-this-job-search-copilot-worth-it.html)
- [Jobright AI Review 2026 — JobHire](https://jobhire.ai/blog/jobright-ai-review-and-decision-guide-2026)
- [Jobright Autofill (Chrome Web Store)](https://chromewebstore.google.com/detail/jobright-autofill-%E2%80%93-insta/odcnpipkhjegpefkfplmedhmkmmhmoko)
- [Jobright Resume Tailor](https://jobright.ai/tools/resume-tailor)
