import { fromDateKey, toDateKey, writeRundown } from '@habitlonia/shared';
import { useNow, useToday } from '@habitlonia/shared/hooks';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { RundownCard } from '@/components/RundownCard';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function RundownScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const day = useMemo(() => fromDateKey(params.date ?? '') ?? new Date(), [params.date]);
  const isToday = toDateKey(day) === toDateKey(new Date());
  // Same query as the Today screen, so it's usually already loaded.
  const today = useToday(day);
  // Re-reads the clock every minute, so habits move from "ahead" to "so far" as their time passes.
  const now = useNow();
  const rundown = useMemo(() => today.data && writeRundown(today.data.entries, day, { now }), [today.data, day, now]);

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top', 'bottom']}>
      <View className="w-full max-w-md flex-1 self-center">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <IconButton icon="close" label="Close" variant="raised" onPress={close} />
          <View className="items-center">
            <Text className="font-hand text-4xl text-ink">Rundown</Text>
            <View className="-mt-1 h-0.5 w-24 rounded-full bg-brand" />
          </View>
          {/* Keeps the title centered against the close button. */}
          <View className="h-10 w-10" />
        </View>
        <Text className="pt-2 text-center text-sm text-ink-muted">
          {isToday
            ? 'Today'
            : day.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                // Days opened from another year in the calendar need it.
                year: day.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
              })}
        </Text>

        <ScrollView contentContainerClassName="gap-5 pb-10 pt-6">
          {today.isPending && <ActivityIndicator className="py-16" />}
          {today.isError && (
            <Text className="px-8 py-16 text-center text-ink-muted">Can't reach the API. Is `pnpm dev:api` running?</Text>
          )}
          {rundown && (
            <>
              <RundownCard label="Ahead" icon="compass-outline" section={rundown.plan} />
              <RundownCard label="So far" icon="book-outline" section={rundown.recap} />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
