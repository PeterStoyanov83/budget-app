# HANDOFF — Моят Бюджет

_Last updated: 2026-06-11_

## What this is
Bulgarian-language PWA personal budget tracker built for a pensioner.
Multi-account (each user has isolated data). Dark theme. Mobile-first (max 480px).

## Repo
https://github.com/PeterStoyanov83/budget-app  
Branch: `main` — 4 commits total

## Current stack
- **Frontend**: Vanilla HTML/CSS/JS — `public/index.html` (single file, ~760 lines, no framework)
- **Backend**: Node.js + Express — `server.js`
- **Database**: SQLite via `better-sqlite3` — `data/budget.db` (gitignored, created at runtime)
- **Auth**: `express-session` + `connect-sqlite3` + `bcryptjs` — sessions in `data/sessions.db`
- **Deploy target**: Render.com — `render.yaml` in root (persistent disk at `/data`, 1GB)

## File structure
```
server.js           Express API — register/login/logout/me + data GET/PUT
package.json        prod deps: express, express-session, connect-sqlite3, better-sqlite3, bcryptjs
render.yaml         one-click Render.com deploy (auto-detected)
HANDOFF.md          this file
public/
  index.html        full SPA — auth screen + 3 tabs (Бюджет / История / Съвети)
  sw.js             service worker, cache-first, skips /api/ routes
  manifest.json     PWA manifest — name "Моят Бюджет", theme #c8a84b
  icons/
    icon-192.png    generated — dark bg + gold € symbol
    icon-512.png    generated
generate-icons.js   build script — needs: npm install canvas; run: npm run icons
data/               gitignored — SQLite files live here at runtime
```

## API routes
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/register | — | create account (min 2-char user, 4-char pass), sets 30-day session |
| POST | /api/login | — | sets session |
| POST | /api/logout | ✓ | destroys session |
| GET | /api/me | — | returns `{userId, username}` or 401 |
| GET | /api/data | ✓ | returns user's full allData JSON |
| PUT | /api/data | ✓ | overwrites user's full allData JSON |

## Data model
```json
{
  "2026_5": {
    "income": 800,
    "expenses": [
      { "id":"e1", "cat":"fixed", "icon":"⚡", "name":"Ток, вода, телефон, ТВ", "amount":150, "note":"Всеки месец", "enabled":true }
    ],
    "notes": "бележки..."
  }
}
```
- Month key: `{year}_{month}` — month is **0-indexed** (June 2026 = `"2026_5"`)
- 12 default expense rows across 5 categories: `fixed / health / family / food / other`
- Custom expenses added by user get id `"custom_{timestamp}"`, cat `"other"`, icon `💸`

## Auth / UX flow
1. App loads → spinner → calls `GET /api/me`
2. Session valid → show app, render current month
3. No session → show full-screen auth (two tabs: **Вход** / **Регистрация**)
4. After login/register → `GET /api/data` → render budget tab
5. Header: `💶 Моят Бюджет` · `👤 username` · `✓ Запазено` flash · `Изход` button
6. Every input change → debounce 1200ms → `PUT /api/data` → flash "✓ Запазено"
7. Logout → clears state, shows auth screen again

## Design tokens
```
--bg: #0e0e0e   --surface: #171717   --card: #1f1f1f   --border: #2a2a2a
--text: #e8e4dc  --muted: #888888    --accent: #c8a84b  --accent-dim: #7a6228
--green: #4caf7d --red: #e06060      --warn: #e0a040
```
Balance colours: green (>80 €) · amber (0–80 €) · red (negative)
Status bar text: 🌟 Отличен (>120) · ✅ Балансиран (80-120) · ⚠️ Много стегнат (0-80) · 🚨 Дефицит

## Deploy to Render (not yet done — pending)
1. Go to **render.com** → New Web Service
2. Connect GitHub repo `PeterStoyanov83/budget-app`
3. Render reads `render.yaml` → auto-configures Node, 1GB disk, generates `SESSION_SECRET`
4. Click **Deploy** → URL like `https://budget-app.onrender.com`
5. Pensioner visits URL, clicks Регистрация, enters name + password, done

## Session history — what was tried and why
| Version | Approach | Outcome |
|---------|----------|---------|
| v1 | Static PWA + GitHub Gist as storage | Rejected — GitHub token setup too complex for pensioner |
| v1.5 | Static on GitHub Pages | Used briefly, then dropped when backend was needed |
| v2 (current) | Express + SQLite + Bulgarian login/register | ✓ Simple URL + username + password |

## Known issues / next steps
- Render free tier sleeps after 15min inactivity → ~30s cold start on first visit. Consider paid tier or Railway if annoying.
- No password reset (forgotten password = ask the person who set it up to reset in DB)
- No admin panel to list/manage users
- No export button (was in v1 settings; removed in v2 — could re-add under Изход menu)
- `package-lock.json` is gitignored — intentional, Render runs `npm install` fresh
- `SESSION_SECRET` falls back to a hardcoded Bulgarian string if env var missing — fine for dev only
