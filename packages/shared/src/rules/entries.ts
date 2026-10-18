import type { DaySummary, Entry, EntryKind } from '../types';
import { toDateKey } from './time';

/** Tabs on the Today screen, mapped to the entry kinds they show. */
export const TODAY_TABS = [
  { key: 'memories', label: 'Memories', kinds: ['memory', 'thought'] },
  { key: 'feelings', label: 'Feelings', kinds: ['feeling'] },
  { key: 'actions', label: 'Actions', kinds: ['action'] },
  { key: 'scenes', label: 'Scenes', kinds: ['scene'] },
] as const satisfies readonly { key: string; label: string; kinds: readonly EntryKind[] }[];

export type TodayTabKey = (typeof TODAY_TABS)[number]['key'];

export function entriesForTab(entries: Entry[], tab: TodayTabKey): Entry[] {
  const kinds: readonly EntryKind[] = TODAY_TABS.find((t) => t.key === tab)?.kinds ?? [];
  return entries
    .filter((e) => kinds.includes(e.kind))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Picks the two most frequent colors of a day's entries to tint its bubble. */
export function summarizeDay(date: Date, entries: Entry[]): DaySummary {
  const key = toDateKey(date);
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (toDateKey(new Date(e.createdAt)) !== key) continue;
    counts.set(e.color, (counts.get(e.color) ?? 0) + 1);
  }
  const colors = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => c);
  return { date: key, colors };
}

export function entryKindLabel(kind: EntryKind): string {
  return `a ${kind}`;
}
