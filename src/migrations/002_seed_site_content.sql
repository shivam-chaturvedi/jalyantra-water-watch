-- JalYantra: seed `site_content` with the marketing-site defaults
-- Safe merge behavior:
-- - If a key already exists, keep existing values and only fill missing top-level keys.

insert into public.site_content (key, data)
values
(
  'home',
  '{
    "hero": {
      "kicker": "Smarter monitoring",
      "title": "Smarter groundwater monitoring for rural India",
      "description": "JalYantra is an IoT groundwater monitoring system designed for deep agricultural borewells and open wells in drought-prone districts.",
      "problem": "Lack of continuous, local-level groundwater monitoring across seasons.",
      "solution": "LIDAR-based measurement with real-time dashboard insights for crop planning.",
      "primaryCta": "Go to Dashboard",
      "primaryCtaHref": "/dashboard",
      "secondaryCta": "Learn how it works",
      "secondaryCtaHref": "#how-it-works",
      "logoUrl": "/logo.jpeg",
      "carouselText": "Image carousel placeholder"
    },
    "insights": {
      "kicker": "Insights that drive action",
      "heading": "Insights that turn into action",
      "description": "Designed for farmers, NGOs, and panchayat stakeholders—clear visuals, simple language, and exportable evidence.",
      "cards": [
        { "title": "Real-time depth", "description": "Track groundwater depth trends over time, not just a single reading.", "icon": "/icons/insight-depth.svg" },
        { "title": "Actionable alerts", "description": "Detect rapid drops and critical zones early to prevent dry pump runs.", "icon": "/icons/insight-alerts.svg" },
        { "title": "Interactive map", "description": "See monitored locations, drill into sensor level detail, share visuals.", "icon": "/icons/insight-map.svg" },
        { "title": "Export & reports", "description": "Share data with NGOs, panchayats, and program partners as evidence.", "icon": "/icons/insight-reports.svg" }
      ]
    },
    "dashboard": {
      "kicker": "Dashboard",
      "heading": "What users see",
      "description": "A clean summary for quick decisions—then drill down to districts, locations, graphs, and exportable history.",
      "stats": [
        { "label": "Total Sensors", "value": "5", "note": "Monitored locations" },
        { "label": "Average Depth", "value": "6.1m", "note": "State-wide average" },
        { "label": "Critical Districts", "value": "0%", "note": "Above 20m depth threshold" },
        { "label": "Fastest Decline", "value": "Mumbai", "note": "-1.4m in 30 days" }
      ],
      "alertsTitle": "Active Alerts",
      "alerts": [
        { "tone": "danger", "text": "Nagpur: Rapid drop of 1.3 m in recent readings" },
        { "tone": "success", "text": "Pune: Sensors are being monitored continuously — no critical alerts." },
        { "tone": "danger", "text": "Nashik: Average depth at 25m critical zone" },
        { "tone": "success", "text": "Mumbai: Average depth at 3.5  safe zone" }
      ],
      "mapTitle": "Interactive Sensor Map",
      "mapSubtitle": "Click markers for readings",
      "mapBadge": "5 sensors",
      "mapImageUrl": "/interactive-map.png",
      "mapChips": ["📍 Layer: Sensor", "🌐 Layer: Network", "🔍 Drill-down modal"],
      "screenshotsCsv": "/1.png, /graph.png"
    },
    "deployments": {
      "kicker": "Field work",
      "heading": "Deployments & NGO collaboration",
      "description": "Showcase installations, farmer trainings, and community meetings. Add partner logos and pilot geography.",
      "videoPlaceholder": "<Deployment Video>",
      "videoCaption": "Replace with a short interview/installation reel collage (managed from the Admin panel).",
      "placeholderCards": [
        { "title": "Deployment photo 1", "subtitle": "Installation / training / community meeting" },
        { "title": "Deployment photo 2", "subtitle": "Device close-up / pilot geography" },
        { "title": "Deployment photo 3", "subtitle": "Farmer outreach & calibration" },
        { "title": "Deployment photo 4", "subtitle": "Community-led maintenance" }
      ],
      "showMoreLabel": "Show more"
    },
    "validation": {
      "kicker": "Validation",
      "heading": "Certificates, LORs & endorsements",
      "description": "Build trust with proof: calibration notes, validation letters, certificates, and press mentions.",
      "cards": [
        { "title": "Certificate of validation", "detail": "Upload PDF/image thumbnail with links" },
        { "title": "Letters of recommendation", "detail": "Add LOR snippets with names/designations" },
        { "title": "Awards / media / partners", "detail": "Showcase logos + one-line context" }
      ],
      "testimonialsHeading": "Trusted by field partners",
      "testimonialsDescription": "Replace these placeholders with real names, roles, and short quotes.",
      "testimonials": [
        { "name": "Farmer (Village)", "role": "Borewell owner · Maharashtra", "quote": "The alerts helped us avoid running the motor when the water level dropped suddenly." },
        { "name": "NGO field coordinator", "role": "Partner NGO · Maharashtra", "quote": "The dashboard made it easier to explain groundwater changes during community meetings." },
        { "name": "Advisor / Validator", "role": "Hydrology / Program", "quote": "Village-level time-series data like this can improve planning and accountability." }
      ]
    },
    "contact": {
      "kicker": "Contact",
      "heading": "Run a pilot with us",
      "description": "If you''re an NGO, CSR team, research group, or panchayat network working on drought resilience, we can set up a pilot and track clear impact outcomes.",
      "pilotNeedsHeading": "Pilot needs",
      "pilotNeedsItems": [
        "Access to borewells + farmer consent",
        "Coordination for installation & community meetings",
        "Baseline + follow-up monitoring to evaluate impact"
      ],
      "emailLabel": "Email us at",
      "emailValue": "support@jalyantra.tech",
      "locationLabel": "Location:",
      "locationValue": "Maharashtra (pilot geographies)",
      "form": {
        "namePlaceholder": "Your Name",
        "organizationPlaceholder": "Organization",
        "emailPlaceholder": "support@jalyantra.tech",
        "interestPlaceholder": "Interested in…",
        "interestOptions": ["Dashboards & alerts", "Field deployment", "Validation support"],
        "detailsPlaceholder": "Tell us your district(s), number of borewells, and what outcomes you want to measure.",
        "submitLabel": "Send Message",
        "sendingLabel": "Sending...",
        "requiredErrorMessage": "Please fill Name, Email, and Interested in.",
        "sentMessage": "Thanks! Your inquiry has been delivered.",
        "genericErrorMessage": "Something went wrong. Please try again or email support@jalyantra.tech directly."
      }
    }
  }'::jsonb
)
on conflict (key) do update
set data = excluded.data || public.site_content.data;

insert into public.site_content (key, data)
values
(
  'admin_ui',
  '{
    "appName": "JalYantra",
    "panelTitle": "Admin Panel",
    "sidebar": [
      { "id": "visibility", "label": "Visibility & Pages", "desc": "Toggle sections & enable routes" },
      { "id": "hero", "label": "Hero Section", "desc": "Headline, tagline & media" },
      { "id": "insights", "label": "Insights Section", "desc": "How-it-works cards + copy" },
      { "id": "dashboard", "label": "Dashboard Section", "desc": "KPI cards, alerts & map" },
      { "id": "validation", "label": "Validation Section", "desc": "Certificates + testimonials" },
      { "id": "contact", "label": "Contact Section", "desc": "Pilot CTA + form copy" },
      { "id": "deployments-preview", "label": "Deployments Preview", "desc": "Video & photos on home page" },
      { "id": "deployments-page", "label": "Deployments Page", "desc": "Manage all deployment entries" },
      { "id": "footer", "label": "Footer", "desc": "Footer labels + attribution" },
      { "id": "media", "label": "Media Upload", "desc": "Upload images, videos & PDFs" }
    ],
    "sections": {
      "visibility": {
        "title": "Visibility & Pages",
        "desc": "Control which sections visitors see on the Home page, and enable or disable entire routes."
      },
      "hero": {
        "title": "Hero Section",
        "desc": "Edit the headline, taglines, button labels, and logo shown at the very top of the Home page."
      },
      "insights": {
        "title": "Insights Section",
        "desc": "Edit the section intro and the four insight cards shown under ''How it works'' on the Home page."
      },
      "dashboard": {
        "title": "Dashboard Section",
        "desc": "Edit the KPI cards, alerts, and interactive map card shown in the ''Dashboard'' section of the Home page."
      },
      "validation": {
        "title": "Validation Section",
        "desc": "Edit the Validation section headings, cards, and testimonial placeholders on the Home page."
      },
      "contact": {
        "title": "Contact Section",
        "desc": "Edit the ''Run a pilot with us'' copy, pilot needs list, and contact form labels."
      },
      "deployments-preview": {
        "title": "Deployments Preview",
        "desc": "Manage the deployment teaser shown on the Home page — the video reel and thumbnail photos."
      },
      "deployments-page": {
        "title": "Deployments Page",
        "desc": "Create, edit, and delete full deployment pages/entries."
      },
      "footer": {
        "title": "Footer",
        "desc": "Edit footer labels (brand, badges, attribution) shown across the site."
      },
      "media": {
        "title": "Media Upload",
        "desc": "Upload images, videos & PDFs for use across the site."
      }
    }
  }'::jsonb
)
on conflict (key) do update
set data = excluded.data || public.site_content.data;

insert into public.site_content (key, data)
values
(
  'footer',
  '{
    "brandTitle": "JalYantra Project",
    "brandSubtitle": "Groundwater Intelligence",
    "badges": [
      { "label": "Calibration Verified" },
      { "label": "5min Intervals" },
      { "label": "Live Stream" }
    ],
    "copyright": "© 2026 JalYantra • All rights reserved",
    "attributionPrefix": "Source:",
    "attribution": [
      { "label": "Source", "value": "JalYantra IoT Network" },
      { "label": "Backend", "value": "Firebase RTDB" },
      { "label": "Maps", "value": "Leaflet + CARTO" }
    ]
  }'::jsonb
)
on conflict (key) do update
set data = excluded.data || public.site_content.data;
