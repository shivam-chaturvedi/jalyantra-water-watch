import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import NotFound from './NotFound';
import { useAppPages } from '@/hooks/useSiteConfig';
import { fetchAllDeployments, type DeploymentRecord } from '@/lib/siteAdmin';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { resolveImageSrc, toDrivePreviewUrl, extractDriveFileId } from '@/lib/driveLinks';
import { ZoomableImage } from '@/components/ImageModalContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Installation = { 
  title: string; 
  videoUrl: string; 
  notes: string;
  mediaCsv?: string;
};

type DeploymentData = {
  heading: string;
  intro: string;
  summary: string;
  summaryMediaCsv?: string;
  interviewVideoUrl: string;
  installations: Installation[];
  gallery: string[];
  previewVideoUrl: string;
  previewImages: string[];
};

function parseData(raw: Record<string, unknown>): DeploymentData {
  const installations: Installation[] = Array.isArray(raw.installations)
    ? (raw.installations as Installation[]).map((x) => ({
        title: String(x?.title ?? ''),
        videoUrl: String(x?.videoUrl ?? ''),
        notes: String(x?.notes ?? ''),
        mediaCsv: String(x?.mediaCsv ?? ''),
      }))
    : [];
  const gallery: string[] = Array.isArray(raw.gallery)
    ? (raw.gallery as string[]).filter((x) => typeof x === 'string' && x.trim())
    : [];
  return {
    heading: String(raw.heading ?? ''),
    intro: String(raw.intro ?? ''),
    summary: String(raw.summary ?? ''),
    summaryMediaCsv: String(raw.summaryMediaCsv ?? ''),
    interviewVideoUrl: String(raw.interviewVideoUrl ?? '').trim(),
    installations,
    gallery,
    previewVideoUrl: String(raw.previewVideoUrl ?? '').trim(),
    previewImages: Array.isArray(raw.previewImages)
      ? (raw.previewImages as string[]).filter((x) => typeof x === 'string' && x.trim())
      : [],
  };
}

// ─── Shared rendering helpers ─────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{text}</p>;
}

function WirePlaceholder({ label, height = 'h-48' }: { label: string; height?: string }) {
  return (
    <div className={`flex ${height} w-full items-center justify-center rounded-[22px] border-2 border-dashed border-foreground/15 bg-muted/20`}>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function VideoFrame({ src, label }: { src?: string; label: string }) {
  const url = (src ?? '').trim();
  if (!url) return <WirePlaceholder label={label} />;
  const drivePreview = toDrivePreviewUrl(url);
  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-black/5">
      <div className="mx-auto w-full max-w-[340px]">
        <div className="aspect-[9/16] w-full bg-black">
          {drivePreview ? (
            <iframe title={label} src={drivePreview} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen />
          ) : (
            <video className="h-full w-full object-cover" src={url} controls playsInline />
          )}
        </div>
      </div>
    </div>
  );
}

function DeploymentMediaGrid({ csv }: { csv?: string }) {
  const items = (csv ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((url, i) => {
        const driveId = extractDriveFileId(url);
        const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url) || (driveId && url.includes('preview'));
        return (
          <div key={i} className="overflow-hidden rounded-[18px] border border-border bg-muted/20 shadow-sm hover:shadow-md transition-shadow">
            {isVideo ? (
              <div className="aspect-video w-full bg-black">
                {toDrivePreviewUrl(url) ? (
                  <iframe title={`Media ${i}`} src={toDrivePreviewUrl(url) ?? undefined} className="h-full w-full" allow="autoplay; encrypted-media" />
                ) : (
                  <video src={url} controls className="h-full w-full object-cover" />
                )}
              </div>
            ) : (
              <ZoomableImage src={resolveImageSrc(url)} alt={`Media ${i}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Full deployment content — rendered directly inside each tab. */
function DeploymentContent({ record, data }: { record: DeploymentRecord; data: DeploymentData }) {
  return (
    <div className="space-y-8 pt-2">
      {/* Title / intro */}
      <div className="space-y-2">
        {data.heading && (
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">{data.heading}</p>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{record.title}</h2>
        {data.intro && (
          <p className="max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed italic">{data.intro}</p>
        )}
      </div>

      {/* Summary + interview video */}
      {(data.summary || data.interviewVideoUrl || data.summaryMediaCsv) && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          {(data.summary || data.summaryMediaCsv) && (
            <div className="rounded-[28px] border border-border bg-card/70 p-6 sm:p-8 shadow-sm flex flex-col">
              <SectionLabel text="Deployment Summary" />
              <div className="mt-5 flex-grow whitespace-pre-wrap text-sm sm:text-base text-muted-foreground leading-relaxed">
                {data.summary}
              </div>
              <DeploymentMediaGrid csv={data.summaryMediaCsv} />
            </div>
          )}
          {data.interviewVideoUrl && (
            <div className="rounded-[28px] border border-border bg-card/70 p-6 shadow-sm flex flex-col justify-center">
              <SectionLabel text="Interview Video" />
              <div className="mt-5">
                <VideoFrame src={data.interviewVideoUrl} label="Interview Video" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Installation sites */}
      {data.installations.length > 0 && (
        <section className="space-y-5">
          <SectionLabel text="Installation Sites" />
          <div className="space-y-5">
            {data.installations.map((inst, idx) => {
              const siteLabel = inst.title || `Site ${idx + 1}`;
              const hasVideo = !!inst.videoUrl.trim();
              const hasNotes = !!inst.notes.trim() || !!(inst.mediaCsv ?? '').trim();
              return (
                <div key={idx} className="grid gap-5 lg:grid-cols-[0.6fr_1.4fr]">
                  <div className="rounded-[28px] border border-border bg-card/70 p-6 shadow-sm flex flex-col justify-center">
                    <SectionLabel text={`Installation Video — ${siteLabel}`} />
                    <div className="mt-5">
                      {hasVideo ? (
                        <VideoFrame src={inst.videoUrl} label={`Installation Video ${idx + 1}`} />
                      ) : (
                        <WirePlaceholder label="Installation Video" />
                      )}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-border bg-card/70 p-6 sm:p-8 shadow-sm flex flex-col">
                    <SectionLabel text={`Field Notes — ${siteLabel}`} />
                    <div className="mt-5 flex-grow whitespace-pre-wrap text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {hasNotes ? inst.notes : '—'}
                    </div>
                    <DeploymentMediaGrid csv={inst.mediaCsv} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Photo gallery */}
      {data.gallery.length > 0 && (
        <section className="space-y-5">
          <SectionLabel text="Photo Gallery" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.gallery.map((url, idx) => (
              <div key={idx} className="overflow-hidden rounded-[22px] border border-border bg-card/70 shadow-sm hover:shadow-md transition-shadow">
                <ZoomableImage src={resolveImageSrc(url)} alt={`Gallery ${idx + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button asChild variant="outline" className="rounded-full border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800">
          <Link to="/#contact">Partner with us</Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeploymentsPage() {
  const pagesQuery = useAppPages();
  const isEnabled = pagesQuery.data?.find((p) => p.path === '/deployments')?.is_enabled ?? true;

  const deploymentsQuery = useQuery({
    queryKey: ['all_deployments'],
    queryFn: fetchAllDeployments,
    enabled: !(pagesQuery.isSuccess && !isEnabled),
  });

  const fallbackDeployments: DeploymentRecord[] = [
    {
      slug: 'sample-deployment',
      title: 'Sample deployment',
      updated_at: new Date(0).toISOString(),
      data: {
        heading: 'Deployments (offline fallback)',
        intro: 'Showing sample content because the latest deployments could not be loaded right now.',
        summary: 'Once the connection is back, this page will automatically show the most recent deployment entries.',
        interviewVideoUrl: '',
        installations: [
          { title: 'Installation site 1', videoUrl: '', notes: 'Add video + notes from the Admin panel.' },
          { title: 'Installation site 2', videoUrl: '', notes: 'Add video + notes from the Admin panel.' },
        ],
        gallery: [],
        previewVideoUrl: '',
        previewImages: [],
      },
    },
  ];

  const deployments = deploymentsQuery.isSuccess ? deploymentsQuery.data ?? [] : fallbackDeployments;

  const visibleDeployments = useMemo(
    () => deployments.filter((d) => {
      const data = parseData(d.data);
      return data.heading || data.intro || data.summary || data.interviewVideoUrl ||
        data.installations.length > 0 || data.gallery.length > 0;
    }),
    [deployments],
  );

  if (pagesQuery.isSuccess && !isEnabled) return <NotFound />;

  return (
    <div className="min-h-screen bg-background">
      <div className="h-[32px] w-full bg-background" aria-hidden="true" />
      <MarketingHeader centerLinks={[]} />

      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-10">

        {/* Page header */}
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Field work</p>
          <h1 className="text-3xl font-bold text-foreground">Deployments & NGO Collaboration</h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Showcase installations, farmer trainings, and community meetings. Real sensor deployments, real impact.
          </p>
        </div>

        {/* Loading state */}
        {deploymentsQuery.isLoading && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-sm">Loading deployments…</p>
          </div>
        )}

        {/* Empty state */}
        {deploymentsQuery.isSuccess && !deploymentsQuery.isLoading && visibleDeployments.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-[28px] border-2 border-dashed border-foreground/15 py-20 text-center">
            <p className="text-sm font-medium text-muted-foreground">No deployments published yet.</p>
            <p className="text-xs text-muted-foreground">
              Add deployment content in the{' '}
              <a href="/admin" className="text-teal-600 hover:underline">Admin panel</a>.
            </p>
          </div>
        )}

        {/* Deployments — one tab per site, full content shown directly */}
        {visibleDeployments.length > 0 && (
          <Tabs defaultValue={visibleDeployments[0].slug} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 rounded-[20px] border border-border bg-muted/40 p-1">
              {visibleDeployments.map((record) => (
                <TabsTrigger
                  key={record.slug}
                  value={record.slug}
                  className="rounded-[14px] px-4 py-2 text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                >
                  {record.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {visibleDeployments.map((record) => {
              const data = parseData(record.data);
              return (
                <TabsContent key={record.slug} value={record.slug} className="mt-6">
                  <DeploymentContent record={record} data={data} />
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
}
