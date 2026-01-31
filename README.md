# JalYantra Water Watch

## Overview

This repository powers the JalYantra Water Watch dashboard, an interactive map-driven monitoring experience for groundwater sensing devices across Maharashtra. It reads from Firebase Realtime Database, streams live alerts, and visualizes sensor history, district insights, and KPIs.

## Getting started

Make sure you have Node.js (LTS) and npm installed. Then run:

```sh
npm install
npm run dev
```

The development server runs on `http://localhost:5173` by default and hot-reloads whenever you edit source files.

## Technologies

- Vite
- TypeScript
- React
- Tailwind CSS
- Leaflet (via react-leaflet)
- Firebase Realtime Database
- Recharts

## Deploying

Build the production bundle with `npm run build` and deploy the contents of the `dist/` directory to your preferred static-hosting platform (Netlify, Vercel, GitHub Pages, etc.).
