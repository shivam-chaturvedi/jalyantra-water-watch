import { ChangeEvent, FormEvent, MouseEvent, useCallback, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";
import GoogleTranslateDropdown from "@/components/GoogleTranslate";
import { useAppPages, useSiteFlags } from "@/hooks/useSiteConfig";
import NotFound from "./NotFound";
import { useQuery } from "@tanstack/react-query";
import { fetchDeployment, fetchSiteContent } from "@/lib/siteAdmin";
import { mergeHomeContentWithDefaults } from "@/lib/contentDefaults";
import { 
  resolveImageSrc, 
  toDrivePreviewUrl, 
  extractDriveFileId 
} from "@/lib/driveLinks";
import { ZoomableImage } from "@/components/ImageModalContext";
import { FileText, PlayCircle, Video, Award } from "lucide-react";

const baseNavLinks = [
  { label: "Home", id: "home" },
  { label: "Deployments", id: "deployments" },
  { label: "Contact", id: "contact" },
] as const;


const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

function isHashLink(value: unknown): value is string {
  return typeof value === "string" && value.trim().startsWith("#");
}

function HeroCarousel({ items }: { items: string[] }) {
  const [index, setIndex] = useState(0);

  // Auto-cycling removed for manual control as requested
  /*
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items]);
  */

  const raw = items[index];
  const parts = raw.split('|');
  const current = parts[0];
  const thumbnailUrl = parts[1] ? resolveImageSrc(parts[1]) : null;

  const driveId = extractDriveFileId(current);
  const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(current) || (driveId && current.includes('preview'));

  return (
    <div className="h-full w-full relative">
      {isVideo ? (
        <div className="h-full w-full bg-black">
          {toDrivePreviewUrl(current) ? (
            <iframe
              title="Hero video"
              src={toDrivePreviewUrl(current) ?? undefined}
              className="h-full w-full"
              allow="encrypted-media"
              allowFullScreen
            />
          ) : (
            <video 
              src={current} 
              controls
              poster={thumbnailUrl ?? undefined}
              loop 
              playsInline 
              className="h-full w-full object-cover" 
            />
          )}
        </div>
      ) : (
        <ZoomableImage
          src={resolveImageSrc(current)}
          alt="Carousel item"
          className="h-full w-full object-cover animate-in fade-in zoom-in duration-1000"
        />
      )}

      
      {items.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-teal-500" : "w-1.5 bg-white/50 hover:bg-white/80"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const flagsQuery = useSiteFlags();
  const pagesQuery = useAppPages();
  const homeContentQuery = useQuery({
    queryKey: ["site_content", "home"],
    queryFn: () => fetchSiteContent("home"),
  });
  const deploymentsPreviewQuery = useQuery({
    queryKey: ["deployments", "alibaug-raigad", "preview"],
    queryFn: () => fetchDeployment("alibaug-raigad"),
  });

  const isHomeEnabled =
    pagesQuery.data?.find((p) => p.path === "/")?.is_enabled ?? true;
  const isDashboardEnabled =
    pagesQuery.data?.find((p) => p.path === "/dashboard")?.is_enabled ?? true;
  const showDeploymentsSection = flagsQuery.data?.show_deployments ?? true;
  const showValidationSection = flagsQuery.data?.show_validation ?? false;
  const showCarouselSection = flagsQuery.data?.show_image_carousel ?? true;

  if (pagesQuery.isSuccess && !isHomeEnabled) {
    return <NotFound />;
  }

  const homeContent = useMemo(
    () => mergeHomeContentWithDefaults(homeContentQuery.data ?? {}),
    [homeContentQuery.data],
  );
  const hero = homeContent.hero;
  const insights = homeContent.insights;
  const dashboardContent = homeContent.dashboard;
  const deploymentsContent = homeContent.deployments;
  const validationContent = homeContent.validation;
  const contactContent = homeContent.contact;

  const primaryCtaHref = String((hero as any).primaryCtaHref ?? "/dashboard").trim() || "/dashboard";
  const secondaryCtaHref = String((hero as any).secondaryCtaHref ?? "#how-it-works").trim() || "#how-it-works";

  const dashboardScreenshots = useMemo(() => {
    const csv = String(dashboardContent.screenshotsCsv ?? "").trim();
    return csv
      ? csv
          .split(",")
          .map((u: string) => u.trim())
          .filter(Boolean)
      : [];
  }, [dashboardContent.screenshotsCsv]);

  const deploymentsPreview = (deploymentsPreviewQuery.data?.data ?? {}) as any;
  const deploymentsPreviewVideoUrl = String(deploymentsPreview.previewVideoUrl ?? "").trim();
  const deploymentsPreviewImages = useMemo(() => {
    const arr = Array.isArray(deploymentsPreview.previewImages) ? deploymentsPreview.previewImages : [];
    const urls = arr.filter((x: unknown) => typeof x === "string") as string[];
    return urls.length ? urls.slice(0, 4) : [];
  }, [deploymentsPreview.previewImages]);

  const isDeploymentsPageEnabled =
    pagesQuery.data?.find((p) => p.path === "/deployments")?.is_enabled ?? true;

  const navLinks = baseNavLinks.filter((link) => {
    if (link.id === "deployments") return showDeploymentsSection;
    if (link.id === "validation") return showValidationSection;
    if (link.id === "dashboard") return isDashboardEnabled;
    return true;
  });

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
      setStatusMessage(contactContent.form.requiredErrorMessage);
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
      setStatusMessage(contactContent.form.sentMessage);
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
        contactContent.form.genericErrorMessage
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
            {isDashboardEnabled && (
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
            )}
          </div>
          </div>
        </header>

        <main className="space-y-24 pt-8 pb-16">
          <div className="w-full">
            <section className="container mx-auto px-4" id="home">
              <div className="grid gap-10 rounded-[32px] border border-border bg-card px-4 sm:px-8 py-10 sm:py-14 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-7">
                  <p className="text-base uppercase tracking-[0.4em] font-bold" style={{ color: '#0d9488' }}>
                    {hero.kicker ?? "Smarter monitoring"}
                  </p>
                  <h1
                    className="text-3xl sm:text-5xl text-foreground md:text-6xl leading-tight"
                    style={{ fontFamily: "Arial, sans-serif", fontWeight: 400 }}
                  >
                    {hero.title ?? "Smarter groundwater monitoring for rural India"}
                  </h1>
                  <p
                    className="text-lg sm:text-xl text-muted-foreground leading-relaxed"
                    style={{ fontFamily: "Arial, sans-serif", fontWeight: 400 }}
                  >
                    {hero.description ??
                      "JalYantra is an IoT groundwater monitoring system designed for deep agricultural borewells and open wells in drought-prone districts."}
                  </p>
                  <div className="space-y-3 text-base text-muted-foreground">
                    <p>
                      <span className="font-bold" style={{ color: '#0f766e' }}>Problem:</span>{" "}
                      {hero.problem ?? "Lack of continuous, local-level groundwater monitoring across seasons."}
                    </p>
                    <p>
                      <span className="font-bold" style={{ color: '#0f766e' }}>Solution:</span>{" "}
                      {hero.solution ?? "LIDAR-based measurement with real-time dashboard insights for crop planning."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Button asChild size="lg" className="rounded-full px-8 py-3 text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-lg">
                      <a
                        href={primaryCtaHref}
                        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                          if (isHashLink(primaryCtaHref)) {
                            e.preventDefault();
                            scrollToSection(primaryCtaHref.slice(1));
                            return;
                          }
                          if (primaryCtaHref === "/dashboard") {
                            navigateToDashboard(e);
                          }
                        }}
                      >
                        {hero.primaryCta ?? "Go to Dashboard"}
                      </a>
                    </Button>
                    {isHashLink(secondaryCtaHref) ? (
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-blue-600 px-8 py-3 text-base font-bold"
                        onClick={() => scrollToSection(secondaryCtaHref.slice(1))}
                      >
                        {hero.secondaryCta ?? "Learn how it works"}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="rounded-full border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-blue-600 px-8 py-3 text-base font-bold"
                      >
                        <a href={secondaryCtaHref}>{hero.secondaryCta ?? "Learn how it works"}</a>
                      </Button>
                    )}
                  </div>
                </div>
                {showCarouselSection && (() => {
                  const mediaUrls = (hero.carouselMediaCsv || "").split(",").map(s => s.trim()).filter(Boolean);
                  const hasMedia = mediaUrls.length > 0;
                  
                  return (
                    <div className="rounded-[32px] border border-border bg-muted/30 p-4 sm:p-8 text-center">
                      <img
                        src={hero.logoUrl ?? "/logo.jpeg"}
                        alt="JalYantra logo"
                        className="mx-auto h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-teal-100"
                      />
                      
                      <div className="mt-6 relative h-64 sm:h-80 w-full rounded-[24px] overflow-hidden bg-muted group">
                        {!hasMedia ? (
                          <div className="h-full w-full flex items-center justify-center bg-teal-50/30">
                            <Award className="h-16 w-16 text-teal-100" />
                          </div>
                        ) : (
                          <HeroCarousel items={mediaUrls} />
                        )}
                      </div>
                      <div className="mt-4" />
                    </div>
                  );
                })()}

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
	              <p className="section-heading-label">{insights.kicker}</p>
	              <h2 className="section-heading-title">{insights.heading}</h2>
	              <p className="section-heading-description">
	                {insights.description}
	              </p>
	            </div>
	            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
		              {insights.cards.map((card, index) => (
		                <div key={card.title} className="rounded-[24px] border-2 border-teal-100 bg-card/70 p-6 shadow-md hover:shadow-lg hover:border-teal-300 transition-all">
		                  {card.icon && (
		                    <ZoomableImage
		                      src={resolveImageSrc(card.icon)}
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
	              <p className="text-base uppercase tracking-[0.4em] font-bold" style={{ color: '#0d9488' }}>{dashboardContent.kicker}</p>
	              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{dashboardContent.heading}</h2>
	              <p className="text-lg text-muted-foreground leading-relaxed">
	                {dashboardContent.description}
	              </p>
	            </div>
	            <div className="grid gap-5 md:grid-cols-4">
	              {dashboardContent.stats.map((stat: any) => (
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
				                  <span className="text-lg font-bold text-foreground">{dashboardContent.alertsTitle}</span>
				                  <span className="text-sm font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full">
				                    {dashboardContent.alerts.length} Active
				                  </span>
				                </div>
				                <div className="mt-5 space-y-3 text-muted-foreground">
				                  {dashboardContent.alerts.map((alert: any) => (
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
                    <p className="text-lg font-bold text-foreground">{dashboardContent.mapTitle ?? "Interactive Sensor Map"}</p>
                    <p className="text-sm text-muted-foreground mt-1">{dashboardContent.mapSubtitle ?? "Click markers for readings"}</p>
                  </div>
                  <span className="rounded-full border-2 border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-600">
                    {dashboardContent.mapBadge ?? "5 sensors"}
                  </span>
                </div>
                <ZoomableImage
                  src={resolveImageSrc(dashboardContent.mapImageUrl ?? "/interactive-map.png")}
                  alt="Interactive sensor map"
                  className="h-64 w-full rounded-[24px] object-cover"
                />
	                <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: '#14b8a6' }}>
	                  {dashboardContent.mapChips.map((chip: string) => (
	                    <span key={chip}>{chip}</span>
	                  ))}
	                </div>
	              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {dashboardScreenshots.map((url) => (
                <ZoomableImage
                  key={url}
                  src={resolveImageSrc(url)}
                  alt="Dashboard screenshot"
                  className="w-full h-[280px] sm:h-[420px] rounded-[28px] object-cover border-2 border-teal-100 shadow-md hover:shadow-xl transition-all"
                />
              ))}
            </div>

          </section>

	          {showDeploymentsSection && (
	            <section className="container mx-auto space-y-8 px-4" id="deployments">
	              <div className="space-y-2">
	                <p className="text-xs uppercase tracking-[0.4em] text-[#0f9d7b]">{deploymentsContent.kicker}</p>
	                <h2 className="text-3xl font-bold text-foreground">{deploymentsContent.heading}</h2>
	                <p className="text-sm text-muted-foreground">
	                  {deploymentsContent.description}
	                </p>
                </div>
              <div className="grid gap-3 lg:grid-cols-2">

                <div className="rounded-[24px] border border-border bg-card/70 p-3 sm:p-4 flex flex-col justify-center">
                  <div className="overflow-hidden rounded-[20px] bg-muted shadow-sm">
                    {deploymentsPreviewVideoUrl ? (
                      <div className="mx-auto w-full">
                        <div className="aspect-[16/9] w-full bg-black shadow-lg">
                          {toDrivePreviewUrl(deploymentsPreviewVideoUrl) ? (
                            <iframe
                              title="Deployment preview video"
                              src={toDrivePreviewUrl(deploymentsPreviewVideoUrl) ?? undefined}
                              className="h-full w-full"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            />
                          ) : (
                            <video className="h-full w-full object-cover" src={deploymentsPreviewVideoUrl} controls playsInline />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 w-full flex items-center justify-center text-xs font-mono text-muted-foreground">
                        {deploymentsContent.videoPlaceholder}
                      </div>
                    )}
                  </div>
                  {deploymentsContent.videoCaption && !deploymentsContent.videoCaption.includes('managed from the Admin panel') && (
                    <p className="mt-2 text-center text-[11px] text-muted-foreground italic leading-tight">
                      {deploymentsContent.videoCaption}
                    </p>
                  )}
                </div>

                <div className="grid gap-2 grid-cols-2">
                  {(deploymentsPreviewImages.length ? deploymentsPreviewImages : deploymentsContent.placeholderCards.slice(0, 4)).map((item: any, idx: number) =>
                    typeof item === "string" ? (
                      <div key={item} className="overflow-hidden rounded-[20px] border border-border bg-card/70 shadow-sm transition-all hover:shadow-md aspect-[4/3] h-full">
                        <ZoomableImage
                          src={resolveImageSrc(item)}
                          alt={`Deployment preview ${idx + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div key={item.title} className="rounded-[20px] border border-border bg-card/70 p-3 flex flex-col justify-center items-center text-center aspect-[4/3] h-full">
                        <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center mb-1">
                          <Award className="h-5 w-5 text-teal-200" />
                        </div>
                        <h3 className="text-[10px] font-semibold text-foreground leading-tight">{item.title}</h3>
                        <p className="text-[9px] text-muted-foreground leading-tight">{item.subtitle}</p>
                      </div>
                    ),
                  )}
                </div>
              </div>



              {isDeploymentsPageEnabled && (
                <div className="flex justify-center pt-2">
                  <Button
                    size="lg"
                    className="rounded-full px-10 py-3 text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-lg"
                    onClick={() => window.location.assign('/deployments')}
	                  >
	                    {deploymentsContent.showMoreLabel}
	                  </Button>
	                </div>
	              )}
	            </section>
	          )}

	          {showValidationSection && (
	            <section className="container mx-auto space-y-8 px-4" id="validation">
	              <div className="space-y-2">
	                <p className="text-xs uppercase tracking-[0.4em] text-[#0f9d7b]">{validationContent.kicker}</p>
	                <h2 className="text-3xl font-bold text-foreground">{validationContent.heading}</h2>
	                <p className="text-sm text-muted-foreground">
	                  {validationContent.description}
	                </p>
	              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {validationContent.cards.map((card) => {
                  const mediaUrl = card.mediaUrl || "";
                  const driveId = extractDriveFileId(mediaUrl);
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(mediaUrl) || (driveId && !mediaUrl.includes('preview'));
                  const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(mediaUrl) || (driveId && mediaUrl.includes('preview'));
                  const isDoc = !isImage && !isVideo && mediaUrl.length > 0;

                  return (
                    <div key={card.title} className="group relative rounded-[32px] border border-border bg-card/70 p-5 transition-all hover:shadow-lg">
                      <div className="overflow-hidden rounded-[20px] bg-muted h-32 w-full flex items-center justify-center">
                        {isImage ? (
                          <ZoomableImage
                            src={resolveImageSrc(mediaUrl)}
                            alt={card.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : isVideo ? (
                          <div className="relative h-full w-full bg-black flex items-center justify-center">
                            <Video className="h-10 w-10 text-white/50" />
                            <a 
                              href={mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <PlayCircle className="h-12 w-12 text-white" />
                            </a>
                          </div>
                        ) : isDoc ? (
                          <a 
                            href={mediaUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 text-teal-600 hover:text-teal-700 transition-colors"
                          >
                            <FileText className="h-12 w-12" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">View Document</span>
                          </a>
                        ) : (
                          <div className="h-full w-full bg-teal-50/50 flex items-center justify-center">
                            <Award className="h-10 w-10 text-teal-200" />
                          </div>
                        )}
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-foreground">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.detail}</p>
                    </div>
                  );
                })}
              </div>

	              <div className="space-y-3">
	                <h3 className="text-2xl font-semibold text-foreground">{validationContent.testimonialsHeading}</h3>
	                <p className="text-sm text-muted-foreground">
	                  {validationContent.testimonialsDescription}
	                </p>
	                <div className="grid gap-4 md:grid-cols-3">
	                  {validationContent.testimonials.map((testimonial) => (
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
	              <p className="text-base uppercase tracking-[0.4em] font-bold" style={{ color: '#0d9488' }}>{contactContent.kicker}</p>
	              <div className="flex flex-col sm:flex-row items-center gap-4">
                <img
                  src="/logo.jpeg"
                  alt="JalYantra logo"
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-teal-200 shadow-md"
                />
	                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{contactContent.heading}</h2>
	              </div>
	              <p className="text-lg text-muted-foreground leading-relaxed">
	                {contactContent.description}
	              </p>
	            </div>
	            <div className="grid gap-8 rounded-[32px] border-2 border-teal-100 bg-card/80 p-4 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
	              <div className="space-y-5">
	                <div className="contact-card">
	                  <p className="text-base font-bold text-white uppercase tracking-[0.4em]">{contactContent.pilotNeedsHeading}</p>
	                  <ul className="mt-4 list-disc space-y-3 pl-5 text-base">
	                    {contactContent.pilotNeedsItems.map((item) => (
	                      <li key={item}>{item}</li>
	                    ))}
	                  </ul>
	                  <p className="contact-note mt-5">
	                    {contactContent.emailLabel} <span>{contactContent.emailValue}</span>
	                  </p>
	                  <p className="contact-note">
	                    {contactContent.locationLabel} <span>{contactContent.locationValue}</span>
	                  </p>
	                </div>
	              </div>
	              <form className="space-y-4" onSubmit={handleContactSubmit}>
	                <input
	                  type="text"
	                  placeholder={contactContent.form.namePlaceholder}
	                  name="name"
                  value={contactInfo.name}
                  onChange={handleContactChange}
                  required
                  className="w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
                />
	                <input
	                  type="text"
	                  placeholder={contactContent.form.organizationPlaceholder}
	                  name="organization"
                  value={contactInfo.organization}
                  onChange={handleContactChange}
                  className="w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
                />
	                <input
	                  type="email"
	                  placeholder={contactContent.form.emailPlaceholder}
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
	                    {contactContent.form.interestPlaceholder}
	                  </option>
	                  {contactContent.form.interestOptions.map((opt) => (
	                    <option key={opt} value={opt}>
	                      {opt}
	                    </option>
	                  ))}
	                </select>
	                <textarea
	                  placeholder={contactContent.form.detailsPlaceholder}
	                  name="details"
                  value={contactInfo.details}
                  onChange={handleContactChange}
                  className="h-28 w-full rounded-[18px] border-2 border-teal-100 bg-card/60 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
	                />
	                <Button className="w-full rounded-full bg-teal-600 hover:bg-teal-700 text-base font-bold uppercase tracking-[0.3em] py-6 shadow-md">
	                  {status === "sending" ? contactContent.form.sendingLabel : contactContent.form.submitLabel}
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
