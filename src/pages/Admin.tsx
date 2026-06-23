import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Eye, Home, BarChart2, Film, MapPin, Upload,
  Plus, Trash2, Video, LogOut, ExternalLink,
  CheckCircle2, Menu, X, Camera, FileText,
  ChevronDown, ChevronUp, Settings, Signal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAppPages,
  fetchSiteContent,
  fetchSiteFlags,
  fetchAllDeployments,
  setAppPageEnabled,
  setSiteContent,
  setSiteFlag,
  setDeployment,
  deleteDeployment,
  uploadFileToBucket,
  fetchAllDeviceMasterData,
  upsertDeviceMasterData,
  deleteDeviceMasterData,
  type SiteFlagKey,
  type DeploymentRecord,
  type DeviceMasterData,
} from '@/lib/siteAdmin';
import {
  mergeHomeContentWithDefaults,
  IWA_DIGITAL_WATER_SUMMIT_CERTIFICATE_TITLE,
} from '@/lib/contentDefaults';
import { 
  resolveImageSrc, 
  toDrivePreviewUrl, 
  extractDriveFileId,
  toDriveStreamUrl
} from '@/lib/driveLinks';
import { useLiveDevices } from '@/hooks/useLiveDevices';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminSection =
  | 'visibility'
  | 'hero'
  | 'insights'
  | 'dashboard'
  | 'validation'
  | 'contact'
  | 'deployments-preview'
  | 'deployments-page'
  | 'devices'
  | 'media';

type Installation = { title: string; videoUrl: string; notes: string; mediaCsv?: string };

// ─── Sidebar config ───────────────────────────────────────────────────────────

const SIDEBAR_ITEMS: Array<{
  id: AdminSection;
  icon: React.ElementType;
  label: string;
  desc: string;
}> = [
  { id: 'visibility', icon: Eye, label: 'Visibility & Pages', desc: 'Toggle sections & enable routes' },
  { id: 'hero', icon: Home, label: 'Hero Section', desc: 'Headline, tagline & media' },
  { id: 'insights', icon: CheckCircle2, label: 'Insights Section', desc: 'How-it-works cards + copy' },
  { id: 'dashboard', icon: BarChart2, label: 'Dashboard Section', desc: 'KPI cards, alerts & map' },
  { id: 'validation', icon: FileText, label: 'Validation Section', desc: 'Certificates + testimonials' },
  { id: 'contact', icon: Settings, label: 'Contact Section', desc: 'Pilot CTA + form copy' },
  { id: 'deployments-page', icon: MapPin, label: 'Deployments Page', desc: 'Manage all entries & home preview' },
  { id: 'devices', icon: Signal, label: 'Live Devices', desc: 'Pump vs non-pump per live device' },
  { id: 'media', icon: Upload, label: 'Media Upload', desc: 'Upload images, videos & PDFs' },
];

const FLAG_DEFS: Array<{ key: SiteFlagKey; label: string; description: string }> = [
  { key: 'show_deployments', label: 'Deployments section', description: 'Show/hide deployment cards section on Home.' },
  { key: 'show_validation', label: 'Validation section', description: 'Show/hide validation section on Home.' },
  { key: 'show_image_carousel', label: 'Image carousel', description: 'Show/hide carousel section on Home (if present).' },
];

// ─── Video Thumbnail Picker ──────────────────────────────────────────────────

function VideoThumbnailPicker({ 
  videoUrl, 
  onCapture, 
  disabled,
  bucket = 'site-media'
}: { 
  videoUrl: string; 
  onCapture: (url: string) => void; 
  disabled?: boolean;
  bucket?: 'site-media' | 'deployments-media';
}) {
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setCapturing(true);
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `thumbnail-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const res = await uploadFileToBucket(bucket, file, { folder: 'thumbnails' });
        onCapture(res.publicUrl);
        toast({ title: 'Thumbnail captured!' });
      }, 'image/jpeg', 0.85);
    } catch (err) {
      toast({ title: 'Capture failed', variant: 'destructive' });
    } finally {
      setCapturing(false);
    }
  };

  const displayUrl = toDriveStreamUrl(videoUrl) || videoUrl;
  const isDrive = !!extractDriveFileId(videoUrl);

  return (
    <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Set Video Thumbnail</p>
        <Button 
          type="button" 
          size="sm" 
          onClick={captureFrame} 
          disabled={disabled || capturing || isDrive}
          className="bg-teal-600 hover:bg-teal-700 text-white h-7 text-[10px]"
        >
          {capturing ? 'Capturing...' : 'Capture current frame'}
        </Button>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {isDrive ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
            <Video className="mb-2 h-8 w-8 text-teal-200/50" />
            <p className="text-[11px] font-medium text-teal-100/80">Custom thumbnails are not supported for Google Drive links due to security (CORS) restrictions.</p>
            <p className="mt-1 text-[10px] text-teal-100/50">To choose a specific frame, please upload the video file directly to Supabase.</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              src={displayUrl} 
              controls 
              className="h-full w-full object-contain"
              crossOrigin="anonymous"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>
      {!isDrive && (
        <p className="text-[10px] text-muted-foreground leading-tight">
          Seek to the frame you want to use as a preview, then click "Capture".
        </p>
      )}
    </div>
  );
}


// ─── MediaUploadField ─────────────────────────────────────────────────────────

interface MediaUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  onThumbnail?: (url: string) => void;
  bucket?: 'site-media' | 'deployments-media';
  folder?: string;
  mediaType?: 'image' | 'video' | 'any';
  disabled?: boolean;
  showManualUrl?: boolean;
}

function MediaUploadField({
  label,
  hint,
  value,
  onChange,
  onThumbnail,
  bucket = 'site-media',
  folder = 'uploads',
  mediaType = 'any',
  disabled,
  showManualUrl = true,
}: MediaUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  const accept = useMemo(() => {
    if (mediaType === 'image') return { 'image/*': [] };
    if (mediaType === 'video') return { 'video/*': [] };
    return { 'image/*': [], 'video/*': [], 'application/pdf': [] };
  }, [mediaType]);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      try {
        const res = await uploadFileToBucket(bucket, file, { folder });
        onChange(res.publicUrl);
        toast({ title: 'File uploaded successfully' });
      } catch (err) {
        toast({
          title: 'Upload failed',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
    },
    [bucket, folder, onChange],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    disabled: disabled || uploading,
    multiple: false,
    accept,
    maxSize: 200 * 1024 * 1024,
  });

  const trimmed = value.trim();
  const driveId = extractDriveFileId(trimmed);
  const drivePreview = toDrivePreviewUrl(trimmed);
  
  // Improved detection for Google Drive links which don't have file extensions
  const isImage = mediaType === 'image' || 
                  /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(trimmed) ||
                  (driveId && mediaType === 'image');
                  
  const isVideo = mediaType === 'video' || 
                  /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(trimmed) ||
                  (driveId && mediaType === 'video');

  const isAnyFile = !isImage && !isVideo && trimmed.length > 0;


  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>

      {/* Current value preview */}
      {trimmed && (
        <div className="relative rounded-xl overflow-hidden border border-border">
          {drivePreview && isVideo ? (
            <div className="h-36 w-full bg-black">
              <iframe
                title={label}
                src={drivePreview}
                className="h-full w-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          ) : isImage ? (
            <ZoomableImage src={resolveImageSrc(trimmed)} alt={label} className="h-36 w-full object-cover" />
          ) : isVideo ? (
            <div className="flex h-20 items-center gap-3 bg-black/5 px-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Video file set</p>
                <p className="truncate text-xs text-muted-foreground">{trimmed}</p>
              </div>
            </div>
          ) : isAnyFile ? (
            <div className="flex h-20 items-center gap-3 bg-muted/20 px-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Document / File set</p>
                <p className="truncate text-xs text-muted-foreground">{trimmed}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-14 items-center gap-3 bg-muted/20 px-4">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
              <p className="truncate text-xs text-muted-foreground">{trimmed}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600 disabled:opacity-50 z-10"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {isVideo && trimmed && (
        <VideoThumbnailPicker 
          videoUrl={trimmed} 
          onCapture={(url) => {
             if (onThumbnail) {
               onThumbnail(url);
             } else {
               toast({ title: 'Thumbnail URL copied!', description: url });
               navigator.clipboard.writeText(url);
             }
          }}
          disabled={disabled}
          bucket={bucket}
        />
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors',
          isDragReject ? 'border-red-400 bg-red-50/30' :
          isDragActive ? 'border-teal-500 bg-teal-50/20' :
          'border-border hover:border-teal-400 hover:bg-teal-50/10',
          (disabled || uploading) && 'pointer-events-none opacity-50',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {uploading ? 'Uploading…' : isDragActive ? 'Drop to upload' : trimmed ? 'Replace file' : 'Upload file'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {mediaType === 'image' ? 'JPG, PNG, WebP · ' : mediaType === 'video' ? 'MP4, WebM · ' : 'Images, Videos, PDFs · '}
              Drag & drop or click to browse
            </p>
          </div>
        </div>
      </div>

      {showManualUrl ? (
        <Input
          value={trimmed}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste a URL manually"
          disabled={disabled}
          className="font-mono text-xs"
        />
      ) : null}
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6 border-b border-border pb-4">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SaveBar({
  onSave,
  onReset,
  saving,
  dirty,
}: {
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
      <Button variant="outline" onClick={onReset} disabled={saving || !dirty}>
        Discard changes
      </Button>
      <Button
        onClick={onSave}
        disabled={saving || !dirty}
        className="bg-teal-600 hover:bg-teal-700 text-white"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}

// ─── Installation card ────────────────────────────────────────────────────────

function InstallationCard({
  inst,
  index,
  onChange,
  onRemove,
  disabled,
}: {
  inst: Installation;
  index: number;
  onChange: (updated: Installation) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="overflow-hidden">
      <div
        className="flex cursor-pointer items-center justify-between gap-3 p-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 text-sm font-bold">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {inst.title || `Site ${index + 1}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {inst.videoUrl ? 'Video' : 'No video'} · {inst.notes ? 'Notes' : 'No notes'} · {(inst.mediaCsv ?? '').split(',').filter(Boolean).length} Media
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-muted/10 p-4 space-y-4">
          <div>
            <FieldLabel label="Site name / label" hint="E.g., Alibaug – Site 1" />
            <Input
              value={inst.title}
              onChange={(e) => onChange({ ...inst, title: e.target.value })}
              placeholder="Site 1"
              disabled={disabled}
            />
          </div>
          <MediaUploadField
            label="Installation video"
            hint="Upload the primary installation video"
            value={inst.videoUrl}
            onChange={(url) => onChange({ ...inst, videoUrl: url })}
            bucket="deployments-media"
            folder="installations"
            mediaType="video"
            disabled={disabled}
          />
          <div>
            <FieldLabel label="Field notes" hint="Detailed observations and challenges" />
            <Textarea
              value={inst.notes}
              onChange={(e) => onChange({ ...inst, notes: e.target.value })}
              placeholder="Describe the site and installation process..."
              className="min-h-[140px]"
              disabled={disabled}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel label="Additional Media" hint="Images or videos below these notes" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const csv = inst.mediaCsv ?? '';
                  const updated = csv.trim() === '' ? ' ' : csv + ', ';
                  onChange({ ...inst, mediaCsv: updated });
                }}
                disabled={disabled}
                className="text-teal-700 border-teal-300"
              >
                <Plus className="h-3 w-3 mr-1" /> Add media
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(inst.mediaCsv ?? '').split(',').map(s => s.trim()).filter(u => u !== undefined).map((url, i, arr) => (
                url !== undefined && (
                  <div key={i} className="relative rounded-xl border border-dashed border-teal-100 p-3 bg-white/50">
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500"
                        onClick={() => {
                          const next = arr.filter((_, idx) => idx !== i).join(', ');
                          onChange({ ...inst, mediaCsv: next });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <MediaUploadField
                      label=""
                      value={url}
                      onChange={(newUrl) => {
                        const next = [...arr];
                        next[i] = newUrl;
                        onChange({ ...inst, mediaCsv: next.join(', ') });
                      }}
                      bucket="deployments-media"
                      folder="field-notes"
                      mediaType="any"
                      disabled={disabled}
                    />
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Gallery item ─────────────────────────────────────────────────────────────

function GalleryItem({
  url,
  index,
  onChange,
  onRemove,
  disabled,
}: {
  url: string;
  index: number;
  onChange: (url: string) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <MediaUploadField
        label={`Photo ${index + 1}`}
        value={url}
        onChange={onChange}
        bucket="deployments-media"
        folder="gallery"
        mediaType="image"
        disabled={disabled}
      />
      <div className="flex justify-end p-2 pt-0">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 className="mr-1 h-3 w-3" /> Remove
        </Button>
      </div>
    </Card>
  );
}

// ─── Deployment editor card ───────────────────────────────────────────────────

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

function parseDeploymentData(raw: Record<string, unknown>): DeploymentData {
  const installations: Installation[] = Array.isArray(raw.installations)
    ? (raw.installations as Installation[]).map((x) => ({
        title: String(x?.title ?? ''),
        videoUrl: String(x?.videoUrl ?? ''),
        notes: String(x?.notes ?? ''),
        mediaCsv: String(x?.mediaCsv ?? ''),
      }))
    : [];
  const gallery: string[] = Array.isArray(raw.gallery)
    ? (raw.gallery as string[]).filter((x) => typeof x === 'string')
    : [];
  const previewImages: string[] = Array.isArray(raw.previewImages)
    ? (raw.previewImages as string[]).filter((x) => typeof x === 'string')
    : [];
  return {
    heading: String(raw.heading ?? ''),
    intro: String(raw.intro ?? ''),
    summary: String(raw.summary ?? ''),
    summaryMediaCsv: String(raw.summaryMediaCsv ?? ''),
    interviewVideoUrl: String(raw.interviewVideoUrl ?? ''),
    installations,
    gallery,
    previewVideoUrl: String(raw.previewVideoUrl ?? ''),
    previewImages,
  };
}

function DeploymentEditor({
  record,
  onSave,
  onDelete,
  saving,
  deleting,
  isFirst,
}: {
  record: DeploymentRecord;
  onSave: (slug: string, title: string, data: DeploymentData) => void;
  onDelete: (slug: string) => void;
  saving: boolean;
  deleting: boolean;
  isFirst: boolean;
}) {
  const [open, setOpen] = useState(isFirst);
  const [title, setTitle] = useState(record.title);
  const [data, setData] = useState<DeploymentData>(() => parseDeploymentData(record.data));
  const dirty = true;

  const busy = saving || deleting;

  function updateInstallation(idx: number, updated: Installation) {
    const next = [...data.installations];
    next[idx] = updated;
    setData({ ...data, installations: next });
  }

  function removeInstallation(idx: number) {
    setData({ ...data, installations: data.installations.filter((_, i) => i !== idx) });
  }

  function addInstallation() {
    setData((d) => ({
      ...d,
      installations: [...d.installations, { title: '', videoUrl: '', notes: '', mediaCsv: '' }],
    }));
  }

  function updateGallery(idx: number, url: string) {
    const next = [...data.gallery];
    next[idx] = url;
    setData({ ...data, gallery: next });
  }

  function removeGalleryItem(idx: number) {
    setData({ ...data, gallery: data.gallery.filter((_, i) => i !== idx) });
  }

  function addGalleryItem() {
    setData((d) => ({ ...d, gallery: [...d.gallery, ''] }));
  }

  function updatePreviewImage(idx: number, url: string) {
    const next = [...data.previewImages];
    next[idx] = url;
    setData({ ...data, previewImages: next });
  }

  function removePreviewImage(idx: number) {
    setData({ ...data, previewImages: data.previewImages.filter((_, i) => i !== idx) });
  }

  function addPreviewImage() {
    if (data.previewImages.length >= 4) {
      toast({ title: 'Max 4 preview images', description: 'Remove one before adding.' });
      return;
    }
    setData((d) => ({ ...d, previewImages: [...d.previewImages, ''] }));
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between gap-3 p-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100">
            <MapPin className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title || 'Untitled deployment'}</p>
            <p className="text-xs text-muted-foreground font-mono">{record.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete deployment "${record.title}"? This cannot be undone.`)) {
                onDelete(record.slug);
              }
            }}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-muted/5 p-5 space-y-6">
          {/* Basic info */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Basic info</h3>
            <div className="space-y-3">
              <div>
                <FieldLabel label="Deployment title" hint="E.g., Alibaug, Raigad" />
                <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} placeholder="Deployment name" />
              </div>
              <div>
                <FieldLabel label="Page heading" hint="Large text shown at the top" />
                <Input value={data.heading} onChange={(e) => setData({ ...data, heading: e.target.value })} disabled={busy} placeholder="Heading" />
              </div>
              <div>
                <FieldLabel label="Intro text" hint="Short description under the heading" />
                <Textarea value={data.intro} onChange={(e) => setData({ ...data, intro: e.target.value })} disabled={busy} placeholder="Introduce this deployment…" className="min-h-[80px]" />
              </div>
              <div>
                <FieldLabel label="Deployment summary" hint="Full narrative about the site" />
                <Textarea value={data.summary} onChange={(e) => setData({ ...data, summary: e.target.value })} disabled={busy} placeholder="Describe the deployment in detail…" className="min-h-[140px]" />
              </div>
              
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel label="Summary Media" hint="Images or videos below the summary text" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const csv = data.summaryMediaCsv ?? '';
                      const updated = csv.trim() === '' ? ' ' : csv + ', ';
                      setData({ ...data, summaryMediaCsv: updated });
                    }}
                    disabled={busy}
                    className="text-teal-700 border-teal-300"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add media
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(data.summaryMediaCsv ?? '').split(',').map(s => s.trim()).filter(u => u !== undefined).map((url, i, arr) => (
                    url !== undefined && (
                      <div key={i} className="relative rounded-xl border border-dashed border-teal-100 p-3 bg-white/50">
                        <div className="flex justify-end mb-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500"
                            onClick={() => {
                              const next = arr.filter((_, idx) => idx !== i).join(', ');
                              setData({ ...data, summaryMediaCsv: next });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <MediaUploadField
                          label=""
                          value={url}
                          onChange={(newUrl) => {
                            const next = [...arr];
                            next[i] = newUrl;
                            setData({ ...data, summaryMediaCsv: next.join(', ') });
                          }}
                          bucket="deployments-media"
                          folder="summary"
                          mediaType="any"
                          disabled={busy}
                        />
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interview video */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Interview video</h3>
            <MediaUploadField
              label="Interview / overview video"
              hint="A short reel or interview from the field"
              value={data.interviewVideoUrl}
              onChange={(url) => setData({ ...data, interviewVideoUrl: url })}
              bucket="deployments-media"
              folder="interviews"
              mediaType="video"
              disabled={busy}
            />
          </div>

          {/* Installation sites */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Installation sites</h3>
                <p className="text-xs text-muted-foreground">Add one card per site — each has a video and field notes.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addInstallation}
                disabled={busy}
                className="text-teal-700 border-teal-300 hover:bg-teal-50"
              >
                <Plus className="mr-1 h-3 w-3" /> Add site
              </Button>
            </div>
            {data.installations.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No installation sites yet. Click "Add site" to begin.
              </div>
            )}
            <div className="space-y-3">
              {data.installations.map((inst, idx) => (
                <InstallationCard
                  key={idx}
                  inst={inst}
                  index={idx}
                  onChange={(u) => updateInstallation(idx, u)}
                  onRemove={() => removeInstallation(idx)}
                  disabled={busy}
                />
              ))}
            </div>
          </div>

          {/* Photo gallery */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Photo gallery</h3>
                <p className="text-xs text-muted-foreground">Add as many photos as you want — shown in a grid on the page.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addGalleryItem}
                disabled={busy}
                className="text-teal-700 border-teal-300 hover:bg-teal-50"
              >
                <Plus className="mr-1 h-3 w-3" /> Add photo
              </Button>
            </div>
            {data.gallery.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No photos yet. Click "Add photo" to upload gallery images.
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {data.gallery.map((url, idx) => (
                <GalleryItem
                  key={idx}
                  url={url}
                  index={idx}
                  onChange={(u) => updateGallery(idx, u)}
                  onRemove={() => removeGalleryItem(idx)}
                  disabled={busy}
                />
              ))}
            </div>
          </div>

          {/* Home page preview media */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Home page preview</h3>
            <p className="mb-3 text-xs text-muted-foreground">The video and photos shown in the "Deployments" section on the Home page.</p>
            <div className="space-y-4">
              <MediaUploadField
                label="Preview video"
                hint="Short collage reel shown on the Home page"
                value={data.previewVideoUrl}
                onChange={(url) => setData({ ...data, previewVideoUrl: url })}
                bucket="deployments-media"
                folder="preview"
                mediaType="video"
                disabled={busy}
              />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel label={`Preview photos (${data.previewImages.length}/4)`} hint="Up to 4 images shown beside the video on Home" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addPreviewImage}
                    disabled={busy || data.previewImages.length >= 4}
                    className="text-teal-700 border-teal-300 hover:bg-teal-50"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {data.previewImages.map((url, idx) => (
                    <div key={idx} className="space-y-1">
                      <MediaUploadField
                        label={`Preview photo ${idx + 1}`}
                        value={url}
                        onChange={(u) => updatePreviewImage(idx, u)}
                        bucket="deployments-media"
                        folder="preview"
                        mediaType="image"
                        disabled={busy}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                          onClick={() => removePreviewImage(idx)}
                          disabled={busy}
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              onClick={() => onSave(record.slug, title, data)}
              disabled={busy}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? 'Saving…' : 'Save deployment'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── New deployment modal ─────────────────────────────────────────────────────

function NewDeploymentForm({
  onAdd,
  onClose,
  busy,
}: {
  onAdd: (slug: string, title: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState('');
  const slug = title.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');

  return (
    <Card className="p-5 border-2 border-teal-200 bg-teal-50/30">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold text-foreground">New deployment</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <FieldLabel label="Deployment name" hint="E.g., Pune, Maharashtra" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Village, District"
            disabled={busy}
            autoFocus
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            URL slug: <span className="font-mono text-foreground">{slug || '…'}</span>
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={() => { if (slug && title) onAdd(slug, title); }}
            disabled={busy || !slug || !title}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Create
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, logOut } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    const raw = sessionStorage.getItem('admin_active_section');
    if (!raw) return 'visibility';
    const allowed: AdminSection[] = [
      'visibility',
      'hero',
      'insights',
      'dashboard',
      'validation',
      'contact',
      'deployments-preview',
      'deployments-page',
      'devices',
      'media',
    ];
    return (allowed as string[]).includes(raw) ? (raw as AdminSection) : 'visibility';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewDeployment, setShowNewDeployment] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem('admin_active_section', activeSection);
  }, [activeSection]);

  // Home content draft
  const [homeDraft, setHomeDraft] = useState<Record<string, unknown> | null>(null);

  // Data queries
  const flagsQuery = useQuery({ queryKey: ['site_flags'], queryFn: fetchSiteFlags });
  const pagesQuery = useQuery({ queryKey: ['app_pages'], queryFn: fetchAppPages });
  const homeContentQuery = useQuery({ queryKey: ['site_content', 'home'], queryFn: () => fetchSiteContent('home') });
  const deploymentsQuery = useQuery({ queryKey: ['all_deployments'], queryFn: fetchAllDeployments });
  const devicesQuery = useQuery({ queryKey: ['device_master_data'], queryFn: fetchAllDeviceMasterData });

  const flags = flagsQuery.data ?? {};
  const homeContent = mergeHomeContentWithDefaults(homeDraft ?? homeContentQuery.data ?? {}) as unknown as Record<string, unknown>;
  const homeDirty = homeDraft !== null;

  // Mutations
  const updateFlag = useMutation({
    mutationFn: ({ key, value }: { key: SiteFlagKey; value: boolean }) => setSiteFlag(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site_flags'] }),
    onError: (err) => toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const updatePageEnabled = useMutation({
    mutationFn: ({ path, enabled }: { path: string; enabled: boolean }) => setAppPageEnabled(path, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app_pages'] }),
    onError: (err) => toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const saveHomeContent = useMutation({
    mutationFn: (data: Record<string, unknown>) => setSiteContent('home', data),
    onSuccess: async () => {
      setHomeDraft(null);
      await queryClient.invalidateQueries({ queryKey: ['site_content', 'home'] });
      toast({ title: 'Home content saved' });
    },
    onError: (err) => toast({ title: 'Save failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const saveDeploymentMut = useMutation({
    mutationFn: ({ slug, title, data }: { slug: string; title: string; data: DeploymentData }) =>
      setDeployment(slug, { title, data: data as unknown as Record<string, unknown> }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['all_deployments'] });
      toast({ title: 'Deployment saved' });
    },
    onError: (err) => toast({ title: 'Save failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const deleteDeploymentMut = useMutation({
    mutationFn: (slug: string) => deleteDeployment(slug),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['all_deployments'] });
      toast({ title: 'Deployment deleted' });
    },
    onError: (err) => toast({ title: 'Delete failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const saveDeviceMut = useMutation({
    mutationFn: (patch: Parameters<typeof upsertDeviceMasterData>[0]) => upsertDeviceMasterData(patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['device_master_data'] });
      toast({ title: 'Device saved' });
    },
    onError: (err) => toast({ title: 'Save failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const deleteDeviceMut = useMutation({
    mutationFn: (deviceId: string) => deleteDeviceMasterData(deviceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['device_master_data'] });
      toast({ title: 'Device removed' });
    },
    onError: (err) => toast({ title: 'Delete failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const createDeploymentMut = useMutation({
    mutationFn: ({ slug, title }: { slug: string; title: string }) =>
      setDeployment(slug, { title, data: {} }),
    onSuccess: async () => {
      setShowNewDeployment(false);
      await queryClient.invalidateQueries({ queryKey: ['all_deployments'] });
      toast({ title: 'Deployment created', description: 'Fill in the details below.' });
    },
    onError: (err) => toast({ title: 'Create failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }),
  });

  const isBusy =
    flagsQuery.isLoading || pagesQuery.isLoading || homeContentQuery.isLoading ||
    deploymentsQuery.isLoading || updateFlag.isPending || updatePageEnabled.isPending ||
    saveHomeContent.isPending || devicesQuery.isLoading || saveDeviceMut.isPending || deleteDeviceMut.isPending;

  const userLabel = useMemo(() => user?.email ?? user?.id ?? 'Admin', [user]);

  // ── Home content helpers ──────────────────────────────────────────────────
  function heroField(field: string) {
    return String((homeContent.hero as Record<string, unknown>)?.[field] ?? '');
  }
  function setHeroField(field: string, value: string) {
    setHomeDraft({ ...homeContent, hero: { ...(homeContent.hero as Record<string, unknown>), [field]: value } });
  }

  function dashField(field: string) {
    return (homeContent.dashboard as Record<string, unknown>)?.[field];
  }
  function setDashField(field: string, value: unknown) {
    setHomeDraft({ ...homeContent, dashboard: { ...(homeContent.dashboard as Record<string, unknown>), [field]: value } });
  }

  function insightsField(field: string) {
    return (homeContent.insights as Record<string, unknown>)?.[field];
  }
  function setInsightsField(field: string, value: unknown) {
    setHomeDraft({ ...homeContent, insights: { ...(homeContent.insights as Record<string, unknown>), [field]: value } });
  }

  function validationField(field: string) {
    return (homeContent.validation as Record<string, unknown>)?.[field];
  }
  function setValidationField(field: string, value: unknown) {
    setHomeDraft({ ...homeContent, validation: { ...(homeContent.validation as Record<string, unknown>), [field]: value } });
  }

  function contactField(field: string) {
    return (homeContent.contact as Record<string, unknown>)?.[field];
  }
  function setContactField(field: string, value: unknown) {
    setHomeDraft({ ...homeContent, contact: { ...(homeContent.contact as Record<string, unknown>), [field]: value } });
  }
  function contactFormField(field: string) {
    return ((homeContent.contact as Record<string, unknown>)?.form as Record<string, unknown>)?.[field];
  }
  function setContactFormField(field: string, value: unknown) {
    const current = (homeContent.contact as Record<string, unknown>) ?? {};
    const form = (current.form as Record<string, unknown>) ?? {};
    setHomeDraft({ ...homeContent, contact: { ...current, form: { ...form, [field]: value } } });
  }

  const kpiStats: Array<{ label: string; value: string; note: string }> = Array.isArray(dashField('stats'))
    ? (dashField('stats') as Array<{ label: string; value: string; note: string }>)
    : [];
  const alertItems: Array<{ tone: string; text: string }> = Array.isArray(dashField('alerts'))
    ? (dashField('alerts') as Array<{ tone: string; text: string }>)
    : [];
  const mapChips: string[] = Array.isArray(dashField('mapChips'))
    ? (dashField('mapChips') as string[])
    : [];
  const impactMetrics: Array<{ label: string; value: string; note: string }> = Array.isArray(dashField('impactMetrics'))
    ? (dashField('impactMetrics') as Array<{ label: string; value: string; note: string }>)
    : [];
  const actionableInsights: Array<{ title: string; description: string }> = Array.isArray(dashField('actionableInsights'))
    ? (dashField('actionableInsights') as Array<{ title: string; description: string }>)
    : [];
  const graphCards: Array<{ title: string; description: string; imageUrl?: string }> = Array.isArray(dashField('graphCards'))
    ? (dashField('graphCards') as Array<{ title: string; description: string; imageUrl?: string }>)
    : [];

  const insightsCards: Array<{ title: string; description: string; icon?: string }> = Array.isArray(insightsField('cards'))
    ? (insightsField('cards') as Array<{ title: string; description: string; icon?: string }>)
    : [];

  const validationCards: Array<{ title: string; detail: string }> = Array.isArray(validationField('cards'))
    ? (validationField('cards') as Array<{ title: string; detail: string }>)
    : [];
  const testimonials: Array<{ name: string; role: string; quote: string }> = Array.isArray(validationField('testimonials'))
    ? (validationField('testimonials') as Array<{ name: string; role: string; quote: string }>)
    : [];

  const pilotNeedsItems: string[] = Array.isArray(contactField('pilotNeedsItems'))
    ? (contactField('pilotNeedsItems') as string[])
    : [];
  const interestOptions: string[] = Array.isArray(contactFormField('interestOptions'))
    ? (contactFormField('interestOptions') as string[])
    : [];

  // ── Navigate helper ───────────────────────────────────────────────────────
  function navigate(section: AdminSection) {
    setActiveSection(section);
    setSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="admin-panel flex h-screen overflow-hidden bg-gray-50">
      <style>
        {`
          .admin-panel button:hover {
            color: black !important;
          }
        `}
      </style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#0f3d3a] text-white transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <img src="/logo.jpeg" alt="JalYantra" className="h-10 w-10 rounded-xl object-cover ring-2 ring-teal-400/40" />
          <div>
            <p className="text-sm font-bold text-white">JalYantra</p>
            <p className="text-xs text-teal-300">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'bg-teal-500/20 text-teal-200'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-teal-300' : 'text-white/50')} />
                <div>
                  <p className={cn('text-xs font-semibold', active ? 'text-teal-200' : 'text-white/80')}>{item.label}</p>
                  <p className="text-[10px] text-white/40">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-white/10 p-3 space-y-2">
          <div className="px-3 py-1">
            <p className="text-xs text-white/50">Signed in as</p>
            <p className="truncate text-xs font-medium text-white/80">{userLabel}</p>
          </div>
          <button
            onClick={() => window.location.assign('/')}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View site
          </button>
          <button
            onClick={logOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 shadow-sm">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {SIDEBAR_ITEMS.find((s) => s.id === activeSection)?.label}
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono hidden sm:flex">
            {userLabel}
          </Badge>
        </header>

        {/* Scrollable content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl">

            {/* ── Section: Visibility & Pages ─────────────────────────────── */}
            {activeSection === 'visibility' && (
              <div>
                <SectionHeader
                  title="Visibility & Pages"
                  desc="Control which sections visitors see on the Home page, and enable or disable entire routes."
                />

                {/* Section toggles */}
                <Card className="mb-5 p-5">
                  <p className="mb-1 text-sm font-semibold text-foreground">Home page sections</p>
                  <p className="mb-4 text-xs text-muted-foreground">Toggle sections on or off for visitors. Changes save instantly.</p>
                  <div className="space-y-4">
                    {FLAG_DEFS.map((def) => (
                      <div key={def.key} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{def.label}</p>
                          <p className="text-xs text-muted-foreground">{def.description}</p>
                        </div>
                        <Switch
                          checked={!!(flags[def.key])}
                          onCheckedChange={(checked) => updateFlag.mutate({ key: def.key, value: checked })}
                          disabled={isBusy}
                          className="data-[state=checked]:bg-teal-600"
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Pages */}
                <Card className="p-5">
                  <p className="mb-1 text-sm font-semibold text-foreground">Pages / Routes</p>
                  <p className="mb-4 text-xs text-muted-foreground">Enable or disable entire pages on the site.</p>
                  <div className="space-y-3">
                    {(pagesQuery.data ?? []).map((page) => (
                      <div key={page.path} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{page.title}</p>
                          <p className="font-mono text-xs text-muted-foreground">{page.path}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {page.path === '/admin' && (
                            <Badge variant="secondary" className="text-xs">Protected</Badge>
                          )}
                          <Switch
                            checked={page.is_enabled}
                            onCheckedChange={(checked) => updatePageEnabled.mutate({ path: page.path, enabled: checked })}
                            disabled={isBusy || page.path === '/admin'}
                            className="data-[state=checked]:bg-teal-600"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    The Admin route cannot be disabled to avoid locking you out.
                  </p>
                </Card>
              </div>
            )}

            {/* ── Section: Hero ──────────────────────────────────────────── */}
            {activeSection === 'hero' && (
              <div>
                <SectionHeader
                  title="Hero Section"
                  desc="Edit the headline, taglines, button labels, and logo shown at the very top of the Home page."
                />
                <Card className="p-5 space-y-5">
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Text content</h3>
                    <div className="space-y-3">
                      <div>
                        <FieldLabel label="Kicker" hint="Small badge above the headline, e.g., 'Smarter monitoring'" />
                        <Input value={heroField('kicker')} onChange={(e) => setHeroField('kicker', e.target.value)} disabled={isBusy} placeholder="Smarter monitoring" />
                      </div>
                      <div>
                        <FieldLabel label="Headline" hint="The main large title" />
                        <Input value={heroField('title')} onChange={(e) => setHeroField('title', e.target.value)} disabled={isBusy} placeholder="Smarter groundwater monitoring for rural India" />
                      </div>
                      <div>
                        <FieldLabel label="Description" hint="One or two sentences below the headline" />
                        <Textarea value={heroField('description')} onChange={(e) => setHeroField('description', e.target.value)} disabled={isBusy} placeholder="JalYantra is an IoT groundwater monitoring system…" className="min-h-[80px]" />
                      </div>
                      <div>
                        <FieldLabel label="Problem statement" hint="The 'Problem:' line in the hero" />
                        <Input value={heroField('problem')} onChange={(e) => setHeroField('problem', e.target.value)} disabled={isBusy} placeholder="Lack of continuous, local-level groundwater monitoring…" />
                      </div>
                      <div>
                        <FieldLabel label="Solution statement" hint="The 'Solution:' line in the hero" />
                        <Input value={heroField('solution')} onChange={(e) => setHeroField('solution', e.target.value)} disabled={isBusy} placeholder="LIDAR-based measurement with real-time dashboard…" />
                      </div>
                      <div />
                      <div>
                        <div className="mb-3">
                          <FieldLabel label="Carousel Media" hint="Add images or videos to the hero carousel" />
                        </div>

                        {(() => {
                          const csv = String(heroField('carouselMediaCsv') ?? '');
                          const urls = csv === '' ? [] : csv.split(',').map(u => u.trim());
                          
                          return (
                            <div className="grid gap-4 md:grid-cols-2">
                              {urls.map((url, idx) => (
                                <div key={idx} className="relative rounded-2xl border-2 border-dashed border-teal-100 p-4 bg-teal-50/10">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Media Item {idx + 1}</span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                                      onClick={() => {
                                        const updated = urls.filter((_, i) => i !== idx);
                                        setHeroField('carouselMediaCsv', updated.join(', '));
                                      }}
                                      disabled={isBusy}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  <MediaUploadField
                                      label=""
                                      value={url.split('|')[0]}
                                      onChange={(u) => {
                                        const parts = url.split('|');
                                        const thumb = parts[1] ? `|${parts[1]}` : '';
                                        const next = urls.map((x, i) => i === idx ? `${u}${thumb}` : x);
                                        setHeroField('carouselMediaCsv', next.join(', '));
                                      }}
                                      onThumbnail={(thumbUrl) => {
                                        const videoUrl = url.split('|')[0];
                                        const next = urls.map((x, i) => i === idx ? `${videoUrl}|${thumbUrl}` : x);
                                        setHeroField('carouselMediaCsv', next.join(', '));
                                      }}
                                      bucket="site-media"
                                      folder="hero"
                                      mediaType="video"
                                      disabled={isBusy}
                                    />
                                </div>
                              ))}
                              
                              <button
                                type="button"
                                onClick={() => {
                                  const current = urls.length > 0 ? csv + ", " : " ";
                                  setHeroField('carouselMediaCsv', current);
                                }}
                                disabled={isBusy}
                                className="flex flex-col items-center justify-center gap-3 h-[200px] rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/20 text-teal-600 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 transition-all group"
                              >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 group-hover:bg-teal-200 transition-colors">
                                  <Plus className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-bold uppercase tracking-widest">Add Hero Media</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>


                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Buttons</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Primary button text" hint="Button label (e.g., Go to Dashboard)" />
                        <Input value={heroField('primaryCta')} onChange={(e) => setHeroField('primaryCta', e.target.value)} disabled={isBusy} placeholder="Go to Dashboard" />
                      </div>
                      <div>
                        <FieldLabel label="Primary button link" hint="Internal path or URL (e.g., /dashboard)" />
                        <Input value={heroField('primaryCtaHref')} onChange={(e) => setHeroField('primaryCtaHref', e.target.value)} disabled={isBusy} placeholder="/dashboard" />
                      </div>
                      <div>
                        <FieldLabel label="Secondary button text" hint="Button label (e.g., Learn how it works)" />
                        <Input value={heroField('secondaryCta')} onChange={(e) => setHeroField('secondaryCta', e.target.value)} disabled={isBusy} placeholder="Learn how it works" />
                      </div>
                      <div>
                        <FieldLabel label="Secondary button link" hint="Use a section anchor like #how-it-works, or a URL" />
                        <Input value={heroField('secondaryCtaHref')} onChange={(e) => setHeroField('secondaryCtaHref', e.target.value)} disabled={isBusy} placeholder="#how-it-works" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Logo</h3>
                    <MediaUploadField
                      label="Hero logo image"
                      hint="Replaces the default JalYantra logo shown in the hero area"
                      value={heroField('logoUrl')}
                      onChange={(url) => setHeroField('logoUrl', url)}
                      bucket="site-media"
                      folder="hero"
                      mediaType="image"
                      disabled={isBusy}
                    />
                  </div>
                </Card>
                <SaveBar
                  onSave={() => saveHomeContent.mutate(homeContent as unknown as Record<string, unknown>)}
                  onReset={() => setHomeDraft(null)}
                  saving={saveHomeContent.isPending}
                  dirty={homeDirty}
                />
              </div>
            )}

            {/* ── Section: Insights ──────────────────────────────────────── */}
            {activeSection === 'insights' && (
              <div>
                <SectionHeader
                  title="Insights Section"
                  desc="Edit the section intro and the four insight cards shown under 'How it works' on the Home page."
                />

                <div className="space-y-5">
                  <Card className="p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Section intro</h3>
                    <div>
                      <FieldLabel label="Kicker (small label)" />
                      <Input
                        value={String(insightsField('kicker') ?? '')}
                        onChange={(e) => setInsightsField('kicker', e.target.value)}
                        disabled={isBusy}
                        placeholder="Insights that drive action"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Heading" />
                      <Input
                        value={String(insightsField('heading') ?? '')}
                        onChange={(e) => setInsightsField('heading', e.target.value)}
                        disabled={isBusy}
                        placeholder="Insights that turn into action"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Description" />
                      <Textarea
                        value={String(insightsField('description') ?? '')}
                        onChange={(e) => setInsightsField('description', e.target.value)}
                        disabled={isBusy}
                        className="min-h-[80px]"
                      />
                    </div>
                  </Card>

                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Insight cards</h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInsightsField('cards', [...insightsCards, { title: '', description: '', icon: '' }])}
                        disabled={isBusy}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add card
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {insightsCards.map((card, idx) => (
                        <Card key={`${card.title}-${idx}`} className="p-4 space-y-3 border border-border">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">Card {idx + 1}</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setInsightsField('cards', insightsCards.filter((_, i) => i !== idx))}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <FieldLabel label="Title" />
                              <Input
                                value={card.title ?? ''}
                                onChange={(e) => setInsightsField('cards', insightsCards.map((c, i) => i === idx ? { ...c, title: e.target.value } : c))}
                                disabled={isBusy}
                              />
                            </div>
                            <MediaUploadField
                              label="Icon image"
                              hint="Optional; shown above the card"
                              value={String(card.icon ?? '')}
                              onChange={(url) => setInsightsField('cards', insightsCards.map((c, i) => i === idx ? { ...c, icon: url } : c))}
                              bucket="site-media"
                              folder="insights"
                              mediaType="image"
                              disabled={isBusy}
                              showManualUrl={false}
                            />
                          </div>

                          <div>
                            <FieldLabel label="Description" />
                            <Textarea
                              value={card.description ?? ''}
                              onChange={(e) => setInsightsField('cards', insightsCards.map((c, i) => i === idx ? { ...c, description: e.target.value } : c))}
                              disabled={isBusy}
                              className="min-h-[80px]"
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>

                  <SaveBar
                    onSave={() => saveHomeContent.mutate(homeContent as unknown as Record<string, unknown>)}
                    onReset={() => setHomeDraft(null)}
                    saving={saveHomeContent.isPending}
                    dirty={homeDirty}
                  />
                </div>
              </div>
            )}

            {/* ── Section: Dashboard ─────────────────────────────────────── */}
            {activeSection === 'dashboard' && (
              <div>
                <SectionHeader
                  title="Dashboard Section"
                  desc="Edit the KPI cards, alerts, and interactive map card shown in the 'Dashboard' section of the Home page."
                />
                <div className="space-y-5">

                  {/* Heading */}
                  <Card className="p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Section intro</h3>
                    <div>
                      <FieldLabel label="Section heading" />
                      <Input value={String(dashField('heading') ?? '')} onChange={(e) => setDashField('heading', e.target.value)} disabled={isBusy} placeholder="What users see" />
                    </div>
                    <div>
                      <FieldLabel label="Section description" />
                      <Textarea value={String(dashField('description') ?? '')} onChange={(e) => setDashField('description', e.target.value)} disabled={isBusy} placeholder="A clean summary for quick decisions…" className="min-h-[80px]" />
                    </div>
                  </Card>

                  {/* KPI cards */}
                  <Card className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">KPI cards</h3>
                        <p className="text-xs text-muted-foreground">The stats shown at the top of the dashboard section.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDashField('stats', [...kpiStats, { label: '', value: '', note: '' }])}
                        disabled={isBusy}
                        className="text-teal-700 border-teal-300 hover:bg-teal-50"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add KPI
                      </Button>
                    </div>
                    {kpiStats.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                        No KPI cards yet. Click "Add KPI" to create one.
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      {kpiStats.map((stat, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">KPI {idx + 1}</Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                              onClick={() => setDashField('stats', kpiStats.filter((_, i) => i !== idx))}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Input
                              placeholder="Label (e.g., Total Sensors)"
                              value={stat.label}
                              onChange={(e) => setDashField('stats', kpiStats.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                              disabled={isBusy}
                            />
                            <Input
                              placeholder="Value (e.g., 5)"
                              value={stat.value}
                              onChange={(e) => setDashField('stats', kpiStats.map((s, i) => i === idx ? { ...s, value: e.target.value } : s))}
                              disabled={isBusy}
                            />
                            <Input
                              placeholder="Note (e.g., Monitored locations)"
                              value={stat.note}
                              onChange={(e) => setDashField('stats', kpiStats.map((s, i) => i === idx ? { ...s, note: e.target.value } : s))}
                              disabled={isBusy}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>

                  {/* Alerts */}
                  <Card className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active alerts</h3>
                        <p className="text-xs text-muted-foreground">Alert messages shown in the dashboard preview.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDashField('alerts', [...alertItems, { tone: 'danger', text: '' }])}
                        disabled={isBusy}
                        className="text-teal-700 border-teal-300 hover:bg-teal-50"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add alert
                      </Button>
                    </div>
                    {alertItems.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                        No alerts yet. Click "Add alert" to create one.
                      </div>
                    )}
                    <div className="space-y-2">
                      {alertItems.map((alert, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Select
                            value={alert.tone}
                            onValueChange={(v) => setDashField('alerts', alertItems.map((a, i) => i === idx ? { ...a, tone: v } : a))}
                            disabled={isBusy}
                          >
                            <SelectTrigger className="w-[120px] flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="danger">Warning</SelectItem>
                              <SelectItem value="success">OK / Safe</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            className="flex-1"
                            placeholder="Alert message text"
                            value={alert.text}
                            onChange={(e) => setDashField('alerts', alertItems.map((a, i) => i === idx ? { ...a, text: e.target.value } : a))}
                            disabled={isBusy}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 flex-shrink-0"
                            onClick={() => setDashField('alerts', alertItems.filter((_, i) => i !== idx))}
                            disabled={isBusy}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Map card */}
                  <Card className="p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Interactive map card</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Map title" />
                        <Input value={String(dashField('mapTitle') ?? '')} onChange={(e) => setDashField('mapTitle', e.target.value)} disabled={isBusy} placeholder="Interactive Sensor Map" />
                      </div>
                      <div>
                        <FieldLabel label="Map subtitle" />
                        <Input value={String(dashField('mapSubtitle') ?? '')} onChange={(e) => setDashField('mapSubtitle', e.target.value)} disabled={isBusy} placeholder="Click markers for readings" />
                      </div>
                      <div>
                        <FieldLabel label="Badge text" />
                        <Input value={String(dashField('mapBadge') ?? '')} onChange={(e) => setDashField('mapBadge', e.target.value)} disabled={isBusy} placeholder="5 sensors" />
                      </div>
                    </div>
                    <MediaUploadField
                      label="Map background image"
                      hint="Upload a screenshot of the sensor map"
                      value={String(dashField('mapImageUrl') ?? '')}
                      onChange={(url) => setDashField('mapImageUrl', url)}
                      bucket="site-media"
                      folder="dashboard"
                      mediaType="image"
                      disabled={isBusy}
                    />

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <FieldLabel label="Map layer chips" hint="Small labels shown on the map card (e.g., Layer: Sensor)" />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDashField('mapChips', [...mapChips, ''])}
                          disabled={isBusy}
                          className="text-teal-700 border-teal-300 hover:bg-teal-50"
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add chip
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {mapChips.map((chip, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={chip}
                              placeholder="Chip label"
                              onChange={(e) => setDashField('mapChips', mapChips.map((c, i) => i === idx ? e.target.value : c))}
                              disabled={isBusy}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => setDashField('mapChips', mapChips.filter((_, i) => i !== idx))}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* What users see — 4 preview graphs */}
                  <Card className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What users see — preview graphs</h3>
                        <p className="text-xs text-muted-foreground">
                          Four dashboard screenshots shown in the Home page Dashboard section. Upload the new graph images here.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDashField('graphCards', [...graphCards, { title: '', description: '', imageUrl: '' }])}
                        disabled={isBusy || graphCards.length >= 4}
                        className="text-teal-700 border-teal-300 hover:bg-teal-50 hover:text-teal-900"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add graph
                      </Button>
                    </div>
                    {graphCards.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                        No graph cards yet. Click &quot;Add graph&quot; to create up to four preview images.
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {graphCards.map((card, idx) => (
                          <Card key={idx} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">Graph {idx + 1}</Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                                onClick={() => setDashField('graphCards', graphCards.filter((_, i) => i !== idx))}
                                disabled={isBusy}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Graph title"
                              value={card.title}
                              onChange={(e) =>
                                setDashField(
                                  'graphCards',
                                  graphCards.map((c, i) => (i === idx ? { ...c, title: e.target.value } : c)),
                                )
                              }
                              disabled={isBusy}
                            />
                            <Textarea
                              placeholder="Short description"
                              value={card.description}
                              onChange={(e) =>
                                setDashField(
                                  'graphCards',
                                  graphCards.map((c, i) => (i === idx ? { ...c, description: e.target.value } : c)),
                                )
                              }
                              disabled={isBusy}
                              rows={2}
                            />
                            <MediaUploadField
                              label="Graph image"
                              value={card.imageUrl ?? ''}
                              onChange={(url) =>
                                setDashField(
                                  'graphCards',
                                  graphCards.map((c, i) => (i === idx ? { ...c, imageUrl: url } : c)),
                                )
                              }
                              bucket="site-media"
                              folder="dashboard-graphs"
                              mediaType="image"
                              disabled={isBusy}
                            />
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Impact metrics</h3>
                        <p className="text-xs text-muted-foreground">Editable cards used by the Home page Impact Metrics section.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDashField('impactMetrics', [...impactMetrics, { label: '', value: '', note: '' }])}
                        disabled={isBusy}
                        className="text-teal-700 border-teal-300 hover:bg-teal-50"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add metric
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {impactMetrics.map((metric, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">Metric {idx + 1}</Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                              onClick={() => setDashField('impactMetrics', impactMetrics.filter((_, i) => i !== idx))}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid gap-2 md:grid-cols-3">
                            <Input
                              placeholder="Label"
                              value={metric.label}
                              onChange={(e) => setDashField('impactMetrics', impactMetrics.map((m, i) => i === idx ? { ...m, label: e.target.value } : m))}
                              disabled={isBusy}
                            />
                            <Input
                              placeholder="Value"
                              value={metric.value}
                              onChange={(e) => setDashField('impactMetrics', impactMetrics.map((m, i) => i === idx ? { ...m, value: e.target.value } : m))}
                              disabled={isBusy}
                            />
                            <Input
                              placeholder="Note"
                              value={metric.note}
                              onChange={(e) => setDashField('impactMetrics', impactMetrics.map((m, i) => i === idx ? { ...m, note: e.target.value } : m))}
                              disabled={isBusy}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Actionable insights</h3>
                        <p className="text-xs text-muted-foreground">Cards shown in the Home page Actionable Insights section.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDashField('actionableInsights', [...actionableInsights, { title: '', description: '' }])}
                        disabled={isBusy}
                        className="text-teal-700 border-teal-300 hover:bg-teal-50"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add insight
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {actionableInsights.map((item, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">Insight {idx + 1}</Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                              onClick={() => setDashField('actionableInsights', actionableInsights.filter((_, i) => i !== idx))}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Input
                              placeholder="Title"
                              value={item.title}
                              onChange={(e) => setDashField('actionableInsights', actionableInsights.map((a, i) => i === idx ? { ...a, title: e.target.value } : a))}
                              disabled={isBusy}
                            />
                            <Textarea
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => setDashField('actionableInsights', actionableInsights.map((a, i) => i === idx ? { ...a, description: e.target.value } : a))}
                              disabled={isBusy}
                              className="min-h-[70px]"
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                </div>
                <SaveBar
                  onSave={() => saveHomeContent.mutate(homeContent as unknown as Record<string, unknown>)}
                  onReset={() => setHomeDraft(null)}
                  saving={saveHomeContent.isPending}
                  dirty={homeDirty}
                />
              </div>
            )}

            {/* ── Section: Validation ────────────────────────────────────── */}
            {activeSection === 'validation' && (
              <div>
                <SectionHeader
                  title="Validation Section"
                  desc="Edit the Validation section headings, cards, and testimonial placeholders on the Home page."
                />

                <div className="space-y-5">
                  <Card className="p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Section intro</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Kicker" />
                        <Input value={String(validationField('kicker') ?? '')} onChange={(e) => setValidationField('kicker', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Heading" />
                        <Input value={String(validationField('heading') ?? '')} onChange={(e) => setValidationField('heading', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="Description" />
                      <Textarea
                        value={String(validationField('description') ?? '')}
                        onChange={(e) => setValidationField('description', e.target.value)}
                        disabled={isBusy}
                        className="min-h-[80px]"
                      />
                    </div>
                  </Card>

                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Validation cards</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Home page shows only: &quot;{IWA_DIGITAL_WATER_SUMMIT_CERTIFICATE_TITLE}&quot;
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setValidationField('cards', [...validationCards, { title: '', detail: '' }])}
                        disabled={isBusy}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add card
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {validationCards.map((card, idx) => (
                        <Card key={`${card.title}-${idx}`} className="p-4 space-y-3 border border-border">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">Card {idx + 1}</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setValidationField('cards', validationCards.filter((_, i) => i !== idx))}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-3">
                              <div>
                                <FieldLabel label="Title" />
                                <Input
                                  value={card.title ?? ''}
                                  onChange={(e) => setValidationField('cards', validationCards.map((c, i) => i === idx ? { ...c, title: e.target.value } : c))}
                                  disabled={isBusy}
                                />
                              </div>
                              <div>
                                <FieldLabel label="Detail" />
                                <Input
                                  value={card.detail ?? ''}
                                  onChange={(e) => setValidationField('cards', validationCards.map((c, i) => i === idx ? { ...c, detail: e.target.value } : c))}
                                  disabled={isBusy}
                                />
                              </div>
                            </div>
                            <MediaUploadField
                              label="Media File"
                              hint="PDF, Image, Video, Docx, or Drive Link"
                              value={card.mediaUrl ?? ''}
                              onChange={(url) => setValidationField('cards', validationCards.map((c, i) => i === idx ? { ...c, mediaUrl: url } : c))}
                              bucket="site-media"
                              folder="validation"
                              mediaType="any"
                              disabled={isBusy}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Testimonials block</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Testimonials heading" />
                        <Input
                          value={String(validationField('testimonialsHeading') ?? '')}
                          onChange={(e) => setValidationField('testimonialsHeading', e.target.value)}
                          disabled={isBusy}
                        />
                      </div>
                      <div>
                        <FieldLabel label="Testimonials description" />
                        <Input
                          value={String(validationField('testimonialsDescription') ?? '')}
                          onChange={(e) => setValidationField('testimonialsDescription', e.target.value)}
                          disabled={isBusy}
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Testimonials</h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setValidationField('testimonials', [...testimonials, { name: '', role: '', quote: '' }])}
                        disabled={isBusy}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add testimonial
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {testimonials.map((t, idx) => (
                        <Card key={`${t.name}-${idx}`} className="p-4 space-y-3 border border-border">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">Testimonial {idx + 1}</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setValidationField('testimonials', testimonials.filter((_, i) => i !== idx))}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <FieldLabel label="Name" />
                              <Input
                                value={t.name ?? ''}
                                onChange={(e) => setValidationField('testimonials', testimonials.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                                disabled={isBusy}
                              />
                            </div>
                            <div>
                              <FieldLabel label="Role" />
                              <Input
                                value={t.role ?? ''}
                                onChange={(e) => setValidationField('testimonials', testimonials.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))}
                                disabled={isBusy}
                              />
                            </div>
                          </div>

                          <div>
                            <FieldLabel label="Quote" />
                            <Textarea
                              value={t.quote ?? ''}
                              onChange={(e) => setValidationField('testimonials', testimonials.map((x, i) => i === idx ? { ...x, quote: e.target.value } : x))}
                              disabled={isBusy}
                              className="min-h-[80px]"
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>

                  <SaveBar
                    onSave={() => saveHomeContent.mutate(homeContent as unknown as Record<string, unknown>)}
                    onReset={() => setHomeDraft(null)}
                    saving={saveHomeContent.isPending}
                    dirty={homeDirty}
                  />
                </div>
              </div>
            )}

            {/* ── Section: Contact ───────────────────────────────────────── */}
            {activeSection === 'contact' && (
              <div>
                <SectionHeader
                  title="Contact Section"
                  desc="Edit the 'Run a pilot with us' copy, pilot needs list, and contact form labels."
                />

                <div className="space-y-5">
                  <Card className="p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Section copy</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Kicker" />
                        <Input value={String(contactField('kicker') ?? '')} onChange={(e) => setContactField('kicker', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Heading" />
                        <Input value={String(contactField('heading') ?? '')} onChange={(e) => setContactField('heading', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="Description" />
                      <Textarea
                        value={String(contactField('description') ?? '')}
                        onChange={(e) => setContactField('description', e.target.value)}
                        disabled={isBusy}
                        className="min-h-[80px]"
                      />
                    </div>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pilot needs card</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Card heading" />
                        <Input value={String(contactField('pilotNeedsHeading') ?? '')} onChange={(e) => setContactField('pilotNeedsHeading', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Email label" />
                        <Input value={String(contactField('emailLabel') ?? '')} onChange={(e) => setContactField('emailLabel', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Email value" />
                        <Input value={String(contactField('emailValue') ?? '')} onChange={(e) => setContactField('emailValue', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Location label" />
                        <Input value={String(contactField('locationLabel') ?? '')} onChange={(e) => setContactField('locationLabel', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Location value" />
                        <Input value={String(contactField('locationValue') ?? '')} onChange={(e) => setContactField('locationValue', e.target.value)} disabled={isBusy} />
                      </div>
                      <div />
                    </div>
                    <div>
                      <FieldLabel label="Pilot needs list" hint="One item per line" />
                      <Textarea
                        value={pilotNeedsItems.join('\n')}
                        onChange={(e) => setContactField('pilotNeedsItems', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                        disabled={isBusy}
                        className="min-h-[110px] font-mono text-xs"
                      />
                    </div>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Form labels</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Name placeholder" />
                        <Input value={String(contactFormField('namePlaceholder') ?? '')} onChange={(e) => setContactFormField('namePlaceholder', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Organization placeholder" />
                        <Input value={String(contactFormField('organizationPlaceholder') ?? '')} onChange={(e) => setContactFormField('organizationPlaceholder', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Email placeholder" />
                        <Input value={String(contactFormField('emailPlaceholder') ?? '')} onChange={(e) => setContactFormField('emailPlaceholder', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Interest placeholder" />
                        <Input value={String(contactFormField('interestPlaceholder') ?? '')} onChange={(e) => setContactFormField('interestPlaceholder', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="Interest options" hint="One option per line" />
                      <Textarea
                        value={interestOptions.join('\n')}
                        onChange={(e) => setContactFormField('interestOptions', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                        disabled={isBusy}
                        className="min-h-[90px] font-mono text-xs"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Details placeholder" />
                      <Textarea
                        value={String(contactFormField('detailsPlaceholder') ?? '')}
                        onChange={(e) => setContactFormField('detailsPlaceholder', e.target.value)}
                        disabled={isBusy}
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Submit button label" />
                        <Input value={String(contactFormField('submitLabel') ?? '')} onChange={(e) => setContactFormField('submitLabel', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Sending label" />
                        <Input value={String(contactFormField('sendingLabel') ?? '')} onChange={(e) => setContactFormField('sendingLabel', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel label="Required error message" />
                        <Input value={String(contactFormField('requiredErrorMessage') ?? '')} onChange={(e) => setContactFormField('requiredErrorMessage', e.target.value)} disabled={isBusy} />
                      </div>
                      <div>
                        <FieldLabel label="Sent message" />
                        <Input value={String(contactFormField('sentMessage') ?? '')} onChange={(e) => setContactFormField('sentMessage', e.target.value)} disabled={isBusy} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="Generic error message" />
                      <Textarea
                        value={String(contactFormField('genericErrorMessage') ?? '')}
                        onChange={(e) => setContactFormField('genericErrorMessage', e.target.value)}
                        disabled={isBusy}
                        className="min-h-[80px]"
                      />
                    </div>
                  </Card>

                  <SaveBar
                    onSave={() => saveHomeContent.mutate(homeContent as unknown as Record<string, unknown>)}
                    onReset={() => setHomeDraft(null)}
                    saving={saveHomeContent.isPending}
                    dirty={homeDirty}
                  />
                </div>
              </div>
            )}


            {/* ── Section: Deployments Page ──────────────────────────────── */}
            {activeSection === 'deployments-page' && (
              <div>
                <SectionHeader
                  title="Deployments Page"
                  desc="Manage all entries shown on the /deployments page and customize the preview teaser on the Home page."
                />

                {/* Home Page Preview Settings */}
                <div className="mb-6">
                  <Card className="overflow-hidden border-teal-100 bg-teal-50/10">
                    <div className="bg-teal-50/50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-teal-600" />
                        <h3 className="text-sm font-bold text-teal-900">Home Page Section Settings</h3>
                      </div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-teal-600 bg-white px-2 py-0.5 rounded-full border border-teal-100">Global Settings</p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel label="Section heading" hint="Shown above the grid on Home" />
                          <Input
                            value={String((homeContent.deployments as Record<string, unknown>)?.heading ?? '')}
                            onChange={(e) => setHomeDraft({ ...homeContent, deployments: { ...(homeContent.deployments as Record<string, unknown>), heading: e.target.value } })}
                            disabled={isBusy}
                            placeholder="Deployments & NGO collaboration"
                          />
                        </div>
                        <div>
                          <FieldLabel label="Section description" hint="Short subtext on Home" />
                          <Textarea
                            value={String((homeContent.deployments as Record<string, unknown>)?.description ?? '')}
                            onChange={(e) => setHomeDraft({ ...homeContent, deployments: { ...(homeContent.deployments as Record<string, unknown>), description: e.target.value } })}
                            disabled={isBusy}
                            placeholder="Showcase installations, farmer trainings..."
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-teal-100/50">
                         <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-teal-900">Fallback Preview Media</p>
                              <p className="text-xs text-muted-foreground">Used if no individual deployment has "Home page preview" media set.</p>
                            </div>
                            <SaveBar
                              onSave={() => saveHomeContent.mutate(homeContent as unknown as Record<string, unknown>)}
                              onReset={() => setHomeDraft(null)}
                              saving={saveHomeContent.isPending}
                              dirty={homeDirty}
                              className="static p-0 bg-transparent border-none shadow-none"
                            />
                         </div>
                         <div className="space-y-4">
                            <MediaUploadField
                              label="Fallback video"
                              value={String((homeContent.deployments as Record<string, unknown>)?.previewVideoUrl ?? '')}
                              onChange={(url) => setHomeDraft({ ...homeContent, deployments: { ...(homeContent.deployments as Record<string, unknown>), previewVideoUrl: url } })}
                              bucket="deployments-media"
                              folder="preview"
                              mediaType="video"
                              disabled={isBusy}
                            />
                            <div>
                               <div className="mb-2 flex items-center justify-between">
                                  <FieldLabel label="Fallback photos" />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const imgs = Array.isArray((homeContent.deployments as Record<string, unknown>)?.previewImages)
                                        ? ((homeContent.deployments as Record<string, unknown>).previewImages as string[])
                                        : [];
                                      if (imgs.length < 4) {
                                        setHomeDraft({ ...homeContent, deployments: { ...(homeContent.deployments as Record<string, unknown>), previewImages: [...imgs, ''] } });
                                      }
                                    }}
                                    disabled={isBusy}
                                    className="text-teal-700 border-teal-300"
                                  >
                                    <Plus className="mr-1 h-3 w-3" /> Add photo
                                  </Button>
                               </div>
                               <div className="grid gap-3 md:grid-cols-2">
                                  {(() => {
                                    const imgs = Array.isArray((homeContent.deployments as Record<string, unknown>)?.previewImages)
                                      ? ((homeContent.deployments as Record<string, unknown>).previewImages as string[])
                                      : [];
                                    return imgs.map((url, idx) => (
                                      <div key={idx} className="space-y-1">
                                        <MediaUploadField
                                          label=""
                                          value={url}
                                          onChange={(u) => {
                                            const next = imgs.map((x, i) => i === idx ? u : x);
                                            setHomeDraft({ ...homeContent, deployments: { ...(homeContent.deployments as Record<string, unknown>), previewImages: next } });
                                          }}
                                          bucket="deployments-media"
                                          folder="preview"
                                          mediaType="image"
                                          disabled={isBusy}
                                        />
                                        <div className="flex justify-end">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 h-6 px-2 text-[10px]"
                                            onClick={() => setHomeDraft({ ...homeContent, deployments: { ...(homeContent.deployments as Record<string, unknown>), previewImages: imgs.filter((_, i) => i !== idx) } })}
                                            disabled={isBusy}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Add new */}
                <div className="mb-4">
                  {showNewDeployment ? (
                    <NewDeploymentForm
                      onAdd={(slug, title) => createDeploymentMut.mutate({ slug, title })}
                      onClose={() => setShowNewDeployment(false)}
                      busy={createDeploymentMut.isPending}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewDeployment(true)}
                      className="text-teal-700 border-teal-300 hover:bg-teal-50"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add new deployment
                    </Button>
                  )}
                </div>

                {deploymentsQuery.isLoading && (
                  <div className="py-12 text-center text-sm text-muted-foreground">Loading deployments…</div>
                )}

                {!deploymentsQuery.isLoading && (deploymentsQuery.data ?? []).length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                    No deployments yet. Click "Add new deployment" above.
                  </div>
                )}

                <div className="space-y-4">
                  {(deploymentsQuery.data ?? []).map((record, idx) => (
                    <DeploymentEditor
                      key={record.slug}
                      record={record}
                      isFirst={idx === 0}
                      saving={saveDeploymentMut.isPending && saveDeploymentMut.variables?.slug === record.slug}
                      deleting={deleteDeploymentMut.isPending && deleteDeploymentMut.variables === record.slug}
                      onSave={(slug, title, data) => saveDeploymentMut.mutate({ slug, title, data })}
                      onDelete={(slug) => deleteDeploymentMut.mutate(slug)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Section: Device Master Data ───────────────────────────── */}
            {activeSection === 'devices' && (
              <DeviceMasterSection
                devices={devicesQuery.data ?? []}
                masterLoading={devicesQuery.isLoading}
                busy={saveDeviceMut.isPending || deleteDeviceMut.isPending}
                onSave={(patch) => saveDeviceMut.mutate(patch)}
              />
            )}

            {/* ── Section: Media Upload ──────────────────────────────────── */}
            {activeSection === 'media' && (
              <div>
                <SectionHeader
                  title="Media Upload"
                  desc="Upload images, videos, and PDFs to the site media buckets. Copy the URL to use anywhere on the site."
                />
                <MediaLibrarySection />
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Live devices — pump / non-pump control ───────────────────────────────────

type DeviceInstallType = 'pump' | 'non-pump';

function DeviceMasterSection({
  devices,
  masterLoading,
  busy,
  onSave,
}: {
  devices: DeviceMasterData[];
  masterLoading: boolean;
  busy: boolean;
  onSave: (patch: Parameters<typeof upsertDeviceMasterData>[0]) => void;
}) {
  const { sensors: liveSensors, isLoading: liveLoading, error: liveError, refresh } = useLiveDevices();
  const loading = masterLoading || liveLoading;

  const masterById = useMemo(() => new Map(devices.map((d) => [d.device_id, d])), [devices]);
  const liveById = useMemo(() => new Map(liveSensors.map((s) => [s.deviceId, s])), [liveSensors]);

  const deviceRows = useMemo(() => {
    const ids = new Set([...liveById.keys(), ...masterById.keys()]);
    return Array.from(ids)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((deviceId) => {
        const live = liveById.get(deviceId);
        const master = masterById.get(deviceId);
        const isPumpConnected = master ? master.is_pump_connected !== false : true;
        return {
          deviceId,
          district: live?.district ?? '—',
          depth: live?.depth,
          status: live?.status,
          isLive: Boolean(live),
          isPumpConnected,
          installType: (isPumpConnected ? 'pump' : 'non-pump') as DeviceInstallType,
          hasSavedFlag: Boolean(master),
        };
      });
  }, [liveById, masterById]);

  const handleInstallTypeChange = (deviceId: string, installType: DeviceInstallType) => {
    onSave({
      device_id: deviceId,
      is_pump_connected: installType === 'pump',
    });
  };

  return (
    <div>
      <SectionHeader
        title="Live Devices"
        desc="Every device reporting from Firebase appears below. Set each one to pump-connected or non-pump — the dashboard charts update immediately after you save."
      />

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {liveSensors.length} live device{liveSensors.length === 1 ? '' : 's'} in Firebase
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pump-connected → 24h drawdown charts. Non-pump → daily median groundwater trend.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={liveLoading || busy}>
            Refresh list
          </Button>
        </div>
        {liveError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Could not load live devices: {liveError}
          </p>
        )}
      </Card>

      {loading && (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading devices from Firebase and settings…</div>
      )}

      {!loading && deviceRows.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No devices found in Firebase yet. Devices appear here automatically once they start sending data.
        </div>
      )}

      {!loading && deviceRows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Device ID</th>
                  <th className="px-4 py-3 font-semibold">District</th>
                  <th className="px-4 py-3 font-semibold tabular-nums">Depth</th>
                  <th className="px-4 py-3 font-semibold">Live</th>
                  <th className="px-4 py-3 font-semibold">Installation type</th>
                  <th className="px-4 py-3 font-semibold">Dashboard charts</th>
                </tr>
              </thead>
              <tbody>
                {deviceRows.map((row) => (
                  <tr key={row.deviceId} className="border-b border-border/60 hover:bg-muted/10">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{row.deviceId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.district}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.depth != null ? `${row.depth}m` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] uppercase',
                          row.status === 'active'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : row.isLive
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-border text-muted-foreground',
                        )}
                      >
                        {row.isLive ? (row.status === 'active' ? 'Active' : 'Offline') : 'Not in Firebase'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={row.installType}
                        onValueChange={(value) =>
                          handleInstallTypeChange(row.deviceId, value as DeviceInstallType)
                        }
                        disabled={busy}
                      >
                        <SelectTrigger className="h-9 w-[11rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[70]">
                          <SelectItem value="pump">Pump connected</SelectItem>
                          <SelectItem value="non-pump">Non-pump</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.isPumpConnected ? '24h pump drawdown' : 'Daily median trend'}
                      {!row.hasSavedFlag && (
                        <span className="mt-0.5 block text-[10px] text-amber-600">Default (not saved yet)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Changes save immediately to device master data. Refresh the dashboard to see updated charts. Run migration{' '}
        <code className="rounded bg-muted px-1">008_add_pump_connected_flag.sql</code> on Supabase if the save fails.
      </p>
    </div>
  );
}

// ─── Media library section ────────────────────────────────────────────────────

function MediaLibrarySection() {
  const [bucket, setBucket] = useState<'site-media' | 'deployments-media'>('site-media');
  const [recentUrls, setRecentUrls] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadFileToBucket(bucket, file, {
          folder: bucket === 'deployments-media' ? 'deployments' : 'site',
        });
        setRecentUrls((prev) => [{ url: res.publicUrl, name: file.name, type: file.type }, ...prev]);
        toast({ title: 'Uploaded', description: file.name });
      }
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [bucket]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    disabled: uploading,
    multiple: true,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
    maxSize: 200 * 1024 * 1024,
  });

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-4">
          <FieldLabel label="Upload destination" hint="Choose which bucket to upload files into" />
          <Select value={bucket} onValueChange={(v) => setBucket(v as 'site-media' | 'deployments-media')} disabled={uploading}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site-media">site-media — Home page assets</SelectItem>
              <SelectItem value="deployments-media">deployments-media — Deployment assets</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            'cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
            isDragReject ? 'border-red-400 bg-red-50/30' :
            isDragActive ? 'border-teal-500 bg-teal-50/20' :
            'border-border hover:border-teal-400 hover:bg-teal-50/10',
            uploading && 'pointer-events-none opacity-50',
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
              <Upload className="h-7 w-7 text-teal-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {uploading ? 'Uploading files…' : isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Images, videos, PDFs up to 200 MB each · or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uploading to: <span className="font-mono font-medium text-teal-700">{bucket}</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {recentUrls.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Recently uploaded ({recentUrls.length})
          </h3>
          <div className="space-y-2">
            {recentUrls.map((item, idx) => {
              const isImage = item.type.startsWith('image/');
              return (
                <div key={idx} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                  {isImage ? (
                    <ZoomableImage src={item.url} alt={item.name} className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <Video className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground font-mono">{item.url}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(item.url);
                        toast({ title: 'URL copied to clipboard' });
                      } catch {
                        toast({ title: 'Copy failed', variant: 'destructive' });
                      }
                    }}
                    className="flex-shrink-0 text-xs"
                  >
                    Copy URL
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
