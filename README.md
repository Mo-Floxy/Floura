# 🌸 FLOURA

A complete, private women's health and menstrual cycle tracking application. FLOURA is a full-stack product with secure accounts, a real SQLite database, personalised cycle predictions, an interactive calendar, symptom and mood journals, wellness tracking, analytics, reports, reminders, educational content and privacy-first settings.

## Quick start

```bash
npm install          # install server + client dependencies
npm run dev          # API on :3001 and web app on :5173
```

Open **http://localhost:5173**, create an account and start tracking.

Because no SMTP server is configured by default, email verification and password-reset tokens are returned in the API response and displayed in the app during local development. Set the SMTP variables in `.env` (see `.env.example`) to send real emails.

### Production

```bash
cp .env.example .env   # configure secrets, SMTP and CLIENT_URL
npm run build          # build the React client into client/dist
npm start              # serves the built app and API together on PORT
```

## What's included

| Area | Features |
| --- | --- |
| **Authentication** | Sign up, sign in/out, email verification, forgot/reset password, bcrypt hashing, httpOnly JWT cookies, persistent sessions, rate limiting, account deletion |
| **Dashboard** | Cycle day, personal phase, countdown, circular progress, fertility estimates, daily tip, quick symptom/mood/water logging |
| **Calendar** | Month navigation, period start/end editing, predictions, fertile days, ovulation, today marker, per-day notes and records |
| **Predictions** | Cycle length and duration derived from the user's own history (never a fixed 28-day rule), regularity, shortest/longest cycles, confidence, 6 future cycles — always labelled as estimates |
| **Symptoms** | 11 common symptoms + custom ones, mild/moderate/severe, per-symptom notes, history and frequency charts |
| **Moods** | 9 moods, multiple per day, notes, 12-week heatmap and distribution charts |
| **Wellness** | Water goal and tracking, sleep duration/quality, exercise types and duration, nutrition notes and cravings |
| **Insights** | Weekly/monthly/yearly/all-time analytics, interactive charts, period history table, PDF export |
| **Learn** | Nine medically-grounded, plain-language articles with search and categories |
| **Reminders** | Six independently toggleable reminders, timing and days-before controls, discreet-by-default in-app notifications, optional browser notifications |
| **Settings** | Profile, cycle preferences, theme (light/dark/system), privacy controls, password change, JSON data export, verified account deletion |

## Architecture

```
server/
  src/
    index.js           Express app, security middleware, route mounting, static production hosting
    db.js              SQLite schema and migrations
    middleware.js      Auth, validation and error helpers
    routes/            auth, cycles, logs, insights, user, reminders
    utils/             date helpers, prediction engine, mail, (PDF in insights route)
  data/                SQLite database and generated JWT secret (git-ignored)
  test/                Automated end-to-end API journey
client/
  src/
    api.ts             Typed fetch wrapper
    context/           Auth, theme and toast providers
    components/        Layout, sidebar, topbar, shared UI components
    pages/             All application screens
    content/           Educational articles
    styles.css         Design system, light/dark themes, responsive layouts
```

All data endpoints are scoped to the authenticated user. Health records are never exposed through public APIs. By default notifications use discreet wording; sensitive details require explicit opt-in.

## Tests

```bash
npm test
```

This starts an isolated API with a temporary database and runs a 29-check journey covering registration, verification, cycle calculations, daily logs, analytics, PDF export, reminders, privacy isolation, export, password change and account deletion.

## Design notes

- Palette: soft lavender, dusty rose, blush, plum and cream.
- Typography: Playfair Display headings with DM Sans body text.
- Responsive sidebar/bottom-navigation layout, light and dark themes, reduced-motion support.
- Charts use Recharts; icons use Lucide; persistence uses better-sqlite3 with WAL mode and foreign keys.

## Medical disclaimer

FLOURA is a wellness and self-tracking tool. Predictions are estimates derived from recorded dates and are **not medical advice, diagnosis, contraception, or a substitute for professional care**.
