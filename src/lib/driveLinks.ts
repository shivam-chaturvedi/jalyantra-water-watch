export function extractDriveFileId(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;

  // If it's a supabase URL or has a known file extension, it's likely NOT a drive link that needs parsing
  if (url.includes('supabase.co') || url.includes('firebasestorage') || url.match(/\.(mp4|webm|mov|jpg|jpeg|png|gif|webp)$/i)) {
     // Unless it also contains drive.google.com explicitly
     if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
       return null;
     }
  }

  // 1. Standard pattern: /file/d/ID/view or /d/ID/
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (dMatch?.[1]) return dMatch[1];

  // 2. Query param pattern: ?id=ID
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (idParamMatch?.[1]) return idParamMatch[1];

  // 3. Folder pattern: /folders/ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]{25,})/);
  if (folderMatch?.[1]) return folderMatch[1];

  // 4. Fallback: ONLY if it looks like a raw ID and nothing else
  // If it's a full URL that didn't match the above, don't try to guess an ID from it
  if (!url.includes('://') && !url.includes('/')) {
    const anyIdMatch = url.match(/^([a-zA-Z0-9_-]{25,})$/);
    if (anyIdMatch) return anyIdMatch[1];
  }

  return null;
}


export function toDrivePreviewUrl(rawUrl: string): string | null {
  const id = extractDriveFileId(rawUrl);
  if (!id) return null;
  // Use /preview for iframes/videos
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function toDriveImageUrl(rawUrl: string): string | null {
  const id = extractDriveFileId(rawUrl);
  if (!id) return null;

  // This endpoint is often more resilient to cross-origin issues
  // and works well for both public and session-based access.
  return `https://docs.google.com/thumbnail?id=${id}&sz=w1200`;
}



export function resolveImageSrc(rawUrl: string): string {
  if (!rawUrl) return '';
  // If it's already a direct image link or data URI, return it
  if (rawUrl.startsWith('data:') || rawUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
    return rawUrl;
  }
  const driveUrl = toDriveImageUrl(rawUrl);
  return driveUrl ?? rawUrl;
}

export function toDriveStreamUrl(rawUrl: string): string | null {
  const id = extractDriveFileId(rawUrl);
  if (!id) return null;
  return `https://drive.google.com/uc?id=${id}&export=download`;
}





