import Ionicons from '@expo/vector-icons/Ionicons';
import { fromDateKey, HEALTH_BAND_TEXT, HEALTH_WINDOW_DAYS, type Milestone, type MilestoneKey } from '@habitlonia/shared';
import { useProgress } from '@habitlonia/shared/hooks';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

const MILESTONE_ICONS: Record<MilestoneKey, ComponentProps<typeof Ionicons>['name']> = {
  'first-step': 'footsteps-outline',
  'full-day': 'sunny-outline',
  'good-week': 'calendar-outline',
  comeback: 'refresh-outline',
  'steady-month': 'leaf-outline',
  'done-25': 'checkmark-outline',
  'done-100': 'checkmark-done-outline',
  'done-365': 'ribbon-outline',
};

const TREND_TEXT = { up: 'Rising lately', down: 'A little lower lately', level: 'Holding steady' } as const;

const longDate = (key: string) =>
  fromDateKey(key)!.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const describeMilestone = (m: Milestone) =>
  m.earnedOn ? `${m.title}, ${longDate(m.earnedOn)}. ${m.description}` : `${m.title}: ${m.description}`;

/** Habit health, level and milestones. Kept quiet on purpose: no streaks, no confetti, nothing to lose. */
export function ProgressCard() {
  const progress = useProgress();
  const [selected, setSelected] = useState<MilestoneKey | null>(null);
  const colors = useThemeColors();

  if (progress.isPending) return <ActivityIndicator className="py-10" />;
  if (progress.isError) return null;

  const { health, level, milestones } = progress.data;
  const intoLevel = level.totalDone - level.levelStartsAt;
  const levelSize = level.nextLevelAt - level.levelStartsAt;
  const selectedMilestone = milestones.find((m) => m.key === selected);
  const earnedCount = milestones.filter((m) => m.earnedOn).length;

  return (
    <View className="gap-2">
      <Text className="px-5 text-sm text-ink-muted">Progress</Text>

      <View className="mx-4 gap-5 rounded-3xl bg-surface p-5 shadow-sm shadow-black/5">
        <View
          className="flex-row items-center gap-4"
          accessible
          accessibilityLabel={
            health
              ? `Habit health ${health.score} out of 100, ${HEALTH_BAND_TEXT[health.band].label}. ${TREND_TEXT[health.trend]}.`
              : 'Habit health: not enough history yet.'
          }
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
            <Text className="font-hand text-4xl text-brand">{health ? health.score : '–'}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-semibold text-ink">
              {health ? HEALTH_BAND_TEXT[health.band].label : 'Habit health'}
            </Text>
            <Text className="text-sm text-ink-muted">
              {health
                ? `${HEALTH_BAND_TEXT[health.band].note} ${TREND_TEXT[health.trend]}.`
                : 'Check off a few habits and your score will show up here.'}
            </Text>
          </View>
        </View>

        <View
          className="gap-1.5"
          accessible
          accessibilityLabel={`Level ${level.level}. ${level.nextLevelAt - level.totalDone} check-offs to level ${level.level + 1}.`}
        >
          <View className="flex-row items-baseline justify-between">
            <Text className="text-sm font-semibold text-ink">Level {level.level}</Text>
            <Text className="text-xs text-ink-muted">
              {level.nextLevelAt - level.totalDone} to level {level.level + 1}
            </Text>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-ink-faint/30">
            <View className="h-full rounded-full bg-brand" style={{ width: `${(intoLevel / levelSize) * 100}%` }} />
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row justify-between">
            {milestones.map((m) => {
              const earned = m.earnedOn !== null;
              const active = selected === m.key;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  accessibilityLabel={describeMilestone(m)}
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(active ? null : m.key)}
                  className={`h-9 w-9 items-center justify-center rounded-full active:opacity-70 ${
                    earned ? 'bg-brand-soft' : 'border border-dashed border-ink-faint/60'
                  } ${active ? 'border border-brand' : ''}`}
                >
                  <Ionicons name={MILESTONE_ICONS[m.key]} size={16} color={earned ? colors.brand : colors.inkFaint} />
                </Pressable>
              );
            })}
          </View>
          <Text numberOfLines={2} className="text-xs text-ink-muted">
            {selectedMilestone
              ? describeMilestone(selectedMilestone)
              : `${earnedCount} of ${milestones.length} milestones. Tap one for details. Health looks at the last ${HEALTH_WINDOW_DAYS} days.`}
          </Text>
        </View>
      </View>
    </View>
  );
}
