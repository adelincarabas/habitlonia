import {
  HISTORY_RANGES,
  WEEKDAY_INITIALS,
  addDays,
  fromDateKey,
  historyBars,
  historyRange,
  type HistoryBar,
  type HistoryRangeKey,
} from '@habitlonia/shared';
import { useHabitHistory, useNow } from '@habitlonia/shared/hooks';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SegmentedTabs } from './SegmentedTabs';

const shortDate = (key: string) =>
  fromDateKey(key)!.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function describeBar(bar: HistoryBar): string {
  const when = bar.from === bar.to ? shortDate(bar.from) : `${shortDate(bar.from)} – ${shortDate(bar.to)}`;
  return `${when}: ${bar.done} done, ${bar.missed} missed`;
}

/** Habits done vs. missed over the last week, month or 3 months, as stacked bars. */
export function HabitChart() {
  const [rangeKey, setRangeKey] = useState<HistoryRangeKey>('week');
  const [selected, setSelected] = useState<number | null>(null);
  const range = historyRange(rangeKey);
  const now = useNow();
  const history = useHabitHistory(addDays(now, 1 - range.days), now);

  const bars = useMemo(
    () => (history.data ? historyBars(history.data.days, range.daysPerBar) : []),
    [history.data, range.daysPerBar],
  );
  const done = bars.reduce((n, b) => n + b.done, 0);
  const missed = bars.reduce((n, b) => n + b.missed, 0);
  const tallest = Math.max(1, ...bars.map((b) => b.done + b.missed));
  const selectedBar = selected === null ? undefined : bars[selected];

  function changeRange(key: HistoryRangeKey) {
    setRangeKey(key);
    setSelected(null);
  }

  return (
    <View className="gap-2">
      <Text className="px-5 text-sm text-ink-muted">Habits</Text>
      <SegmentedTabs tabs={HISTORY_RANGES} value={rangeKey} onChange={changeRange} />

      <View className="mx-4 mt-1 gap-4 rounded-3xl bg-surface p-5 shadow-sm shadow-black/5">
        <View className="flex-row">
          <Stat value={done} label="Done" />
          <Stat value={missed} label="Missed" muted />
          <Stat value={done + missed ? `${Math.round((done / (done + missed)) * 100)}%` : '–'} label="Done rate" />
        </View>

        <View className="h-32 flex-row items-end" style={{ gap: range.daysPerBar === 1 && range.days > 7 ? 2 : 6 }}>
          {history.isPending && <ActivityIndicator className="flex-1 self-center" />}
          {history.isError && (
            <Text className="flex-1 self-center text-center text-sm text-ink-muted">{"Couldn't load your habits."}</Text>
          )}
          {bars.map((bar, i) => {
            const total = bar.done + bar.missed;
            const dimmed = selected !== null && selected !== i;
            return (
              <Pressable
                key={bar.from}
                accessibilityRole="button"
                accessibilityLabel={describeBar(bar)}
                onPress={() => setSelected(selected === i ? null : i)}
                className={`h-full flex-1 justify-end ${dimmed ? 'opacity-40' : ''}`}
              >
                {total === 0 ? (
                  <View className="h-0.5 rounded-full bg-ink-faint/40" />
                ) : (
                  <View className="overflow-hidden rounded-md" style={{ height: `${(total / tallest) * 100}%` }}>
                    <View className="bg-ink-faint/50" style={{ flex: bar.missed }} />
                    <View className="bg-brand" style={{ flex: bar.done }} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {bars.length > 0 && (
          <View className="-mt-2 flex-row justify-between">
            {rangeKey === 'week'
              ? bars.map((bar) => (
                  <Text key={bar.from} className="flex-1 text-center text-xs text-ink-muted">
                    {WEEKDAY_INITIALS[fromDateKey(bar.from)!.getDay()]}
                  </Text>
                ))
              : [bars[0]!, bars.at(-1)!].map((bar, i) => (
                  <Text key={bar.from} className="text-xs text-ink-muted">
                    {i === 0 ? shortDate(bar.from) : 'Today'}
                  </Text>
                ))}
          </View>
        )}

        <View className="flex-row items-center gap-4">
          <Legend className="bg-brand" label="Done" />
          <Legend className="bg-ink-faint/50" label="Missed" />
          <Text numberOfLines={1} className="flex-1 text-right text-xs text-ink-muted">
            {selectedBar ? describeBar(selectedBar) : 'Tap a bar for details'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label, muted }: { value: number | string; label: string; muted?: boolean }) {
  return (
    <View className="flex-1 items-center">
      <Text className={`font-hand text-4xl ${muted ? 'text-ink-muted' : 'text-brand'}`}>{value}</Text>
      <Text className="text-xs text-ink-muted">{label}</Text>
    </View>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2.5 w-2.5 rounded-full ${className}`} />
      <Text className="text-xs text-ink-muted">{label}</Text>
    </View>
  );
}
