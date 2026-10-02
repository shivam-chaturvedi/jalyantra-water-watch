# Survey Feature — High-Level Design (Review Draft)


---

## 1. How this fits the existing architecture

Two data sources already coexist in this app and the Survey feature should follow the same split rather than invent a third pattern:

- **Firebase Realtime Database** — live, continuous readings from permanently-installed sensors (`src/hooks/useGroundwaterData.ts`). This is *not* where survey data belongs — portable-device survey visits are periodic, not continuous streams.
- **Supabase (Postgres)** — structured/relational data: `location_master`, `partner_master`, `well_master`, `device_master`, `raw_sensor_data`, plus daily/weekly summary tables (see `supabase/migrations/20260721000000_schema_and_metrics.sql`). Survey data is relational by nature (a survey has many wells, a well has many readings across surveys) — it belongs here.

Critically, **`well_master` already exists** (`well_id`, `location_id`, `partner_id`, `well_name`, `well_depth_meters`, `well_diameter_meters`, `pump_attached`, `pump_type`, `pump_intake_level_meters`, `status`) and **`location_master`** already carries `village_city`/`taluka`/`district`/`state`/`latitude`/`longitude`. The Survey feature should **reuse `well_master`/`location_master` as the well registry**, not create a duplicate "wells" table. Survey tables should reference `well_master.well_id` by foreign key. If a surveyor visits a well that doesn't exist yet in `well_master`, the survey entry workflow creates a `well_master` row for it (upsert-on-survey), the same way `sync-rtdb-to-supabase` populates these tables today for fixed devices.

The existing **`device_master`/`device_assignment_history`** tables already model "a device moving between wells over time" (`device_assignment_history`: `well_id`, `device_id`, `start_date`, `end_date`, `status`). A portable JalYantra survey device is conceptually the same shape. Recommendation: register portable devices as normal rows in `device_master` with a new `device_type` column (`fixed` | `portable`) so the existing device registry stays the single source of truth for "what devices exist," rather than creating a parallel device table.

The existing merge pattern in `useGroundwaterData.ts` (`fetchVillageMapping()`, lines 182–225: three chained Supabase `.select()` calls stitched client-side into a `Map<deviceId, village>`, merged onto Firebase data with a soft fallback) is the template for how survey data should be pulled onto the dashboard: a separate Supabase fetch, keyed by `wellId`, merged onto whatever the map is already rendering — never blocking the live Firebase path if Supabase is slow/down.

---

## 2. New Supabase tables

Following the existing ID convention (`LOC-XXXXXXXX`, `WEL-XXXXXXXX`, `DEV-XXXXXXXX` — see `location_master`/`well_master`/`device_master`), new tables would live under `supabase/migrations/` with a `2026...` timestamp filename, alongside the existing Tables A–J.

**The runnable SQL is split into two migrations, deliberately staged so the new tables land independently before anything touches existing live tables:**
1. [`supabase/migrations/20260925000000_survey_tables.sql`](../supabase/migrations/20260925000000_survey_tables.sql) — creates `survey_master`, `survey_well`, `survey_reading` only. References `well_master.well_id`/`device_master.device_id` as they already exist today; doesn't alter either table.
2. [`supabase/migrations/20260925010000_survey_related_columns.sql`](../supabase/migrations/20260925010000_survey_related_columns.sql) — the `well_master`/`device_master` column additions from §2.4 (well type, per-well GPS, portable device identity). Run this once the new tables are confirmed working.

Neither is applied to your Supabase project yet — review first, then run via `supabase db push` (CLI) or the Supabase SQL editor, migration 1 before migration 2.

### 2.1 `survey_master`
One row per survey campaign (e.g. "Pre-Monsoon Survey 2027").

| Column | Type | Notes |
|---|---|---|
| `survey_id` | TEXT PK | `SUR-XXXXXXXX`, generated like other master tables |
| `survey_name` | TEXT | e.g. "Pre-Monsoon Survey 2027" |
| `survey_type` | TEXT | `seasonal` \| `quarterly` \| `half_yearly` \| `annual` |
| `season` | TEXT, nullable | `pre_monsoon` \| `post_monsoon` \| `summer` \| `winter` |
| `survey_year` | INTEGER | |
| `organization_name` | TEXT | e.g. "Krushivikas" |
| `project_name` | TEXT, nullable | |
| `planned_start_date` | DATE | |
| `planned_end_date` | DATE | |
| `actual_start_date` | DATE, nullable | |
| `actual_end_date` | DATE, nullable | |
| `device_id` | TEXT, FK → `device_master.device_id`, nullable | portable JalYantra device used |
| `surveyor_name` | TEXT | |
| `surveyor_contact` | TEXT, nullable | phone/email |
| `status` | TEXT | `planned` \| `in_progress` \| `completed` \| `cancelled` |
| `notes` | TEXT, nullable | |
| `created_at` / `updated_at` | TIMESTAMPTZ | standard, matches other master tables |

### 2.2 `survey_well`
Junction table: which wells are/were part of a survey, and per-well survey status (lets the UI show "12 of 40 wells surveyed" progress for an in-progress survey).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `survey_id` | TEXT, FK → `survey_master.survey_id` | |
| `well_id` | TEXT, FK → `well_master.well_id` | |
| `well_status` | TEXT | `pending` \| `surveyed` \| `skipped` |
| `surveyed_at` | TIMESTAMPTZ, nullable | when this well's reading was actually taken |
| `created_at` | TIMESTAMPTZ | |

Unique constraint on `(survey_id, well_id)`.

### 2.3 `survey_reading`
The actual depth measurement(s) captured per well per survey — the fact table. **Confirmed: up to 3 readings are taken per well per visit** (repeat measurements to catch manual positioning/holding error), so this is *not* one row per well per survey — it's one row per reading attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `survey_id` | TEXT, FK → `survey_master.survey_id` | |
| `well_id` | TEXT, FK → `well_master.well_id` | |
| `device_id` | TEXT, FK → `device_master.device_id` | portable device that took the reading |
| `depth_meters` | NUMERIC(8,3) | depth to water measured on this attempt — **not** the same as `well_master.well_depth_meters` (the well's static bore/casing depth); see note below |
| `reading_sequence` | SMALLINT, nullable | 1/2/3 — which of the repeat QA readings this is, if the device/app reports it |
| `reading_date` | DATE | (GENERATED from timestamp, matching `raw_sensor_data` pattern) |
| `reading_timestamp` | TIMESTAMPTZ | when the measurement was actually taken in the field (may be well before `created_at` if the device was offline — see §8) |
| `latitude` / `longitude` | NUMERIC, nullable | captured GPS at time of reading, useful if `well_master` doesn't yet have coordinates for that well |
| `surveyor_notes` | TEXT, nullable | |
| `created_at` | TIMESTAMPTZ | when this row was synced into Supabase — distinct from `reading_timestamp` |

Unique constraint on `(well_id, device_id, reading_timestamp)` — this isn't a "one reading per well" rule, it just stops the same reading being double-counted if "Fetch & Populate" re-syncs Firebase data the device only uploaded after regaining connectivity (see §8). The 3 QA readings naturally get 3 different timestamps, so all 3 are kept.

**Well depth vs. survey depth — don't conflate these two, they mean different things:**
- `well_master.well_depth_meters` = the physical depth of the bore/casing (a static characteristic of the well, set once, rarely changes).
- `survey_reading.depth_meters` = the measured depth-to-water-table on a given visit (what changes over time — this is what a survey exists to track), exactly analogous to how `raw_sensor_data.depth_meters` already works for fixed devices.
- The "official" water depth for a well within a survey = **median of that well's `survey_reading` rows for that `survey_id`**, computed at query/report time (e.g. `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY depth_meters)`), not stored as a separate redundant column — avoids a second place that can go stale.

### 2.4 Modifications to existing tables (not new tables, but needed for the popup fields requested)

| Table | Change | Why |
|---|---|---|
| `well_master` | add `well_type` TEXT (nullable) | requested in the popup ("Well type") — no equivalent column exists today |
| `well_master` | add `latitude`/`longitude` NUMERIC (nullable) | popup requests per-well GPS; today only `location_master` has coordinates, which is village-level, not well-level. Backfill opportunistically from `survey_reading.latitude/longitude` the first time a well is surveyed |
| `device_master` | add `device_type` TEXT DEFAULT `'fixed'` (`fixed` \| `portable`) | distinguishes permanently-installed sensors from the portable survey device(s) for map rendering and admin filtering |
| `device_master` | add `partner_id` TEXT, FK → `partner_master`, nullable | **confirmed: each NGO owns 2-3 portable devices** (a survey uses at most 2, usually 1 + a spare). A fixed device's "owner" is implicit via `well_id → well_master.partner_id`; a portable device isn't tied to one well, so it needs its own NGO ownership link |
| `device_master` | add `portable_device_code` TEXT, unique, nullable | human-friendly label written on the physical unit (e.g. `PD-01`), distinct from the generated `DEV-XXXXXXXX` id — this is the `portable_device_id` you asked about; `device_master.device_id` is the internal key, `portable_device_code` is what surveyors/reports show |

### 2.5 Relationships (text diagram)

```
location_master (existing)
      │ location_id
      ▼
  well_master (existing, extended with well_type, latitude, longitude)
      │ well_id                              │ well_id
      ▼                                       ▼
 survey_well ◄──── survey_id ──── survey_master        survey_reading ──── survey_id ──── survey_master
      (junction: which wells            (survey_reading also carries well_id + device_id directly,
       are in this survey,               so it doesn't have to join through survey_well to answer
       and their status)                 "give me every reading for this well across all surveys")

device_master (existing, extended with device_type: fixed | portable)
      │ device_id
      ▼
survey_master.device_id, survey_reading.device_id
```

RLS: follow the existing pattern on Tables A–J (public `SELECT`, permissive upsert policy) unless the auth/role question in §6.4 is resolved first — if survey data needs to be restricted per-organization, RLS needs to change for these three tables specifically (and possibly `profiles` needs a role beyond the current binary `is_admin`).

---

## 3. UI/UX placement

### 3.1 Two marker types on the dashboard map, not one

Today `GroundwaterMap.tsx` renders one kind of marker: live Firebase-connected sensors, colored by depth risk (`riskColors`, lines 53–58). Survey data introduces a **second, distinct kind of point**: a well that has been surveyed (periodically, via the portable device) but may have **no permanent device attached at all**. Treating these as the same marker type would be misleading (a surveyed-but-unmonitored well is not "live"). Recommendation:

- Keep the existing risk-colored circular markers for live/fixed sensors exactly as-is.
- Add a **second marker layer** for wells that have `survey_reading` history but aren't necessarily live-monitored — a distinct shape (e.g. a square or diamond `divIcon`, parallel to `createLocationIcon`) in a distinct color (e.g. neutral blue/purple, added to the `riskColors`-equivalent map, plus a new legend row).
- A well that is *both* a live sensor *and* has been surveyed (has a permanent JalYantra installed AND was visited by a survey team) just gets the live-sensor marker, with the survey info folded into its existing detail view — no double marker.
- This means the map needs a merged, de-duplicated point list: "live sensors" ∪ "surveyed-only wells," which is a natural extension of the existing `clustered` state in `GroundwaterMap.tsx` (lines 119–129).

### 3.2 The well popup

The spec describes a click-triggered popup with three sections (well info / latest survey info / quick actions). Today, clicking a marker in `GroundwaterMap.tsx` doesn't open a Leaflet popup at all — it fires `onSensorClick`, which opens `SensorDetailModal` (a full modal defined in `src/pages/Index.tsx`'s tree). Recommendation: **don't introduce a third UI paradigm** (small Leaflet `<Popup>`) alongside the existing hover-`Tooltip` + click-`Modal` pattern. Instead:

- For a **live sensor** marker: extend the existing `SensorDetailModal` with a new "Survey" section (Well info fields it doesn't currently show — well type, pump type, diameter, GPS — plus the "Latest survey information" block) when survey data exists for that well.
- For a **surveyed-only well** marker (no live device): open a new, lighter modal — `SurveyWellDetailModal` — built the same way as `SensorDetailModal` structurally, showing exactly the three sections from the spec (Well info / Latest survey info / Quick actions), since there's no live-reading history/chart to show for it.
- "Quick actions → View history" opens a history view scoped to that well's `survey_reading` rows across all surveys (parallel to the existing `SensorHistoryModal` CSV/table pattern, just sourced from `survey_reading` instead of Firebase history).
- "Quick actions → View full survey report" deep-links into the Survey Report flow (§3.3) pre-filtered to that well's most recent survey.

### 3.3 "View/Download Survey Report" — recommend a dedicated page, not a popup

Reasoning:
- The flow itself is multi-step (pick survey → pick format → preview/download) and the output is a data table potentially spanning many wells — this needs real layout room (filters, a preview table, pagination), which a modal/popup makes cramped, especially on mobile.
- The existing "Master & Telemetry" admin section (`MasterTablesSection`, `Admin.tsx` line 3087) already establishes the in-app pattern for a full-page tabular data browser with a time-range selector — a Survey Report section is structurally the same kind of thing, and reusing that pattern keeps the app consistent.
- Recommendation: add a new Admin sidebar section (`SIDEBAR_ITEMS` in `Admin.tsx`, alongside `master-tables`/`devices`) called "Survey Reports," rendering survey selection → format choice → preview/download in-page (not a route change, consistent with how every other admin section works today). If NGO field staff (not just internal admins) need this without full admin access, that's a role/auth question — see §6.4.
- Report generation: there is currently **no PDF or Excel library** in the project (`package.json` has neither `xlsx` nor `jspdf`/`pdfmake` — only the hand-rolled CSV Blob-download in `src/lib/csv.ts`). Excel export would use `xlsx` (SheetJS); PDF export would use `jspdf` + `jspdf-autotable`. Both are new dependencies — flagged, not installed, per "no code yet."

---

## 4. New files (per component)

| File | Purpose |
|---|---|
| `supabase/migrations/20260925000000_survey_tables.sql` | Creates `survey_master`, `survey_well`, `survey_reading`; RLS policies. Doesn't touch existing tables. |
| `supabase/migrations/20260925010000_survey_related_columns.sql` | Follow-up: ALTERs `well_master`/`device_master` per §2.4. Run after the tables migration is confirmed working. |
| `src/lib/surveyData.ts` | Types (`Survey`, `SurveyWell`, `SurveyReading`) + Supabase query helpers (`fetchSurveys`, `fetchSurveyWells`, `fetchSurveyReadingsByWell`, `fetchLatestSurveyByWell`) — the survey-domain equivalent of `src/lib/data.ts`/`src/lib/siteAdmin.ts` |
| `src/hooks/useSurveyWells.ts` | Fetches surveyed-well data from Supabase and shapes it into map-renderable points, following the `fetchVillageMapping()` fail-soft-merge pattern from `useGroundwaterData.ts` |
| `src/components/SurveyWellDetailModal.tsx` | The "surveyed-only well" popup (Well info / Latest survey info / Quick actions), for wells without a live device |
| `src/components/SurveyWellMarkers.tsx` (or inline in `GroundwaterMap.tsx` if small) | The second marker layer (§3.1) — icon factory + rendering for surveyed-only wells |
| `src/components/SurveyHistoryModal.tsx` | "View history" — a well's `survey_reading` rows across surveys, parallel to `SensorHistoryModal.tsx` |
| `src/pages/Admin.tsx` — new section (not a new file; see §5) | "Survey Reports" tab: survey picker → format picker → preview/download |
| `src/components/SurveyReportTable.tsx` | Preview table shown before download, and the on-screen "view" mode of a report |
| `src/lib/surveyReportExport.ts` | Excel (`xlsx`) and PDF (`jspdf`) generation functions, given a chosen survey + report rows |

---

## 5. Existing files that need modification

| File | Change |
|---|---|
| `src/components/GroundwaterMap.tsx` | Add the second marker type/color/icon (§3.1); extend `riskColors`-equivalent + `createLocationIcon` call site (lines 184–187); add legend row (lines 258–280); accept a new prop for surveyed-well points, merged alongside `sensors` |
| `src/hooks/useGroundwaterData.ts` | Either merge survey/well-master fields onto `SensorReading` (well type, latest survey date/depth) so live-sensor markers can show survey info too, or keep it separate and have `Index.tsx` combine `useGroundwaterData()` + `useSurveyWells()` results — recommend the latter, to avoid bloating the already-large live-data hook |
| `src/lib/data.ts` | Extend `SensorReading` (or introduce a lighter `WellPoint` type) with optional survey fields (`lastSurveyedOn`, `lastKnownDepth`, `changeSincePrevious`, `lastSurveyName`, `lastSurveyorName`) so `SensorDetailModal` can render them when present |
| `src/components/SensorDetailModal.tsx` | Add the "Survey" section for live sensors that also have survey history |
| `src/pages/Index.tsx` | Wire in `useSurveyWells()`, pass merged marker data into `GroundwaterMap`, mount `SurveyWellDetailModal`/`SurveyHistoryModal` alongside the existing modals |
| `src/pages/Admin.tsx` | New `SIDEBAR_ITEMS` entry + `AdminSection` union member + conditional-render block for "Survey Reports" (same pattern as `master-tables`) |
| `src/lib/siteAdmin.ts` | If survey CRUD (creating/editing a survey, marking wells surveyed) is admin-managed rather than field-collected some other way, add helper functions here matching the existing `fetchAllDeviceMasterData`/`upsertDeviceMasterData` pattern |
| `package.json` | New dependencies: `xlsx` (Excel export), `jspdf` + `jspdf-autotable` (PDF export) |

---

## 6. Firebase ingestion & offline sync for portable devices

Confirmed: portable-device readings land in **Firebase RTDB**, same infrastructure as fixed devices, not a direct-to-Supabase path. This section covers the JSON contract and the sync mechanism into `survey_reading`.

### 6.1 Which sync pattern to mirror — and which one to avoid

The codebase currently has **two independent Firebase→Supabase sync implementations for fixed devices that have drifted out of sync with each other** (documented in `context.md`): an older Supabase edge function (`supabase/functions/sync-rtdb-to-supabase/index.ts`) and a newer client-side implementation inside the Admin "Fetch & Populate" button (`src/pages/Admin.tsx`, `MasterTablesSection`, click handler starting ~line 3402) that fetches `devices.json`/`readings.json` straight from the browser and upserts into Supabase directly. The Admin.tsx path is the actively-maintained one.

**Recommendation: build exactly one sync path for portable/survey data, following the `Admin.tsx` client-side pattern** (not the edge function) — don't let the survey feature inherit the same two-implementations-diverging problem. Concretely: a new "Fetch & Populate Survey Data" button (or a section of the existing button) that:
1. Fetches a new Firebase RTDB path (proposed: `portable_readings.json`) the same way `devices.json`/`readings.json` are fetched today.
2. Builds a dedupe key per reading (`well_id` + `device_id` + `reading_timestamp`, mirroring the existing `` `${deviceId}_${timestamp}` `` pattern at `Admin.tsx:3761`/edge-function line 396) and checks it against existing `survey_reading` rows before upserting, exactly like the existing `raw_sensor_data` dedupe.
3. Upserts with `onConflict: 'well_id,device_id,reading_timestamp'` (matching the existing `onConflict: 'device_id,timestamp'` idiom used for `raw_sensor_data`).
4. On first sight of a `well_id` that doesn't exist in `well_master` yet, creates it (upsert-on-survey, per §1) using whichever well-identifying fields came in the payload.

### 6.2 Proposed Firebase JSON contract (pending Arbaz's confirmation of what the firmware/companion app actually sends)

To match the existing `FirebaseReadingEntry` field-naming style (`src/lib/data.ts:2-23` — `collectedDateTime`, `depth`, `deviceId`, `lat`, `long`, `siteName`, `uptimeSeconds`, etc.), proposed shape at `portable_readings/{portableDeviceId}/{pushId}`:

```
{
  "surveyId": "SUR-XXXXXXXX",       // which survey campaign this reading belongs to
  "wellId": "WEL-XXXXXXXX",         // existing well, if the surveyor selected one already registered
  "wellName": "...",                // + village/district/well_type/pump fields —
  "village": "...",                 //   needed when the well is NOT yet in well_master,
  "district": "...",                //   so the sync step can create it (see §6.1.4)
  "portableDeviceId": "PD-01",      // matches device_master.portable_device_code
  "depth": 12.4,
  "readingSequence": 1,             // 1/2/3 — which of the repeat QA readings
  "collectedDateTime": "...",       // when actually measured in the field
  "lat": 18.xxxx,
  "long": 73.xxxx,
  "surveyorName": "...",
  "remarks": "..."
}
```

This needs sign-off from whoever owns the field app/firmware (Arbaz, per your note) before it's final — treat the above as a starting proposal to react to, not a spec to build against yet.

### 6.3 Offline capture, sync later — what this means for the schema (already handled)

Devices working in no-signal areas caching readings locally and pushing them once connectivity returns is a **firmware/field-app behavior, not something the backend needs to orchestrate** — but the backend must tolerate readings arriving arbitrarily late without side effects:
- `reading_timestamp` (when the measurement actually happened) and `created_at` (when it landed in Supabase) are already separate columns in `survey_reading` (§2.3) — a large gap between them is expected and fine, not an error.
- The `(well_id, device_id, reading_timestamp)` unique constraint (§2.3) means clicking "Fetch & Populate" repeatedly — including after a batch of previously-offline readings finally appears in Firebase — never creates duplicate rows.
- No "last synced" watermark is needed on the survey side either, consistent with how the existing fixed-device sync works today (it re-pulls a rolling window and dedupes, rather than tracking incremental state).

---

## 7. Open questions — status after your review

1. ~~How does survey data get into the system?~~ **Resolved**: same as fixed devices — Firebase RTDB first, then Admin "Fetch & Populate" syncs into Supabase. Exact firmware/app JSON payload still needs Arbaz's confirmation (§6.2).
2. **Report fields** — you said "will do" (confirm with Krushivikas). Still open; proposed default in §2 stands until you confirm.
3. **Report filters** — not yet answered; still open (single-survey-only vs. also district/date-range filtering for v1).
4. ~~Access control~~ **Resolved: no login required.** Dashboard and downloads stay fully public, same as everything else today — simplifies §2.5's RLS to "keep the same permissive public policy," no new role/auth work needed.
5. ~~Repeat readings within one survey~~ **Resolved: up to 3 per well** (QA against positioning/holding error) — schema updated in §2.3 to allow multiple rows per well per survey, with the median computed at report time as the "official" value.
6. ~~Portable device identity~~ **Resolved: 2-3 devices per NGO, max 2 (usually 1) used per survey.** Schema updated in §2.4 — `device_master.partner_id` (NGO ownership) + `device_master.portable_device_code` (the friendly "PD-01"-style id).

---

## 8. Suggested phasing

1. Migration: create `survey_master`/`survey_well`/`survey_reading` (§2). **SQL already written**, see [`supabase/migrations/20260925000000_survey_tables.sql`](../supabase/migrations/20260925000000_survey_tables.sql) — run and confirm this first, then separately run [`20260925010000_survey_related_columns.sql`](../supabase/migrations/20260925010000_survey_related_columns.sql) to extend `well_master`/`device_master`.
2. Firebase JSON contract sign-off with Arbaz (§6.2), then the "Fetch & Populate Survey Data" sync path (§6.1).
3. Data layer: `src/lib/surveyData.ts` + `src/hooks/useSurveyWells.ts`.
4. Map: second marker layer + legend (§3.1, §5 `GroundwaterMap.tsx` changes).
5. Popups: `SurveyWellDetailModal` + `SensorDetailModal` survey section + `SurveyHistoryModal`.
6. Reports: Admin "Survey Reports" section, `xlsx`/`jspdf` export — once report fields/filters (open items 2-3 above) are confirmed.

Each phase is independently shippable and testable.
