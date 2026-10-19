import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ImportSonglessPlaylistInput } from '../types';
import { useApi } from './api-context';

export const songlessKey = ['songless'] as const;

export function useSongless() {
  const api = useApi();
  return useQuery({ queryKey: songlessKey, queryFn: () => api.getSongless() });
}

export function useImportSonglessPlaylist() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportSonglessPlaylistInput) => api.importSonglessPlaylist(input),
    onSuccess: (data) => qc.setQueryData(songlessKey, data),
  });
}
