import Ionicons from '@expo/vector-icons/Ionicons';
import type { Insight } from '@habitlonia/shared';
import { useInsights } from '@habitlonia/shared/hooks';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

function iconFor(insight: Insight): ComponentProps<typeof Ionicons>['name'] {
  if (insight.kind === 'weekday') return 'calendar-outline';
  if (insight.kind === 'feeling') return insight.tone === 'up' ? 'happy-outline' : 'sad-outline';
  return insight.tone === 'up' ? 'trending-up' : 'trending-down';
}

/** Patterns across recent habits and feelings, like which habits go together and the weakest weekday. */
export function InsightsCard() {
  const colors = useThemeColors();
  const insights = useInsights();

  return (
    <View className="gap-2">
      <Text className="px-5 text-sm text-ink-muted">Insights</Text>

      <View className="mx-4 gap-4 rounded-3xl bg-surface p-5 shadow-sm shadow-black/5">
        {insights.isPending && <ActivityIndicator />}
        {insights.isError && <Text className="text-center text-sm text-ink-muted">{"Couldn't load your insights."}</Text>}
        {insights.data?.insights.length === 0 && (
          <View className="items-center gap-2 py-2">
            <Ionicons name="sparkles" size={20} color={colors.brand} />
            <Text className="text-center text-sm leading-5 text-ink-muted">
              Keep checking off habits and logging how you feel. After a couple of weeks, patterns will show up here.
            </Text>
          </View>
        )}
        {insights.data?.insights.map((insight, i) => (
          <View
            key={insight.text}
            className={`flex-row gap-3 ${i > 0 ? 'border-t border-ink-faint/30 pt-4' : ''}`}
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-full bg-brand-soft"
              style={insight.color ? { backgroundColor: `${insight.color}26` } : undefined}
            >
              <Ionicons
                name={iconFor(insight)}
                size={18}
                color={insight.tone === 'up' ? (insight.color ?? colors.brand) : colors.inkFaint}
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-base font-semibold leading-6 text-ink">{insight.text}</Text>
              <Text className="text-sm leading-5 text-ink-muted">{insight.detail}</Text>
            </View>
          </View>
        ))}
        {insights.data && insights.data.insights.length > 0 && (
          <Text className="text-xs text-ink-muted">Based on your last {insights.data.days} days.</Text>
        )}
      </View>
    </View>
  );
}
