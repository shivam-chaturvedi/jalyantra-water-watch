import { ChangeEvent, FormEvent, MouseEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import GoogleTranslateDropdown from "@/components/GoogleTranslate";

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
  { label: "Total Sensors", value: "5", note: "Monitored locations" },
  { label: "Average Depth", value: "6.1m", note: "State-wide average" },
  { label: "Critical Districts", value: "0%", note: "Above 20m depth threshold" },
  { label: "Fastest Decline", value: "Mumbai", note: "-1.4m in 30 days" },
];

const alertItems: Array<{ tone: "danger" | "success"; text: string }> = [
  { tone: "danger", text: "Nagpur: Rapid drop of 1.3 m in recent readings" },
  {
    tone: "success",
    text: "Pune: Sensors are being monitored continuously — no critical alerts.",
  },
  { tone: "danger", text: "Nashik: Average depth at 25m – critical zone" },
  { tone: "success", text: "Mumbai: Average depth at 3.5 – safe zone" },
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
  const [contactInfo, setContactInfo] = useState({
    name: "",
    organization: "",
    email: "",
    interest: "",
    details: "",
  });

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [statusMessage, setStatusMessage] = useState("");

  const handleContactChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;
    setContactInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !contactInfo.name.trim() ||
      !contactInfo.email.trim() ||
      !contactInfo.interest.trim()
    ) {
      setStatus("error");
      setStatusMessage("Please fill Name, Email, and Interested in.");
      return;
    }

    setStatus("sending");
    setStatusMessage("Sending your request…");

    try {
      const response = await fetch(
        "https://mailer-azure-nu.vercel.app/api/send-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "support@jalyantra.tech",
            subject: `New pilot inquiry from ${contactInfo.name || "visitor"}`,
            text: `Name: ${contactInfo.name}
Organization: ${contactInfo.organization}
Email: ${contactInfo.email}
Interest: ${contactInfo.interest}
Details: ${contactInfo.details}`,
            html: `<p><strong>Name:</strong> ${contactInfo.name}</p>
<p><strong>Organization:</strong> ${contactInfo.organization}</p>
<p><strong>Email:</strong> ${contactInfo.email}</p>
<p><strong>Interest:</strong> ${contactInfo.interest}</p>
<p><strong>Details:</strong><br/>${contactInfo.details}</p>`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setStatus("sent");
      setStatusMessage("Thanks! Your inquiry has been delivered.");
      setContactInfo({
        name: "",
        organization: "",
        email: "",
        interest: "",
        details: "",
      });
    } catch (error: unknown) {
      console.error("Contact form error", error);
      setStatus("error");
      setStatusMessage(
        "Something went wrong. Please try again or email support@jalyantra.tech directly."
      );
    }
  };

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const navigateToDashboard = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign("/dashboard");
  }, []);

  const navigateToHome = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign("/");
  }, []);

  return (
    <>
      <div className="h-[32px] w-full bg-background" aria-hidden="true" />
      <div className="bg-background text-foreground">
        <header className="border-b border-border bg-card/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
          <div className="container mx-auto flex items-center gap-3 px-4 py-2">
            <a
              href="/"
              onClick={navigateToHome}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <img
                src="/logo.jpeg"
                alt="JalYantra logo"
                className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-xl object-cover ring-2 ring-teal-200 shadow-md"
              />
              <div>
                <p className="text-base sm:text-lg font-bold uppercase tracking-wide" style={{ color: '#0f766e', fontFamily: 'Poppins, Inter, sans-serif' }}>
                  JalYantra
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-medium hidden sm:block">
                  Groundwater Intelligence
                </p>
              </div>
            </a>
            <nav className="hidden md:flex flex-1 justify-center gap-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {navLinks.map((link) => (
                <a key={link.id} href={`#${link.id}`} className="hover:text-teal-600 transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
          <div className="ml-auto flex items-center gap-2">
            <GoogleTranslateDropdown className="max-w-[120px] sm:max-w-[180px]" />
            <Button
              asChild
              size="sm"
              className="rounded-full px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 hover:text-white shadow-md whitespace-nowrap"
            >
              <a
                href="/dashboard"
                onClick={navigateToDashboard}
                className="text-white hover:text-white"
              >
                <p className="text-white"> Dashboard</p>
              </a>
            </Button>
          </div>
          </div>
        </header>

        <main className="space-y-24 pt-8 pb-16">
          <div className="w-full">
            <section className="container mx-auto px-4" id="features">
              <div className="grid gap-10 rounded-[32px] border border-border bg-card px-8 py-14 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-7">
                  <p className="text-base uppercase tracking-[0.4em] font-bold" style={{ color: '#0d9488' }}>Smarter monitoring</p>
                  <h1
                    className="text-5xl text-foreground md:text-6xl leading-tight"
                    style={{ fontFamily: "Arial, sans-serif", fontWeight: 400 }}
                  >
                    Smarter groundwater monitoring for rural India
                  </h1>
                  <p
                    className="text-xl text-muted-foreground leading-relaxed"
                    style={{ fontFamily: "Arial, sans-serif", fontWeight: 400 }}
                  >
                    JalYantra is an IoT groundwater monitoring system designed for deep agricultural borewells
                    and open wells in drought-prone districts.
                  </p>
                  <div className="space-y-3 text-base text-muted-foreground">
                    <p>
                      <span className="font-bold" style={{ color: '#0f766e' }}>Problem:</span>{" "}
                      Lack of continuous, local-level groundwater monitoring across seasons.
                    </p>
                    <p>
                      <span className="font-bold" style={{ color: '#0f766e' }}>Solution:</span>{" "}
                      LIDAR-based measurement with real-time dashboard insights for crop planning.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Button asChild size="lg" className="rounded-full px-8 py-3 text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-lg">
                      <a href="/dashboard" onClick={navigateToDashboard}>
                        Go to Dashboard
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-full border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-blue-600 px-8 py-3 text-base font-bold"
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

            <div className="waves-container w-full overflow-hidden -mt-4 relative z-0">
              <svg
                className="parallax"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                viewBox="0 24 150 28"
                preserveAspectRatio="none"
                shapeRendering="auto"
                style={{ width: '100%', height: '100%' }}
              >
                <defs>
                  <path
                    id="gentle-wave"
                    d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
                  />
                </defs>
                <g className="parallax">
                  <use xlinkHref="#gentle-wave" x="48" y="0" />
                  <use xlinkHref="#gentle-wave" x="48" y="3" />
                  <use xlinkHref="#gentle-wave" x="48" y="5" />
                  <use xlinkHref="#gentle-wave" x="48" y="7" />
                </g>
              </svg>
            </div>
          </div>

          <section className="container mx-auto space-y-8 px-4" id="how-it-works">
            <div className="space-y-3">
              <p className="section-heading-label">Insights that drive action</p>
              <h2 className="section-heading-title">Insights that turn into action</h2>
              <p className="section-heading-description">
                Designed for farmers, NGOs, and panchayat stakeholders—clear visuals, simple language, and exportable evidence.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {insightCards.map((card, index) => (
                <div key={card.title} className="rounded-[24px] border-2 border-teal-100 bg-card/70 p-6 shadow-md hover:shadow-lg hover:border-teal-300 transition-all">
                  {card.icon && (
                    <img
                      src={card.icon}
                      alt={`${card.title} icon`}
                      className="mb-3 h-14 w-14"
                    />
                  )}
                  <p className="text-sm font-bold" style={{ color: '#14b8a6' }}>0{index + 1}</p>
                  <h3 className="text-xl font-bold text-foreground mt-1">{card.title}</h3>
                  <p className="text-base text-muted-foreground mt-2 leading-relaxed">{card.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="container mx-auto space-y-8 px-4" id="dashboard">
            <div className="space-y-3 text-center">
              <p className="text-base uppercase tracking-[0.4em] font-bold" style={{ color: '#0d9488' }}>Dashboard</p>
              <h2 className="text-4xl font-bold text-foreground">What users see</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A clean summary for quick decisions—then drill down to districts, locations, graphs, and exportable history.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-4">
              {dashboardStats.map((stat) => (
                <div key={stat.label} className="rounded-[24px] border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 text-muted-foreground shadow-md">
                  <p className="text-sm uppercase tracking-[0.3em] font-semibold text-teal-500">{stat.label}</p>
                  <p className="mt-2 text-4xl font-extrabold" style={{ color: '#0f766e' }}>{stat.value}</p>
                  <p className="text-base text-muted-foreground mt-1">{stat.note}</p>
                </div>
              ))}
            </div>
	            <div className="grid gap-5 lg:grid-cols-[0.6fr_1.4fr]">
	              <div className="rounded-[32px] border-2 border-teal-100 bg-card/70 p-7">
	                <div className="flex items-center justify-between">
	                  <span className="text-lg font-bold text-foreground">Active Alerts</span>
	                  <span className="text-sm font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full">
	                    {alertItems.length} Active
	                  </span>
	                </div>
	                <div className="mt-5 space-y-3 text-muted-foreground">
	                  {alertItems.map((alert) => (
	                    <p
	                      key={alert.text}
	                      className={
	                        alert.tone === "danger"
	                          ? "rounded-2xl border border-[#f4c2c2] bg-[#fff5f5] px-5 py-4 text-sm font-medium text-[#a02e2e]"
	                          : "rounded-2xl border border-[#bfe9c6] bg-[#f2fff5] px-5 py-4 text-sm font-medium text-[#1b6b2a]"
	                      }
	                    >
	                      {alert.tone === "danger" ? "⚠️" : "✅"} {alert.text}
	                    </p>
	                  ))}
	                </div>
	              </div>
              <div className="rounded-[32px] border-2 border-teal-100 bg-card/70 p-7">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">Interactive Sensor Map</p>
                    <p className="text-sm text-muted-foreground mt-1">Click markers for readings</p>
                  </div>
                  <span className="rounded-full border-2 border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-600">
                    5 sensors
                  </span>
                </div>
                <img
                  src="/interactive-map.png"
                  alt="Interactive sensor map"
                  className="h-64 w-full rounded-[24px] object-cover"
                />
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: '#14b8a6' }}>
                  <span>📍 Layer: Sensor</span>
                  <span>🌐 Layer: Network</span>
                  <span>🔍 Drill-down modal</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
              <img src="/1.png" alt="Alert 1" className="w-full h-[300px] md:h-[600px] rounded-[24px] object-cover border-2 border-teal-100 shadow-md hover:shadow-lg transition-all" />
              <img src="/graph.png" alt="Graph" className="w-full h-[300px] md:h-[600px] rounded-[24px] object-cover border-2 border-teal-100 shadow-md hover:shadow-lg transition-all" />
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
            <div className="space-y-3">
              <p className="text-base uppercase tracking-[0.4em] font-bold" style={{ color: '#0d9488' }}>Contact</p>
              <div className="flex items-center gap-4">
                <img
                  src="/logo.jpeg"
                  alt="JalYantra logo"
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-teal-200 shadow-md"
                />
                <h2 className="text-4xl font-bold text-foreground">Run a pilot with us</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                If you're an NGO, CSR team, research group, or panchayat network working on drought resilience, we can set up a pilot and track clear impact outcomes.
              </p>
            </div>
            <div className="grid gap-8 rounded-[32px] border-2 border-teal-100 bg-card/80 p-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div className="contact-card">
                  <p className="text-base font-bold text-white uppercase tracking-[0.4em]">Pilot needs</p>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-base">
                    <li>Access to borewells + farmer consent</li>
                    <li>Coordination for installation & community meetings</li>
                    <li>Baseline + follow-up monitoring to evaluate impact</li>
                  </ul>
                  <p className="contact-note mt-5">
                    Email us at <span>support@jalyantra.tech</span>
                  </p>
                  <p className="contact-note">
                    Location: <span>Maharashtra (pilot geographies)</span>
                  </p>
                </div>
              </div>
              <form className="space-y-4" onSubmit={handleContactSubmit}>
                <input
                  type="text"
                  placeholder="Your Name"
                  name="name"
                  value={contactInfo.name}
                  onChange={handleContactChange}
                  required
                  className="w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
                />
                <input
                  type="text"
                  placeholder="Organization"
                  name="organization"
                  value={contactInfo.organization}
                  onChange={handleContactChange}
                  className="w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
                />
                <input
                  type="email"
                  placeholder="support@jalyantra.tech"
                  name="email"
                  value={contactInfo.email}
                  onChange={handleContactChange}
                  required
                  className="w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
                />
                <select
                  name="interest"
                  value={contactInfo.interest}
                  onChange={handleContactChange}
                  required
                  className="w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground focus:outline-none focus:border-teal-400"
                >
                  <option value="" disabled>
                    Interested in…
                  </option>
                  <option value="Dashboards & alerts">Dashboards & alerts</option>
                  <option value="Field deployment">Field deployment</option>
                  <option value="Validation support">Validation support</option>
                </select>
                <textarea
                  placeholder="Tell us your district(s), number of borewells, and what outcomes you want to measure."
                  name="details"
                  value={contactInfo.details}
                  onChange={handleContactChange}
                  className="h-28 w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
                />
                <Button className="w-full rounded-full bg-teal-600 hover:bg-teal-700 text-base font-bold uppercase tracking-[0.3em] py-6 shadow-md">
                  {status === "sending" ? "Sending..." : "Send Message"}
                </Button>
                {status !== "idle" && (
                  <p
                    className={
                      status === "sent" ? "text-green-700" : "text-red-600"
                    }
                  >
                    {statusMessage}
                  </p>
                )}
              </form>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
