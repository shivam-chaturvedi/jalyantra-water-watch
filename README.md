# JalYantra Water Watch

## Overview

This repository powers the JalYantra Water Watch dashboard and marketing site, an interactive map-driven monitoring experience for groundwater sensing devices across Maharashtra. It supports realtime updates and includes an admin panel to control site visibility flags + upload media.

## Getting started

Make sure you have Node.js (LTS) and npm installed. Then run:

```sh
npm install
npm run dev
```

The development server runs on `http://localhost:5173` by default and hot-reloads whenever you edit source files.

## Backend setup

1. Create a Postgres + Auth backend
2. Run the migration SQL files in order (SQL Editor):
   - `src/migrations/001_supabase_init.sql`
   - `src/migrations/002_seed_site_content.sql` (seeds Home copy)
3. Set local env vars in `.env`:

```sh
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Create an admin user

- Create a user in your Auth provider
- Promote the user by running:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

Then log in at `/login` and open `/admin`.

### Feeding sensor data

By default, the dashboard can read the latest payload from the backend snapshots tables:
- `public.readings_snapshots(payload jsonb)`
- `public.sensor_data_snapshots(payload jsonb)`

Insert a new row to publish an update; the app subscribes to realtime changes on both tables.

#### Firebase RTDB (recommended for dashboard)

The dashboard reads directly from Firebase RTDB (client SDK). Configure:

```sh
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=https://<your-project>.firebaseio.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Where the readings live in RTDB (defaults to `readings`)
VITE_FIREBASE_READINGS_PATH=readings
```

`VITE_FIREBASE_RTDB_URL` is also accepted as an alias for `VITE_FIREBASE_DATABASE_URL`.

## Technologies

- Vite
- TypeScript
- React
- Tailwind CSS
- Leaflet (via react-leaflet)
- Backend: Auth + Postgres + Realtime + Storage
- Recharts

## Deploying

Build the production bundle with `npm run build` and deploy the contents of the `dist/` directory to your preferred static-hosting platform (Netlify, Vercel, GitHub Pages, etc.).
