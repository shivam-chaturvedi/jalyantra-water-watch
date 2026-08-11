# JalYantra Water Watch — Project Context

> Living context file. The **Architecture Overview** below is a stable reference; the **Current State / Session Log**
> at the bottom is updated after every prompt so a new session can pick up exactly where the last one left off.
> Treat this file as a snapshot to verify against the actual code, not as ground truth on its own.

## 1. What this project is

A dashboard + marketing site for **JalYantra**, an IoT groundwater-level monitoring system deployed across
Maharashtra. Field devices measure water depth in wells/borewells and push readings to Firebase; the app shows
live/historical depth trends, pump run detection, drawdown analysis, district-level stats, and alerts. There's also
a `/admin` panel for managing site content, media, deployments, device metadata, and for syncing Firebase data into
a Supabase analytics schema.

## 2. Tech stack

- **Build/framework**: Vite + React 18 + TypeScript, `react-router-dom` v6
- **UI**: Tailwind CSS + shadcn/radix component library (`src/components/ui/*`), `lucide-react` icons, `recharts` for charts, `react-leaflet`/Leaflet for the map
- **State/data**: `@tanstack/react-query`, no global store beyond React context (`AuthContext`)
- **Realtime sensor data**: **Firebase Realtime Database** (client SDK, `firebase/database`) — this is the primary live data source for the dashboard
- **Backend/admin data**: **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions) — used for admin auth, site content/CMS, media uploads, deployments pages, device master metadata, and a derived analytics schema (tables A–J)
- **Mailer**: separate small Node/Express + Nodemailer service in `mailer/` (deployed as Vercel serverless function `mailer/api`) for contact-form emails
- **Testing**: Vitest + Testing Library (`src/test/`, `vitest.config.ts`) — currently minimal (`example.test.ts`)
- **Package manager**: repo has both `bun.lockb` and `package-lock.json`; scripts are run via npm (`npm run dev`, etc.) per README

## 3. Routes (`src/App.tsx`)

| Path | Page | Notes |
|---|---|---|
| `/` | `Home.tsx` | Marketing landing page, CMS-driven sections (hero, insights, dashboard teaser, deployments teaser, validation, contact) |
| `/dashboard` | `Index.tsx` | Main groundwater monitoring dashboard (map, KPIs, alerts, district panel) |
| `/deployments` | `Deployments.tsx` | List of field deployments |
| `/deployments/:slug` | `DeploymentDetail.tsx` | Single deployment detail page |
| `/partners` | `Partners.tsx` | Partners/NGO page |
| `/login` | `Login.tsx` | Supabase email/password auth, admin-only |
| `/admin` | `Admin.tsx` | Protected via `ProtectedRoute` + `AuthContext.isAdmin`; CMS + data ops console |
| `*` | `NotFound.tsx` | |

## 4. Data flow

### Dashboard (live sensor data) — Firebase-first

1. `useGroundwaterData` (src/hooks/useGroundwaterData.ts) reads `readings/` and `devices/` from Firebase RTDB (paths configurable via `VITE_FIREBASE_READINGS_PATH` / `VITE_FIREBASE_DEVICES_PATH`), does an initial `get()` then subscribes with `onValue()` for realtime updates.
2. Raw RTDB JSON → `transformFirebaseReadings()` (src/lib/data.ts) flattens nested per-device reading batches into `SensorReading[]` with a `history: SensorHistoryPoint[]`. Handles: unsynced device clocks (`collectedDate: "UNSYNCED"`, `collectedDateTime: "uptime:Ns"`), timestamp resolution priority (`collectedDateTime` → `collectedDate` → RTDB child key if it's a unix timestamp → `timestamp` field), depth plausibility filtering (0–60m), sudden-jump anomaly flags, and merging multiple RTDB batches that map to the same `deviceId`.
3. `mergeReadingsWithDeviceRegistry()` adds devices that are registered under `devices/{id}/meta` but have no readings yet (shown as offline).
4. Supabase `device_master_data` (fetched via `fetchAllDeviceMasterData()`) is merged in client-side to set `isPumpConnected` per device — this flag decides whether a device gets the pump-run/drawdown chart treatment or the non-pump daily-median-depth treatment.
5. Derived views: `calculateDistrictStats`, `generateAlerts`, `calculateKPIStats` (all in `src/lib/data.ts`).
6. Pump-specific analytics (drawdown charts, run segmentation, 24h/48h rolling windows, daily median for non-pump devices) live in `src/lib/pumpEvents.ts`.
7. `useLiveDevices` is a lighter Firebase-only hook used in Admin for device settings (no district/alert computation).

**Timezone note**: all display formatting throughout `data.ts`/`pumpEvents.ts` explicitly uses `timeZone: 'Asia/Kolkata'` — this was a deliberate fix (see commit `d58fcd3`) since devices and users are IST but browsers/servers may not be.

### Admin CMS — Supabase

- `AuthContext` (src/contexts/AuthContext.tsx): Supabase auth; on login/session-restore it checks `profiles.is_admin` and force-signs-out non-admins.
- `src/lib/siteAdmin.ts`: all Supabase reads/writes for CMS concerns — `site_flags` (feature toggles: `show_deployments`, `show_validation`, `show_image_carousel`), `app_pages` (per-page enable/disable + nav ordering), `media_assets` + Storage buckets (`site-media`, `deployments-media`, `partners-media`), `site_content` (JSON blob per page key, e.g. `home`), `deployments` (slug/title/JSON data), and `device_master_data` (per-device well depth/diameter/pump-intake/pump-diameter/`is_pump_connected`/notes — the authoritative override for values Firebase's `meta` may also send).
- `src/lib/contentDefaults.ts`: fallback copy/placeholders merged with whatever `site_content` has, so pages render sensibly even with an empty CMS.
- Home page data-flow specifics are documented separately in `docs/home-deployments-section.md` (written by a previous contributor — note it references an old local path `/Users/shivamchaturvedi/...`, safe to ignore, the described data flow is still accurate).

### Analytics schema (tables A–J) — Supabase, fed two ways

Defined in `supabase/migrations/20260721000000_schema_and_metrics.sql`:

- **A. Master data**: `location_master`, `partner_master`, `well_master`, `device_master`, `device_assignment_history`, `audit_logs` (soft-delete + field-level audit trigger `fn_capture_master_audit_log`)
- **B. `raw_sensor_data`**: append-only (RLS: INSERT only, no UPDATE/DELETE), one row per depth reading
- **C. `pump_run_summary`**: one row per detected pump run (start/stop time, depths, drawdown, extraction liters, first/last-of-day flags)
- **D. `daily_well_summary`**: per well/day — median depth, runtime, run count, extraction, remaining depth/volume, estimated days remaining, recovery
- **E. `weekly_monthly_well_summary`**: 7/30-day depth change, extraction rollups
- **F. `daily_well_health_summary`**: Green/Amber/Red health status, safety buffer, dry-run risk, safe-pump-operation flags
- **G/H. District daily / weekly-monthly summaries**
- **I/J. `alert_definitions`** (static, seeded) **/ `alert_logs`** (triggered instances, e.g. `LOW_WATER_LEVEL`, `DRY_RUN_RISK`, `UNSAFE_PUMP_OPERATION`, `POOR_RECOVERY`)

Two separate implementations populate this schema from Firebase RTDB, and they are **not** currently kept in sync with each other:

1. **`supabase/functions/sync-rtdb-to-supabase/index.ts`** — a Deno Edge Function. Uses hardcoded/simplistic defaults (well depth 20.0m, diameter 1.5m for every well, district guessed from lat/long bounding boxes, fixed extraction-rate constant `500.0 L` for "days remaining", no real pump-run detection — just per-day median depth). Looks like an earlier/simpler pass predating the admin-side sync logic.
2. **`MasterTablesSection` inside `src/pages/Admin.tsx`** (starts ~line 3086, the sync button/section in the admin UI) — the actively-developed path per recent commit history. This one:
   - Preserves already-set `well_master` depth/diameter values in Supabase over freshly-derived Firebase `meta` values (so a manual correction in Supabase isn't clobbered by a later sync) — see §7 current diff.
   - Does real pump-run detection from raw depth readings (rather than a flat estimate) and inserts into `pump_run_summary` additively (never deletes/overwrites existing runs).
   - Dedupes against existing `raw_sensor_data` rows before bulk insert to avoid 409 conflicts.
   - Computes daily/weekly/monthly well & district summaries and alert logs from the real pump-run data, not fabricated placeholders.

When working on analytics/sync logic, **the client-side `MasterTablesSection` in `Admin.tsx` is the source of truth**, not the edge function — confirm with the user before assuming they should be reconciled or before editing the edge function to "match" admin behavior.

## 5. Key files reference

| File | Purpose |
|---|---|
| `src/lib/data.ts` (974 lines) | Firebase reading parsing/transform, district/KPI/alert calculation, depth risk levels, district geo lookup (hardcoded Maharashtra district centers) |
| `src/lib/pumpEvents.ts` (675 lines) | Pump-run segmentation, drawdown chart data prep (smoothing, plateau trimming, Y-axis domain/ticks), 24h/48h/daily-median summaries |
| `src/lib/siteAdmin.ts` | All Supabase CMS/media/device-master CRUD helpers |
| `src/lib/contentDefaults.ts` (534 lines) | Default/fallback copy for CMS-driven pages |
| `src/pages/Admin.tsx` (**3916 lines** — largest file by far) | Single mega-component: CMS editors for Home content, deployments (`DeploymentEditor`, `NewDeploymentForm`), media library, device master settings (`DeviceMasterSection`), and the Firebase→Supabase sync console (`MasterTablesSection`). Candidate for splitting if it grows further. |
| `src/hooks/useGroundwaterData.ts` / `useLiveDevices.ts` | Firebase RTDB data hooks |
| `src/contexts/AuthContext.tsx` | Supabase auth + admin-gate |
| `supabase/migrations/` | SQL migration history (mix of dated `202607...` files and older undated numbered files — see below) |
| `src/migrations/` | An **older/parallel** set of numbered SQL migrations (001–012), predates `supabase/migrations/`. Both exist in the repo; check which one matches the live Supabase project before writing new migrations. |
| `docs/home-deployments-section.md` | Deep-dive note on Home page's deployments teaser section, written by a prior contributor |

## 6. Environment variables (see `.env`, values not reproduced here)

Firebase: `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DEVICES_PATH`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_PROJECT_ID`, `FIREBASE_READINGS_PATH`, `FIREBASE_RTDB_URL`, `FIREBASE_STORAGE_BUCKET` (client code actually reads the `VITE_`-prefixed versions per README — worth double-checking `.env` has both prefixed and unprefixed as needed by Vite vs the Edge Function's Deno runtime).
Supabase: `MY_SUPABASE_ANON_KEY`, `MY_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`.
Feature flags: `VITE_SHOW_DEPLOYMENTS`, `VITE_SHOW_IMAGE_CAROUSEL`, `VITE_SHOW_VALIDATION` (mirrors of the `site_flags` table for build-time/static fallback).

## 7. Current state / session log

_Most recent entry first._

### 2026-08-08 — Initial context gathering

- Created this `context.md` after a full repo walkthrough (no code changes made this session).
- **Uncommitted working-tree change** at session start: `src/pages/Admin.tsx` (`MasterTablesSection`, ~lines 3463–3660) — not yet committed. The diff changes lookup precedence so that **existing Supabase `well_master` values win over Firebase `meta` values** when both are present, for:
  - `wellDepth` / `wellDiameter` in the per-device master upsert (~line 3465)
  - `wellDiameterForRuns` used in pump-run detection's well-area calculation (~line 3589)
  - `wellDiameter` used in the daily-summary well-area calculation (~line 3660)
  
  Previously the code did `meta.wellDepth || ... || existingWellDepthMap.get(wellId) || 20.0` (Firebase meta took priority over what's already stored); now it's `existingWellDepthMap.get(wellId) || meta.wellDepth || ... || 20.0` (Supabase's stored value takes priority, Firebase meta is only a fallback for brand-new wells). This tracks with recent commit history (`fd4b3e2 calculation correction`, `fd53e65 pump run detection...`, `5fdedda fix: use real pump_run_summary data...`) — an ongoing effort to make the sync console's derived metrics trustworthy rather than approximated.
  - **Not yet committed** — ask before committing/staging, per standing git safety rules.
- Recent commit trend (last ~5): fixing pump runtime/extraction calculations to use real elapsed time and real `pump_run_summary` rows instead of fabricated daily estimates, plus IST timezone correctness — this is clearly the active focus area of the project right now (data accuracy in the admin sync pipeline), not new features.