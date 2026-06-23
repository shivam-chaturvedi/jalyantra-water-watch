import { supabase } from '@/lib/supabaseClient';

export type SiteFlagKey = 'show_deployments' | 'show_validation' | 'show_image_carousel';

export type SiteFlag = {
  key: SiteFlagKey;
  value: boolean;
  updated_at: string;
};

export type AppPage = {
  path: string;
  title: string;
  is_enabled: boolean;
  sort_order: number;
  updated_at: string;
};

export type MediaAsset = {
  id: string;
  bucket: string;
  object_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  alt_text: string | null;
  created_at: string;
  created_by: string | null;
};

export type DeploymentRecord = {
  slug: string;
  title: string;
  data: Record<string, unknown>;
  updated_at: string;
};

export type DeviceMasterData = {
  device_id: string;
  well_diameter_m: number | null;
  well_depth_m: number | null;
  pump_intake_level_m: number | null;
  pump_diameter_in: number | null;
  is_pump_connected: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchSiteFlags(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from('site_flags').select('key,value');
  if (error) throw error;
  const out: Record<string, boolean> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}

export async function setSiteFlag(key: SiteFlagKey, value: boolean): Promise<void> {
  const { error } = await supabase.from('site_flags').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}

export async function fetchAppPages(): Promise<AppPage[]> {
  const { data, error } = await supabase
    .from('app_pages')
    .select('path,title,is_enabled,sort_order,updated_at')
    .order('sort_order', { ascending: true })
    .order('path', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AppPage[];
}

export async function setAppPageEnabled(path: string, isEnabled: boolean): Promise<void> {
  const { error } = await supabase.from('app_pages').upsert(
    { path, is_enabled: isEnabled },
    { onConflict: 'path' },
  );
  if (error) throw error;
}

export async function listMediaAssets(): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id,bucket,object_path,mime_type,size_bytes,alt_text,created_at,created_by')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as MediaAsset[];
}

export function getPublicMediaUrl(bucket: string, objectPath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function uploadFileToBucket(
  bucket: string,
  file: File,
  opts?: { altText?: string; folder?: string },
): Promise<{ bucket: string; objectPath: string; publicUrl: string }> {
  console.log(`[Storage] Starting upload to ${bucket}...`);
  const safeName = file.name.replace(/[^\w.-]+/g, '-');
  const folder = (opts?.folder ?? new Date().toISOString().slice(0, 10)).replace(/\/+/g, '-');
  
  // Robust UUID fallback for older browsers or non-secure contexts
  const uuid = typeof crypto.randomUUID === 'function' 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const objectPath = `${folder}/${uuid}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  
  if (uploadError) {
    console.error(`[Storage] Upload error:`, uploadError);
    throw uploadError;
  }

  const publicUrl = `${getPublicMediaUrl(bucket, objectPath)}?v=${Date.now()}`;
  console.log(`[Storage] Upload success: ${publicUrl}`);
  return { bucket, objectPath, publicUrl };
}


export async function uploadMediaFile(file: File, opts?: { altText?: string }): Promise<MediaAsset> {
  const bucket = 'site-media';
  const safeName = file.name.replace(/[^\w.-]+/g, '-');
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      bucket,
      object_path: objectPath,
      mime_type: file.type || null,
      size_bytes: file.size,
      alt_text: opts?.altText ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function deleteMediaAsset(asset: Pick<MediaAsset, 'id' | 'bucket' | 'object_path'>): Promise<void> {
  const { error: storageError } = await supabase.storage.from(asset.bucket).remove([asset.object_path]);
  if (storageError) throw storageError;
  const { error: dbError } = await supabase.from('media_assets').delete().eq('id', asset.id);
  if (dbError) throw dbError;
}

export async function fetchSiteContent(key: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('site_content').select('data').eq('key', key).maybeSingle();
  if (error) throw error;
  return (data?.data ?? {}) as Record<string, unknown>;
}

export async function setSiteContent(key: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('site_content').upsert({ key, data }, { onConflict: 'key' });
  if (error) throw error;
}

export async function fetchDeployment(slug: string): Promise<DeploymentRecord | null> {
  const { data, error } = await supabase
    .from('deployments')
    .select('slug,title,data,updated_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DeploymentRecord | null;
}

export async function fetchAllDeployments(): Promise<DeploymentRecord[]> {
  const { data, error } = await supabase
    .from('deployments')
    .select('slug,title,data,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DeploymentRecord[];
}

export async function setDeployment(slug: string, patch: { title?: string; data?: Record<string, unknown> }): Promise<void> {
  const { error } = await supabase
    .from('deployments')
    .upsert({ slug, ...(patch.title != null ? { title: patch.title } : {}), ...(patch.data != null ? { data: patch.data } : {}) }, { onConflict: 'slug' });
  if (error) throw error;
}

export async function deleteDeployment(slug: string): Promise<void> {
  const { error } = await supabase.from('deployments').delete().eq('slug', slug);
  if (error) throw error;
}

export async function fetchDeviceMasterData(deviceId: string): Promise<DeviceMasterData | null> {
  const { data, error } = await supabase
    .from('device_master_data')
    .select('device_id,well_diameter_m,well_depth_m,pump_intake_level_m,pump_diameter_in,is_pump_connected,notes,created_at,updated_at')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DeviceMasterData | null;
}

export async function fetchAllDeviceMasterData(): Promise<DeviceMasterData[]> {
  const { data, error } = await supabase
    .from('device_master_data')
    .select('device_id,well_diameter_m,well_depth_m,pump_intake_level_m,pump_diameter_in,is_pump_connected,notes,created_at,updated_at')
    .order('device_id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DeviceMasterData[];
}

export async function deleteDeviceMasterData(deviceId: string): Promise<void> {
  const { error } = await supabase.from('device_master_data').delete().eq('device_id', deviceId);
  if (error) throw error;
}

export async function upsertDeviceMasterData(patch: {
  device_id: string;
  well_diameter_m?: number | null;
  well_depth_m?: number | null;
  pump_intake_level_m?: number | null;
  pump_diameter_in?: number | null;
  is_pump_connected?: boolean;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('device_master_data').upsert(
    {
      device_id: patch.device_id,
      ...(patch.well_diameter_m !== undefined ? { well_diameter_m: patch.well_diameter_m } : {}),
      ...(patch.well_depth_m !== undefined ? { well_depth_m: patch.well_depth_m } : {}),
      ...(patch.pump_intake_level_m !== undefined ? { pump_intake_level_m: patch.pump_intake_level_m } : {}),
      ...(patch.pump_diameter_in !== undefined ? { pump_diameter_in: patch.pump_diameter_in } : {}),
      ...(patch.is_pump_connected !== undefined ? { is_pump_connected: patch.is_pump_connected } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
    { onConflict: 'device_id' },
  );
  if (error) throw error;
}
