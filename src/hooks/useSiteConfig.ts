import { useQuery } from '@tanstack/react-query';
import { fetchAppPages, fetchSiteFlags } from '@/lib/siteAdmin';

export function useSiteFlags() {
  return useQuery({ queryKey: ['site_flags'], queryFn: fetchSiteFlags, staleTime: 30_000 });
}

export function useAppPages() {
  return useQuery({ queryKey: ['app_pages'], queryFn: fetchAppPages, staleTime: 30_000 });
}

