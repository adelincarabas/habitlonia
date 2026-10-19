import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddPhotoInput, EntryDetail, TodayResponse, UpdateEntryInput } from '../types';
import { useApi } from './api-context';

export const entryKey = (id: string) => ['entry', id] as const;

export function useEntry(id: string) {
  const api = useApi();
  return useQuery({ queryKey: entryKey(id), queryFn: () => api.getEntry(id) });
}

export function useUpdateEntry(id: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEntryInput) => api.updateEntry(id, input),
    onSuccess: (entry) => {
      qc.setQueryData<EntryDetail>(entryKey(id), (old) => (old ? { ...old, ...entry } : old));
      // The title shows on the Today timeline too.
      return qc.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

/** Checks a habit off, or un-checks it. The tick shows right away; a failed save is undone by the refetch. */
export function useSetHabitDone() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.updateEntry(id, { done }),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ['today'] });
      qc.setQueriesData<TodayResponse>({ queryKey: ['today'] }, (old) =>
        old ? { ...old, entries: old.entries.map((e) => (e.id === id ? { ...e, done } : e)) } : old,
      );
      qc.setQueryData<EntryDetail>(entryKey(id), (old) => (old ? { ...old, done } : old));
    },
    onSettled: (_, __, { id }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['today'] }),
        qc.invalidateQueries({ queryKey: ['history'] }),
        qc.invalidateQueries({ queryKey: ['insights'] }),
        qc.invalidateQueries({ queryKey: entryKey(id) }),
      ]),
  });
}

export function useAddEntryPhoto(entryId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPhotoInput) => api.addEntryPhoto(entryId, input),
    onSuccess: (photo) =>
      qc.setQueryData<EntryDetail>(entryKey(entryId), (old) =>
        old ? { ...old, photos: [...old.photos, photo] } : old,
      ),
  });
}

export function useRemoveEntryPhoto(entryId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.removeEntryPhoto(entryId, photoId),
    onSuccess: (_, photoId) =>
      qc.setQueryData<EntryDetail>(entryKey(entryId), (old) =>
        old ? { ...old, photos: old.photos.filter((p) => p.id !== photoId) } : old,
      ),
  });
}
