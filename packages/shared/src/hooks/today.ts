import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { CreateEntryInput, CreateHabitInput, FocusSession, TodayResponse } from '../types';
import { focusElapsedSeconds, formatDuration, toDateKey } from '../rules/time';
import { entriesForTab, type TodayTabKey } from '../rules/entries';
import { useApi } from './api-context';

export const todayKey = (date: string) => ['today', date] as const;

export function useToday(date: Date) {
  const api = useApi();
  const key = toDateKey(date);
  return useQuery({ queryKey: todayKey(key), queryFn: () => api.getToday(key) });
}

export function useTodayEntries(today: TodayResponse | undefined, tab: TodayTabKey) {
  return useMemo(() => entriesForTab(today?.entries ?? [], tab), [today, tab]);
}

export function useCreateEntry() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryInput) => api.createEntry(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today'] }),
  });
}

export function useToggleFocus() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleFocus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today'] }),
  });
}

/** Ticks once a second while the session is running and returns "h:mm:ss". */
export function useFocusClock(session: FocusSession | null | undefined): string {
  const [now, setNow] = useState(() => new Date());
  const running = !!session?.runningSince;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [running]);

  return session ? formatDuration(focusElapsedSeconds(session, now)) : '0:00:00';
}

export function useCreateHabit() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => api.createHabit(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today'] }),
  });
}
