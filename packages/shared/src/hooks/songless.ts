import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ImportSonglessPlaylistInput, SonglessMemoryInput, SonglessResponse, SonglessRound, SonglessTryInput } from '../types';
import { useApi } from './api-context';

/** Songless state for one day: each playlist gets a new song every day. */
export const songlessKey = (date: string) => ['songless', date] as const;

export function useSongless(date: string) {
  const api = useApi();
  return useQuery({ queryKey: songlessKey(date), queryFn: () => api.getSongless(date) });
}

export function useImportSonglessPlaylist() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportSonglessPlaylistInput) => api.importSonglessPlaylist(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['songless'] }),
  });
}

export function useSelectSonglessPlaylist() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.selectSonglessPlaylist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['songless'] }),
  });
}

export function useRemoveSonglessPlaylist() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeSonglessPlaylist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['songless'] }),
  });
}

function useSetRound() {
  const qc = useQueryClient();
  return (round: SonglessRound) =>
    qc.setQueryData<SonglessResponse>(songlessKey(round.date), (old) => (old ? { ...old, round } : old));
}

/** A guess or a skip in today's round. */
export function useSonglessTry(playlistId: string, date: string) {
  const api = useApi();
  const setRound = useSetRound();
  return useMutation({
    mutationFn: (input: SonglessTryInput) => api.songlessTry(playlistId, date, input),
    onSuccess: setRound,
  });
}

/** Saves how the song of the day felt as a memory. */
export function useSaveSonglessMemory(playlistId: string, date: string) {
  const api = useApi();
  const qc = useQueryClient();
  const setRound = useSetRound();
  return useMutation({
    mutationFn: (input: SonglessMemoryInput) => api.saveSonglessMemory(playlistId, date, input),
    onSuccess: (round) => {
      setRound(round);
      // The memory shows on the Today timeline.
      return qc.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
