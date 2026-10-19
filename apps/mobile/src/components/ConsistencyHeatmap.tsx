import {
  fromDateKey,
  habitStreaks,
  heatLevel,
  heatmapMonthStarts,
  heatmapWeeks,
  toDateKey,
  type HabitDay,
} from '@habitlonia/shared';
import { useHabitHistory, useNow } from '@habitlonia/shared/hooks';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const CELL = 12;
const GAP = 3;
const COLUMN = CELL + GAP;
const GRID_HEIGHT = 7 * CELL + 6 * GAP;

/** Indexed by heat level. Literal class names so Tailwind picks them up. */
const LEVEL_CLASSES = ['bg-ink-faint/25', 'bg-brand/30', 'bg-brand/55', 'bg-brand/80', 'bg-brand'] as const;

/** Only every other weekday is labelled, as on GitHub. */
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const;

const longDate = (key: string) =>
  fromDateKey(key)!.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function describeDay(key: string, day: HabitDay | undefined): string {
  if (!day || (!day.done && !day.missed)) return `${longDate(key)}: nothing due`;
  return `${longDate(key)}: ${day.done} of ${day.done + day.missed} done`;
}

/** A GitHub-style year of habit check-offs, one square per day, darker the more of that day got done. */
export function ConsistencyHeatmap() {
  const now = useNow();
  const todayKey = toDateKey(now);
  const weeks = useMemo(() => heatmapWeeks(fromDateKey(todayKey)!), [todayKey]);
  const history = useHabitHistory(weeks[0]![0]!, now);
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(history.data?.days.map((d) => [d.date, d])), [history.data]);
  const streaks = useMemo(() => habitStreaks(history.data?.days ?? []), [history.data]);
  // A month that only shows a sliver at the left edge goes unlabelled, so its label can't run into the next one.
  const monthStarts = useMemo(
    () => heatmapMonthStarts(weeks).filter((start, i, all) => !all[i + 1] || all[i + 1]!.week - start.week >= 3),
    [weeks],
  );

  // Opens on the latest weeks, like GitHub does on a narrow screen.
  const scroll = useRef<ScrollViewInstance>(null);

  return (
    <View className="gap-2">
      <Text className="px-5 text-sm text-ink-muted">Consistency</Text>

      <View className="mx-4 gap-4 rounded-3xl bg-surface p-5 shadow-sm shadow-black/5">
        <View className="flex-row">
          <Stat value={streaks.current} label="Current streak" />
          <Stat value={streaks.longest} label="Longest streak" />
          <Stat value={streaks.activeDays} label="Active days" />
        </View>

        <View className="flex-row">
          <View style={{ marginTop: 16, gap: GAP }} className="pr-1.5">
            {WEEKDAY_LABELS.map((label, i) => (
              <Text key={i} style={{ height: CELL, lineHeight: CELL }} className="text-[9px] text-ink-muted">
                {label}
              </Text>
            ))}
          </View>

          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          >
            <View>
              <View style={{ height: 16, width: weeks.length * COLUMN - GAP }}>
                {monthStarts.map(({ week, month }) => (
                  <Text
                    key={week}
                    style={{ position: 'absolute', left: week * COLUMN }}
                    className="text-[10px] text-ink-muted"
                  >
                    {new Date(2000, month, 1).toLocaleDateString(undefined, { month: 'short' })}
                  </Text>
                ))}
              </View>

              {history.isPending ? (
                <View style={{ height: GRID_HEIGHT }} className="justify-center">
                  <ActivityIndicator />
                </View>
              ) : (
                <View className="flex-row" style={{ gap: GAP }}>
                  {weeks.map((days, week) => (
                    // Columns fade in one after another, sweeping toward today.
                    <Animated.View key={week} entering={FadeIn.delay(week * 10).duration(300)} style={{ gap: GAP }}>
                      {days.map((day, weekday) => {
                        if (!day) return <View key={weekday} style={{ width: CELL, height: CELL }} />;
                        const key = toDateKey(day);
                        const isSelected = key === selected;
                        return (
                          <Pressable
                            key={weekday}
                            accessibilityRole="button"
                            accessibilityLabel={describeDay(key, byDate.get(key))}
                            hitSlop={1}
                            onPress={() => setSelected(isSelected ? null : key)}
                            style={{ width: CELL, height: CELL }}
                            className={`rounded-[3px] ${LEVEL_CLASSES[heatLevel(byDate.get(key))]} ${
                              isSelected ? 'border-2 border-ink' : ''
                            }`}
                          />
                        );
                      })}
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {history.isError && (
          <Text className="text-center text-sm text-ink-muted">{"Couldn't load your year."}</Text>
        )}

        <View className="flex-row items-center gap-3">
          {selected ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/rundown', params: { date: selected } })}
              className="flex-1 active:opacity-60"
            >
              <Text numberOfLines={1} className="text-xs text-ink">
                {describeDay(selected, byDate.get(selected))}
                <Text className="font-semibold text-brand">{'  Rundown ›'}</Text>
              </Text>
            </Pressable>
          ) : (
            <Text numberOfLines={1} className="flex-1 text-xs text-ink-muted">
              Tap a day for details
            </Text>
          )}
          <View className="flex-row items-center gap-1">
            <Text className="text-[10px] text-ink-muted">Less</Text>
            {LEVEL_CLASSES.map((className) => (
              <View key={className} style={{ width: 10, height: 10 }} className={`rounded-[2px] ${className}`} />
            ))}
            <Text className="text-[10px] text-ink-muted">More</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="font-hand text-4xl text-brand">{value}</Text>
      <Text className="text-xs text-ink-muted">{label}</Text>
    </View>
  );
}
