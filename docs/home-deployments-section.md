# Home Page Deployments Section

This note documents the full `Field work / Deployments & NGO collaboration` area on the Home page, including:

- where the section is rendered
- which Supabase queries feed it
- where the default copy lives
- how the preview media and `Show more` button are wired

## What The Section Is

The Home page has a dedicated deployments section that appears under the dashboard area when the `show_deployments` flag is enabled.

It is the marketing-style teaser for field work and collaboration:

- deployments and installations
- farmer trainings and community meetings
- partner logos
- pilot geography
- preview media for the field work story
- a `Show more` button that sends users to the full `/deployments` page

## Main Files

### Home page data flow

- [src/pages/Home.tsx](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/pages/Home.tsx)

This file owns the page-level data fetching and renders the deployments section.

### Default content

- [src/lib/contentDefaults.ts](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/lib/contentDefaults.ts)

This file defines the default text, placeholder cards, and button label for the section.

### Supabase helpers

- [src/lib/siteAdmin.ts](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/lib/siteAdmin.ts)

This file contains the helper functions that read the content and deployment preview data from Supabase.

## Data Flow

### 1. Home page loads site-level content

In `Home.tsx`, the page calls:

```ts
fetchSiteContent("home")
```

This pulls the `home` record from the Supabase `site_content` table.

The result is merged with defaults through:

```ts
mergeHomeContentWithDefaults(homeContentQuery.data ?? {})
```

That merge gives the page a complete `homeContent` object even if some content is missing in the database.

### 2. Home page loads deployment preview media

In the same component, the page also calls:

```ts
fetchDeployment("alibaug-raigad")
```

This reads a single deployment record from the Supabase `deployments` table.

The deployment record is used only for the Home page teaser preview:

- `previewVideoUrl`
- `previewImages`

### 3. The render block combines both data sources

The section render block uses:

- `deploymentsContent` from `site_content`
- `deploymentsPreviewVideoUrl` from `deployments`
- `deploymentsPreviewImages` from `deployments`
- `showDeploymentsSection` from site flags
- `isDeploymentsPageEnabled` from the app pages table

## The Home Page Code Path

### Page-level setup

The top of `Home.tsx` sets up the deployments-related reads:

- `useQuery({ queryKey: ["site_content", "home"], queryFn: () => fetchSiteContent("home") })`
- `useQuery({ queryKey: ["deployments", "alibaug-raigad", "preview"], queryFn: () => fetchDeployment("alibaug-raigad") })`

It also reads:

- `showDeploymentsSection` from `site_flags`
- `isDeploymentsPageEnabled` from `app_pages`

Those checks control whether the section is shown and whether the `Show more` button is rendered.

## Section Render Block

The deployments section is rendered in `Home.tsx` inside:

```tsx
{showDeploymentsSection && (
  <section id="deployments">
    ...
  </section>
)}
```

This block includes:

- section kicker
- section heading
- section description
- deployment preview video
- deployment preview image grid
- placeholder cards if preview images are missing
- `Show more` button

### Copy source for the visible text

The displayed text comes from `deploymentsContent`, which is merged from:

- database overrides from `site_content.home.deployments`
- defaults from `contentDefaults.ts`

The default text in `contentDefaults.ts` is:

- kicker: `Field work`
- heading: `Deployments & NGO collaboration`
- description: `Showcase installations, farmer trainings, and community meetings. Add partner logos and pilot geography.`
- placeholder cards: four deployment placeholder tiles
- button label: `Show more`

## Supabase Helpers

The Home page does not query Supabase directly with SQL. Instead it uses helper functions from `siteAdmin.ts`.

### `fetchSiteContent("home")`

Location:

- [src/lib/siteAdmin.ts](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/lib/siteAdmin.ts)

Purpose:

- reads one row from `site_content`
- returns the JSON `data` object for the `home` key

Used by Home page to populate:

- hero content
- insights
- dashboard
- deployments
- validation
- contact

### `fetchDeployment("alibaug-raigad")`

Location:

- [src/lib/siteAdmin.ts](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/lib/siteAdmin.ts)

Purpose:

- reads one row from `deployments`
- returns the deployment record used for the teaser preview

Used by Home page to populate:

- `previewVideoUrl`
- `previewImages`

## Default Content

The defaults are defined in:

- [src/lib/contentDefaults.ts](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/lib/contentDefaults.ts)

That file provides the fallback deployment section content so the Home page still works if Supabase content is empty or incomplete.

The deployment defaults are the source of:

- section title
- section description
- placeholder cards
- `Show more` label

## Render Logic Summary

In plain English, the Home page deployments section works like this:

1. Load the home page content from Supabase.
2. Merge that content with the built-in defaults.
3. Load the `alibaug-raigad` deployment preview from Supabase.
4. Check the page visibility flag and the `/deployments` page enablement flag.
5. Render the deployments teaser only when `show_deployments` is enabled.
6. Show preview video and photos if available.
7. Fall back to placeholder tiles if preview images are missing.
8. Show a `Show more` button that links to `/deployments` when that page is enabled.

## Useful References

- Home page data flow: [src/pages/Home.tsx](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/pages/Home.tsx)
- Default deployments content: [src/lib/contentDefaults.ts](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/lib/contentDefaults.ts)
- Supabase helper functions: [src/lib/siteAdmin.ts](/Users/shivamchaturvedi/work/jalyantra-water-watch/src/lib/siteAdmin.ts)

