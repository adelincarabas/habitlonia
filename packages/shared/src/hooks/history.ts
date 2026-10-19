import { useQuery } from '@tanstack/react-query';
import { toDateKey } from '../rules/time';
import { useApi } from './api-context';

export const historyKey = (from: string, to: string) => ['history', from, to] as const;

/** Habit check-offs per day from `from` to `to`, both included. */
export function useHabitHistory(from: Date, to: Date) {
  const api = useApi();
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  return useQuery({ queryKey: historyKey(fromKey, toKey), queryFn: () => api.getHabitHistory(fromKey, toKey) });
}

// Under 'history' so checking a habit off (which invalidates ['history']) refreshes it too.
export const progressKey = ['history', 'progress'] as const;

/** Health score, level and milestones, worked out from all of the user's habit history. */
export function useProgress() {
  const api = useApi();
  return useQuery({ queryKey: progressKey, queryFn: () => api.getProgress() });
}

export const insightsKey = ['insights'] as const;

/** Smart insights over the last few months, e.g. which habits go together and the weakest weekday. */
export function useInsights() {
  const api = useApi();
  return useQuery({ queryKey: insightsKey, queryFn: () => api.getInsights() });
}
