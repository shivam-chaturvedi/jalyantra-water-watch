import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { uploadFileToBucket } from '@/lib/siteAdmin';

type DropzoneUploaderProps = {
  bucket: string;
  disabled?: boolean;
  folder?: string;
  onUploaded?: (result: { bucket: string; objectPath: string; publicUrl: string }) => void;
  className?: string;
};

export function DropzoneUploader({ bucket, disabled, folder, onUploaded, className }: DropzoneUploaderProps) {
  const [altText, setAltText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      setIsUploading(true);
      try {
        for (const file of acceptedFiles) {
          const res = await uploadFileToBucket(bucket, file, {
            altText: altText.trim() ? altText.trim() : undefined,
            folder,
          });
          onUploaded?.(res);
          toast({ title: 'Uploaded', description: res.publicUrl });
        }
      } catch (err) {
        toast({
          title: 'Upload failed',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [altText, bucket, folder, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
    multiple: true,
    accept: {
      'image/*': [],
      'video/*': [],
      'application/pdf': [],
    },
    maxSize: 1024 * 1024 * 200,
  });

  const borderTone = useMemo(() => {
    if (isDragReject) return 'border-destructive/60';
    if (isDragActive) return 'border-teal-500/70';
    return 'border-border';
  }, [isDragActive, isDragReject]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <Input
          placeholder="Alt text (optional)"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          disabled={disabled || isUploading}
        />
        <Button
          variant="secondary"
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(altText);
              toast({ title: 'Copied', description: 'Alt text copied.' });
            } catch {
              // ignore
            }
          }}
          disabled={!altText.trim() || disabled || isUploading}
        >
          Copy alt
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'rounded-2xl border bg-card/60 p-4 transition',
          borderTone,
          disabled || isUploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:bg-card',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Drag & drop files</p>
            <p className="text-xs text-muted-foreground">
              Upload images/videos/PDFs to <span className="font-mono">{bucket}</span>
              {folder ? (
                <>
                  {' '}
                  (<span className="font-mono">{folder}</span>)
                </>
              ) : null}
            </p>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {isUploading ? 'Uploading…' : isDragActive ? 'Drop now' : 'Browse'}
          </div>
        </div>
      </div>
    </div>
  );
}

