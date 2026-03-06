import { FormEvent, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

const navLinks = [
  { label: "Features", id: "features" },
  { label: "How it works", id: "how-it-works" },
  { label: "Dashboard", id: "dashboard" },
  { label: "Deployments", id: "deployments" },
  { label: "Validation", id: "validation" },
  { label: "Contact", id: "contact" },
];

const insightCards = [
  {
    title: "Real-time depth",
    description: "Track groundwater depth trends over time, not just a single reading.",
    icon: "/icons/insight-depth.svg",
  },
  {
    title: "Actionable alerts",
    description: "Detect rapid drops and critical zones early to prevent dry pump runs.",
    icon: "/icons/insight-alerts.svg",
  },
  {
    title: "Interactive map",
    description: "See monitored locations, drill into sensor level detail, share visuals.",
    icon: "/icons/insight-map.svg",
  },
  {
    title: "Export & reports",
    description: "Share data with NGOs, panchayats, and program partners as evidence.",
    icon: "/icons/insight-reports.svg",
  },
];

const dashboardStats = [
  { label: "Total sensors", value: "4", note: "Monitored locations" },
  { label: "Average depth", value: "55.5m", note: "State-wide average" },
  { label: "Critical districts", value: "100%", note: "Above threshold" },
  { label: "Fastest decline", value: "Mumbai", note: "-4.5m in 30 days" },
];

const alertItems = [
  "Mumbai: Rapid drop of 4.5m in recent readings",
  "Nashik: Rapid drop of 4m in recent readings",
  "Mumbai: Average depth at 45.9m — Critical zone",
  "Pune: Average depth at 54m — Critical zone",
  "Nashik: Average depth at 76m — Critical zone",
];

const deploymentCards = [
  { title: "Deployment photo 1", subtitle: "Installation / training / community meeting" },
  { title: "Deployment photo 2", subtitle: "Device close-up / pilot geography" },
  { title: "Deployment photo 3", subtitle: "Farmer outreach & calibration" },
  { title: "Deployment photo 4", subtitle: "Community-led maintenance" },
];

const validationCards = [
  { title: "Certificate of validation", detail: "Upload PDF/image thumbnail with links" },
  { title: "Letters of recommendation", detail: "Add LOR snippets with names/designations" },
  { title: "Awards / media / partners", detail: "Showcase logos + one-line context" },
];

const testimonials = [
  {
    name: "Farmer (Village)",
    role: "Borewell owner · Maharashtra",
    quote: "The alerts helped us avoid running the motor when the water level dropped suddenly.",
  },
  {
    name: "NGO field coordinator",
    role: "Partner NGO · Maharashtra",
    quote: "The dashboard made it easier to explain groundwater changes during community meetings.",
  },
  {
    name: "Advisor / Validator",
    role: "Hydrology / Program",
    quote: "Village-level time-series data like this can improve planning and accountability.",
  },
];

const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

const isFlagEnabled = (value?: string) => {
  if (value === undefined) return true;
  return value === "true" || value === "1";
};

const showDeploymentsSection = isFlagEnabled(import.meta.env.VITE_SHOW_DEPLOYMENTS);
const showValidationSection = isFlagEnabled(import.meta.env.VITE_SHOW_VALIDATION);
const showCarouselSection = isFlagEnabled(import.meta.env.VITE_SHOW_IMAGE_CAROUSEL);

export default function Home() {
  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  return (
    <div className="bg-background text-foreground">
      <header className="border-b border-border bg-card/90 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="JalYantra logo"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                JalYantra
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                Groundwater intelligence
              </p>
            </div>
          </Link>
          <nav className="hidden gap-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <a key={link.id} href={`#${link.id}`} className="hover:text-foreground">
                {link.label}
              </a>
            ))}
          </nav>
          <Button asChild size="sm" className="rounded-full px-5 bg-[#007b6d] hover:bg-[#006157]">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="space-y-20 pt-8 pb-16">
        <section className="container mx-auto px-4" id="features">
          <div className="grid gap-10 rounded-[32px] border border-border bg-card px-6 py-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Smarter monitoring</p>
              <h1 className="text-4xl font-bold text-foreground md:text-5xl">
                Smarter groundwater monitoring for rural India
              </h1>
              <p className="text-lg text-muted-foreground">
                JalYantra is an IoT groundwater monitoring system designed for deep agricultural borewells
                and open wells in drought-prone districts.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Problem:</span> Lack of continuous,
                  local-level groundwater monitoring across seasons.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Solution:</span> LIDAR-based measurement
                  with real-time dashboard insights for crop planning.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-[#0c7a61] hover:bg-[#0a6a54]">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-border"
                  onClick={() => scrollToSection("how-it-works")}
                >
                  Learn how it works
                </Button>
              </div>
            </div>
            {showCarouselSection && (
              <div className="rounded-[32px] border border-border bg-muted/60 p-10 text-center text-sm text-muted-foreground">
                <img
                  src="/logo.jpeg"
                  alt="JalYantra logo"
                  className="mx-auto h-10 w-10 rounded-full object-cover"
                />
                <div className="mt-6 h-64 w-full rounded-[24px] bg-muted" />
                <p className="mt-4">Image carousel placeholder</p>
              </div>
            )}
          </div>
        </section>

        <section className="container mx-auto space-y-8 px-4" id="how-it-works">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Insights that turn action</p>
            <h2 className="text-3xl font-bold text-foreground">Insights that turn into action</h2>
            <p className="text-sm text-muted-foreground">
              Designed for farmers, NGOs, and panchayat stakeholders—clear visuals, simple language, and exportable evidence.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {insightCards.map((card, index) => (
                <div key={card.title} className="rounded-[24px] border border-border bg-card/70 p-5 shadow-sm">
                  {card.icon && (
                    <img
                      src={card.icon}
                      alt={`${card.title} icon`}
                      className="mb-2 h-10 w-10"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">0{index + 1}</p>
                  <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              ))}
          </div>
        </section>

        <section className="container mx-auto space-y-8 px-4" id="dashboard">
          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-[#0f9d7b]">Dashboard</p>
            <h2 className="text-3xl font-bold text-foreground">What users see</h2>
            <p className="text-sm text-muted-foreground">
              A clean summary for quick decisions—then drill down to districts, locations, graphs, and exportable history.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-border bg-card/80 p-4 text-sm text-muted-foreground">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.note}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-border bg-card/70 p-6">
              <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                <span>Active Alerts</span>
                <span className="text-xs text-muted-foreground">5</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {alertItems.map((alert) => (
                  <p key={alert} className="rounded-2xl border border-[#f4c2c2] bg-[#fff5f5] px-4 py-3 text-xs text-[#a02e2e]">
                    {alert}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-[32px] border border-border bg-card/70 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Interactive Sensor Map</p>
                  <p className="text-xs text-muted-foreground">Click markers for readings (placeholder)</p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  4 sensors monitored
                </span>
              </div>
              <img
                src="/interactive-map.png"
                alt="Interactive sensor map"
                className="h-56 w-full rounded-[24px] object-cover"
              />
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
                <span>Layer: Sensor</span>
                <span>Layer: Network</span>
                <span>Drill-down: Location modal</span>
              </div>
            </div>
          </div>
        </section>

        {showDeploymentsSection && (
          <section className="container mx-auto space-y-8 px-4" id="deployments">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-[#0f9d7b]">Field work</p>
              <h2 className="text-3xl font-bold text-foreground">Deployments & NGO collaboration</h2>
              <p className="text-sm text-muted-foreground">
                Showcase installations, farmer trainings, and community meetings. Add partner logos and pilot geography.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {deploymentCards.map((card) => (
                <div key={card.title} className="rounded-[32px] border border-border bg-card/70 p-4">
                  <div className="h-40 w-full rounded-[24px] bg-muted" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {showValidationSection && (
          <section className="container mx-auto space-y-8 px-4" id="validation">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-[#0f9d7b]">Validation</p>
              <h2 className="text-3xl font-bold text-foreground">Certificates, LORs & endorsements</h2>
              <p className="text-sm text-muted-foreground">
                Build trust with proof: calibration notes, validation letters, certificates, and press mentions.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {validationCards.map((card) => (
                <div key={card.title} className="rounded-[32px] border border-border bg-card/70 p-5">
                  <div className="h-32 w-full rounded-[20px] bg-muted" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.detail}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-foreground">Trusted by field partners</h3>
              <p className="text-sm text-muted-foreground">
                Replace these placeholders with real names, roles, and short quotes.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {testimonials.map((testimonial) => (
                  <div key={testimonial.name} className="rounded-[32px] border border-border bg-card/80 p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-[11px] text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">“{testimonial.quote}”</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="container mx-auto space-y-8 px-4" id="contact">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-[#0f9d7b]">Contact</p>
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpeg"
                alt="JalYantra logo"
                className="h-10 w-10 rounded-full object-cover"
              />
              <h2 className="text-3xl font-bold text-foreground">Run a pilot with us</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              If you’re an NGO, CSR team, research group, or panchayat network working on drought resilience, we can set up a pilot and track clear impact outcomes.
            </p>
          </div>
          <div className="grid gap-6 rounded-[32px] border border-border bg-card/80 p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-border bg-muted/60 p-5 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Pilot needs (example)</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Access to borewells + farmer consent</li>
                  <li>Coordination for installation & community meetings</li>
                  <li>Baseline + follow-up monitoring to evaluate impact</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Email: <span className="font-semibold text-foreground">hello@jalyantra.org</span> (placeholder)
                <br />
                Location: <span className="font-semibold text-foreground">Maharashtra</span> (pilot geographies)
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleFormSubmit}>
              <input
                type="text"
                placeholder="Name"
                className="w-full rounded-[18px] border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Organization"
                className="w-full rounded-[18px] border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-[18px] border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <select
                className="w-full rounded-[18px] border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
              >
                <option>Interested in…</option>
                <option>Dashboards & alerts</option>
                <option>Field deployment</option>
                <option>Validation support</option>
              </select>
              <textarea
                placeholder="Tell us your district(s), number of borewells, and what outcomes you want to measure."
                className="h-24 w-full rounded-[18px] border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <Button className="w-full rounded-full bg-[#0c7a61] text-sm font-semibold uppercase tracking-[0.3em]">
                Send
              </Button>
              <p className="text-[11px] text-muted-foreground">
                This is a design mock—connect to your backend later.
              </p>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
