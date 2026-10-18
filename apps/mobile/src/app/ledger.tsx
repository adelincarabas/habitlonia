import { fromDateKey, toDateKey, writeLedger } from '@habitlonia/shared';
import { useNow, useToday } from '@habitlonia/shared/hooks';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { LedgerCard } from '@/components/LedgerCard';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function LedgerScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const day = useMemo(() => fromDateKey(params.date ?? '') ?? new Date(), [params.date]);
  const isToday = toDateKey(day) === toDateKey(new Date());
  // Same query as the Today screen, so it's usually already loaded.
  const today = useToday(day);
  // Re-reads the clock every minute, so habits move from "ahead" to "so far" as their time passes.
  const now = useNow();
  const ledger = useMemo(() => today.data && writeLedger(today.data.entries, day, { now }), [today.data, day, now]);

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top', 'bottom']}>
      <View className="w-full max-w-md flex-1 self-center">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <IconButton icon="close" label="Close" variant="raised" onPress={close} />
          <View className="items-center">
            <Text className="font-hand text-4xl text-ink">Ledger</Text>
            <View className="-mt-1 h-0.5 w-24 rounded-full bg-brand" />
          </View>
          {/* Keeps the title centered against the close button. */}
          <View className="h-10 w-10" />
        </View>
        <Text className="pt-2 text-center text-sm text-ink-muted">
          {isToday ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        <ScrollView contentContainerClassName="gap-5 pb-10 pt-6">
          {today.isPending && <ActivityIndicator className="py-16" />}
          {today.isError && (
            <Text className="px-8 py-16 text-center text-ink-muted">Can't reach the API. Is `pnpm dev:api` running?</Text>
          )}
          {ledger && (
            <>
              <LedgerCard label="Ahead" icon="compass-outline" section={ledger.plan} />
              <LedgerCard label="So far" icon="book-outline" section={ledger.recap} />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
