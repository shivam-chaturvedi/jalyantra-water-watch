export type HomeHeroContent = {
  kicker: string;
  title: string;
  description: string;
  problem: string;
  solution: string;
  primaryCta: string;
  primaryCtaHref: string;
  secondaryCta: string;
  secondaryCtaHref: string;
  logoUrl: string;
  carouselText: string;
  carouselMediaCsv?: string;
};

export type HomeInsightsCard = { title: string; description: string; icon?: string };
export type HomeDashboardStat = { label: string; value: string; note: string };
export type HomeDashboardAlert = { tone: 'danger' | 'success'; text: string };
export type HomeImpactMetric = { label: string; value: string; note: string };
export type HomeActionableInsight = { title: string; description: string };

export type HomeDashboardGraphCard = {
  title: string;
  description: string;
  imageUrl: string;
};

export const IWA_DIGITAL_WATER_SUMMIT_CERTIFICATE_TITLE =
  'Invitation to Present at the InnoHub – IWA Digital Water Summit 2026';

export type HomeDashboardContent = {
  kicker: string;
  heading: string;
  description: string;
  stats: HomeDashboardStat[];
  alertsTitle: string;
  alerts: HomeDashboardAlert[];
  mapTitle: string;
  mapSubtitle: string;
  mapBadge: string;
  mapImageUrl: string;
  mapChips: string[];
  screenshotsCsv: string;
  /** Four preview graphs in the Dashboard / "What users see" section on Home. */
  graphCards: HomeDashboardGraphCard[];
  impactMetrics: HomeImpactMetric[];
  actionableInsights: HomeActionableInsight[];
};

export type HomeInsightsContent = {
  kicker: string;
  heading: string;
  description: string;
  cards: HomeInsightsCard[];
};

export type HomeDeploymentsPlaceholderCard = { title: string; subtitle: string };
export type HomeDeploymentsContent = {
  kicker: string;
  heading: string;
  description: string;
  videoPlaceholder: string;
  videoCaption: string;
  placeholderCards: HomeDeploymentsPlaceholderCard[];
  showMoreLabel: string;
};

export type HomeValidationCard = { title: string; detail: string; mediaUrl?: string };
export type HomeTestimonial = { name: string; role: string; quote: string };
export type HomeValidationContent = {
  kicker: string;
  heading: string;
  description: string;
  cards: HomeValidationCard[];
  testimonialsHeading: string;
  testimonialsDescription: string;
  testimonials: HomeTestimonial[];
};

export type HomeContactContent = {
  kicker: string;
  heading: string;
  description: string;
  pilotNeedsHeading: string;
  pilotNeedsItems: string[];
  emailLabel: string;
  emailValue: string;
  locationLabel: string;
  locationValue: string;
  form: {
    namePlaceholder: string;
    organizationPlaceholder: string;
    emailPlaceholder: string;
    interestPlaceholder: string;
    interestOptions: string[];
    detailsPlaceholder: string;
    submitLabel: string;
    sendingLabel: string;
    requiredErrorMessage: string;
    sentMessage: string;
    genericErrorMessage: string;
  };
};

export type HomeContent = {
  hero: HomeHeroContent;
  insights: HomeInsightsContent;
  dashboard: HomeDashboardContent;
  deployments: HomeDeploymentsContent;
  validation: HomeValidationContent;
  contact: HomeContactContent;
};

export type FooterContent = {
  brandTitle: string;
  brandSubtitle: string;
  badges: Array<{ label: string }>;
  copyright: string;
  attributionPrefix: string;
  attribution: Array<{ label: string; value: string }>;
};

export type AdminSidebarItem = { id: string; label: string; desc: string };

export type AdminUiContent = {
  appName: string;
  panelTitle: string;
  sidebar: AdminSidebarItem[];
  sections: Record<string, { title: string; desc: string }>;
};

export function getDefaultHomeContent(): HomeContent {
  return {
    hero: {
      kicker: 'Smarter monitoring',
      title: 'Smarter groundwater monitoring for rural India',
      description:
        'JalYantra is an IoT groundwater monitoring system designed for deep agricultural borewells and open wells in drought-prone districts.',
      problem: 'Lack of continuous, local-level groundwater monitoring across seasons.',
      solution: 'LIDAR-based measurement with real-time dashboard insights for crop planning.',
      primaryCta: 'Go to Dashboard',
      primaryCtaHref: '/dashboard',
      secondaryCta: 'Learn how it works',
      secondaryCtaHref: '#how-it-works',
      logoUrl: '/logo.jpeg',
      carouselText: '',
      carouselMediaCsv: '',
    },
    insights: {
      kicker: 'Insights that drive action',
      heading: 'Insights that turn into action',
      description:
        'Designed for farmers, NGOs, and panchayat stakeholders—clear visuals, simple language, and exportable evidence.',
      cards: [
        {
          title: 'Real-time depth',
          description: 'Track groundwater depth trends over time, not just a single reading.',
          icon: '/icons/insight-depth.svg',
        },
        {
          title: 'Actionable alerts',
          description: 'Detect rapid drops and critical zones early to prevent dry pump runs.',
          icon: '/icons/insight-alerts.svg',
        },
        {
          title: 'Interactive map',
          description: 'See monitored locations, drill into sensor level detail, share visuals.',
          icon: '/icons/insight-map.svg',
        },
        {
          title: 'Export & reports',
          description: 'Share data with NGOs, panchayats, and program partners as evidence.',
          icon: '/icons/insight-reports.svg',
        },
      ],
    },
    dashboard: {
      kicker: 'Dashboard',
      heading: 'What users see',
      description:
        'A clean summary for quick decisions—then drill down to districts, locations, graphs, and exportable history.',
      stats: [
        { label: 'Total Sensors', value: '5', note: 'Monitored locations' },
        { label: 'Average Depth', value: '6.1m', note: 'State-wide average' },
        { label: 'Critical Districts', value: '0%', note: 'Above 20m depth threshold' },
        { label: 'Fastest Decline', value: 'Mumbai', note: '-1.4m in 30 days' },
      ],
      alertsTitle: 'Active Alerts',
      alerts: [
        { tone: 'danger', text: 'Nagpur: Rapid drop of 1.3 m in recent readings' },
        { tone: 'success', text: 'Pune: Sensors are being monitored continuously — no critical alerts.' },
        { tone: 'danger', text: 'Nashik: Average depth at 25m – critical zone' },
        { tone: 'success', text: 'Mumbai: Average depth at 3.5 – safe zone' },
      ],
      mapTitle: 'Interactive Sensor Map',
      mapSubtitle: 'Click markers for readings',
      mapBadge: '5 sensors',
      mapImageUrl: '/interactive-map.png',
      mapChips: ['📍 Layer: Sensor', '🌐 Layer: Network', '🔍 Drill-down modal'],
      screenshotsCsv: '',
      graphCards: [
        {
          title: 'Groundwater Level Trend',
          description: 'Daily median depth for non-pump installations over 7 days, 1 month, or 3 months.',
          imageUrl: '',
        },
        {
          title: '24-hour Pump Drawdown',
          description: 'Depth change during each pump run for pump-connected borewells.',
          imageUrl: '',
        },
        {
          title: 'Interactive Sensor Map',
          description: 'Live device locations with depth and status at a glance.',
          imageUrl: '',
        },
        {
          title: 'Depth History & Export',
          description: 'Timestamped readings table and CSV export for any device.',
          imageUrl: '',
        },
      ],
      impactMetrics: [
        { label: 'Wells Monitored', value: '5', note: 'Connected to the live sensor network' },
        { label: 'Villages Reached', value: '3', note: 'Pilot geographies currently active' },
        { label: 'Districts Covered', value: '3', note: 'Geographies represented in the dataset' },
        { label: 'Readings Captured', value: '12K+', note: 'Historical samples and event points' },
        { label: 'Water Observed', value: '38K m', note: 'Approximate cumulative water monitored' },
      ],
      actionableInsights: [
        {
          title: 'Estimated Water Drawn',
          description: 'Understand how much water is extracted in each pump cycle.',
        },
        {
          title: 'Days of Water Remaining',
          description: 'Estimate how long the well water lasts at current extraction levels.',
        },
        {
          title: 'Seasonal Water Extraction Trend',
          description: 'Track how groundwater usage changes across seasons.',
        },
        {
          title: 'Irrigation Intensity Indicator',
          description: 'Understand whether water usage is above or below normal levels.',
        },
        {
          title: 'Monsoon Recharge Gain',
          description: 'See how groundwater levels improve after the monsoon.',
        },
        {
          title: 'Dry Run Risk Alerts',
          description: 'Receive alerts when water levels fall too low for safe pumping and when it becomes safe again.',
        },
        {
          title: 'Groundwater Recovery Tracking',
          description: 'Discover how quickly wells recover after pumping.',
        },
        {
          title: 'Seasonal Groundwater Trends',
          description: 'Monitor how groundwater levels rise or fall over time.',
        },
      ],
    },
    deployments: {
      kicker: 'Field work',
      heading: 'Deployments & NGO collaboration',
      description: 'Showcase installations, farmer trainings, and community meetings. Add partner logos and pilot geography.',
      videoPlaceholder: '<Deployment Video>',
      videoCaption: 'Replace with a short interview/installation reel collage (managed from the Admin panel).',
      placeholderCards: [
        { title: 'Deployment photo 1', subtitle: 'Installation / training / community meeting' },
        { title: 'Deployment photo 2', subtitle: 'Device close-up / pilot geography' },
        { title: 'Deployment photo 3', subtitle: 'Farmer outreach & calibration' },
        { title: 'Deployment photo 4', subtitle: 'Community-led maintenance' },
      ],
      showMoreLabel: 'Show more',
    },
    validation: {
      kicker: 'Validation',
      heading: 'Certificates, LORs & endorsements',
      description: 'Build trust with proof: calibration notes, validation letters, certificates, and press mentions.',
      cards: [
        {
          title: IWA_DIGITAL_WATER_SUMMIT_CERTIFICATE_TITLE,
          detail: 'Official invitation to present JalYantra at the IWA Digital Water Summit 2026.',
          mediaUrl: '',
        },
      ],
      testimonialsHeading: 'Trusted by field partners',
      testimonialsDescription: '',
      testimonials: [],
    },
    contact: {
      kicker: 'Contact',
      heading: 'Run a pilot with us',
      description:
        "If you're an NGO, CSR team, research group, or panchayat network working on drought resilience, we can set up a pilot and track clear impact outcomes.",
      pilotNeedsHeading: 'Pilot needs',
      pilotNeedsItems: [
        'Access to borewells + farmer consent',
        'Coordination for installation & community meetings',
        'Baseline + follow-up monitoring to evaluate impact',
      ],
      emailLabel: 'Email us at',
      emailValue: 'support@jalyantra.tech',
      locationLabel: 'Location:',
      locationValue: 'Maharashtra (pilot geographies)',
      form: {
        namePlaceholder: 'Your Name',
        organizationPlaceholder: 'Organization',
        emailPlaceholder: 'Email',
        interestPlaceholder: 'Interested in…',
        interestOptions: ['Dashboards & alerts', 'Field deployment', 'Validation support'],
        detailsPlaceholder: 'Tell us your district(s), number of borewells, and what outcomes you want to measure.',
        submitLabel: 'Send Message',
        sendingLabel: 'Sending...',
        requiredErrorMessage: 'Please fill Name, Email, and Interested in.',
        sentMessage: "Thanks! Your inquiry has been delivered.",
        genericErrorMessage:
          'Something went wrong. Please try again or email support@jalyantra.tech directly.',
      },
    },
  };
}

export function getDefaultFooterContent(): FooterContent {
  return {
    brandTitle: 'JalYantra Project',
    brandSubtitle: 'Groundwater Intelligence',
    badges: [{ label: 'Calibration Verified' }, { label: '5min Intervals' }, { label: 'Live Stream' }],
    copyright: '© 2026 JalYantra • All rights reserved',
    attributionPrefix: 'Source:',
    attribution: [
      { label: 'Source', value: 'JalYantra IoT Network' },
      { label: 'Backend', value: 'Firebase RTDB' },
      { label: 'Maps', value: 'Leaflet + CARTO' },
    ],
  };
}

export function getDefaultAdminUiContent(): AdminUiContent {
  return {
    appName: 'JalYantra',
    panelTitle: 'Admin Panel',
    sidebar: [
      { id: 'visibility', label: 'Visibility & Pages', desc: 'Toggle sections & enable routes' },
      { id: 'hero', label: 'Hero Section', desc: 'Headline, tagline & media' },
      { id: 'insights', label: 'Insights Section', desc: 'How-it-works cards + copy' },
      { id: 'dashboard', label: 'Dashboard Section', desc: 'KPI cards, alerts & map' },
      { id: 'validation', label: 'Validation Section', desc: 'Certificates + testimonials' },
      { id: 'contact', label: 'Contact Section', desc: 'Pilot CTA + form copy' },
      { id: 'deployments-preview', label: 'Deployments Preview', desc: 'Video & photos on home page' },
      { id: 'deployments-page', label: 'Deployments Page', desc: 'Manage all deployment entries' },
      { id: 'footer', label: 'Footer', desc: 'Footer labels + attribution' },
      { id: 'media', label: 'Media Upload', desc: 'Upload images, videos & PDFs' },
    ],
    sections: {
      visibility: {
        title: 'Visibility & Pages',
        desc: 'Control which sections visitors see on the Home page, and enable or disable entire routes.',
      },
      hero: {
        title: 'Hero Section',
        desc: 'Edit the headline, taglines, button labels, and logo shown at the very top of the Home page.',
      },
      insights: {
        title: 'Insights Section',
        desc: "Edit the section intro and the four insight cards shown under 'How it works' on the Home page.",
      },
      dashboard: {
        title: 'Dashboard Section',
        desc: "Edit the KPI cards, alerts, and interactive map card shown in the 'Dashboard' section of the Home page.",
      },
      validation: {
        title: 'Validation Section',
        desc: 'Edit the Validation section headings, cards, and testimonial placeholders on the Home page.',
      },
      contact: {
        title: 'Contact Section',
        desc: "Edit the 'Run a pilot with us' copy, pilot needs list, and contact form labels.",
      },
      'deployments-preview': {
        title: 'Deployments Preview',
        desc: 'Manage the deployment teaser shown on the Home page — the video reel and thumbnail photos.',
      },
      'deployments-page': {
        title: 'Deployments Page',
        desc: 'Create, edit, and delete full deployment pages/entries.',
      },
      footer: {
        title: 'Footer',
        desc: 'Edit footer labels (brand, badges, attribution) shown across the site.',
      },
      media: {
        title: 'Media Upload',
        desc: 'Upload images, videos & PDFs for use across the site.',
      },
    },
  };
}

function arrOr<T>(fallback: T[], value: unknown): T[] {
  return Array.isArray(value) && value.length ? (value as T[]) : fallback;
}

function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function mergeHomeContentWithDefaults(value: unknown): HomeContent {
  const overrides = obj(value);
  const defaults = getDefaultHomeContent();

  const heroOverrides = obj(overrides['hero']);
  const insightsOverrides = obj(overrides['insights']);
  const dashboardOverrides = obj(overrides['dashboard']);
  const deploymentsOverrides = obj(overrides['deployments']);
  const validationOverrides = obj(overrides['validation']);
  const contactOverrides = obj(overrides['contact']);
  const contactFormOverrides = obj(contactOverrides['form']);

  return {
    ...overrides,
    hero: {
      ...defaults.hero,
      ...heroOverrides,
    } as HomeHeroContent,
    insights: {
      ...defaults.insights,
      ...insightsOverrides,
      cards: arrOr(defaults.insights.cards, insightsOverrides['cards']),
    } as HomeInsightsContent,
    dashboard: {
      ...defaults.dashboard,
      ...dashboardOverrides,
      stats: arrOr(defaults.dashboard.stats, dashboardOverrides['stats']),
      alerts: arrOr(defaults.dashboard.alerts, dashboardOverrides['alerts']),
      mapChips: arrOr(defaults.dashboard.mapChips, dashboardOverrides['mapChips']),
      impactMetrics: arrOr(defaults.dashboard.impactMetrics, dashboardOverrides['impactMetrics']),
      graphCards: arrOr(defaults.dashboard.graphCards, dashboardOverrides['graphCards']),
      actionableInsights: arrOr(defaults.dashboard.actionableInsights, dashboardOverrides['actionableInsights']),
    } as HomeDashboardContent,
    deployments: {
      ...defaults.deployments,
      ...deploymentsOverrides,
      placeholderCards: arrOr(defaults.deployments.placeholderCards, deploymentsOverrides['placeholderCards']),
    } as HomeDeploymentsContent,
    validation: {
      ...defaults.validation,
      ...validationOverrides,
      cards: arrOr(defaults.validation.cards, validationOverrides['cards']),
      testimonials: arrOr(defaults.validation.testimonials, validationOverrides['testimonials']),
    } as HomeValidationContent,
    contact: {
      ...defaults.contact,
      ...contactOverrides,
      pilotNeedsItems: arrOr(defaults.contact.pilotNeedsItems, contactOverrides['pilotNeedsItems']),
      form: {
        ...defaults.contact.form,
        ...contactFormOverrides,
        interestOptions: arrOr(defaults.contact.form.interestOptions, contactFormOverrides['interestOptions']),
      },
    } as HomeContactContent,
  };
}

export function mergeFooterContentWithDefaults(value: unknown): FooterContent {
  const overrides = obj(value);
  const defaults = getDefaultFooterContent();
  return {
    ...defaults,
    ...overrides,
    badges: arrOr(defaults.badges, overrides['badges']),
    attribution: arrOr(defaults.attribution, overrides['attribution']),
  } as FooterContent;
}

export function mergeAdminUiContentWithDefaults(value: unknown): AdminUiContent {
  const overrides = obj(value);
  const defaults = getDefaultAdminUiContent();
  const sections = obj(overrides['sections']);

  return {
    ...defaults,
    ...overrides,
    sidebar: arrOr(defaults.sidebar, overrides['sidebar']),
    sections: {
      ...defaults.sections,
      ...Object.fromEntries(
        Object.entries(sections).map(([k, v]) => [k, { ...obj(defaults.sections[k as keyof typeof defaults.sections]), ...obj(v) }]),
      ),
    },
  } as AdminUiContent;
}
