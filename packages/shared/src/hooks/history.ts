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
