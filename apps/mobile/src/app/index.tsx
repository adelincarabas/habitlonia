import { TODAY_TABS, greetingFor, weekOf, type TodayTabKey } from '@habitlonia/shared';
import { useToday, useTodayEntries, useToggleFocus } from '@habitlonia/shared/hooks';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaptureBar } from '@/components/CaptureBar';
import { FocusCard } from '@/components/FocusCard';
import { GreetingRow } from '@/components/GreetingRow';
import { IconButton } from '@/components/IconButton';
import { MessageOfTheDayCard } from '@/components/MessageOfTheDayCard';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Timeline } from '@/components/Timeline';
import { WeekStrip } from '@/components/WeekStrip';

export default function TodayScreen() {
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [tab, setTab] = useState<TodayTabKey>('memories');

  const today = useToday(selectedDay);
  const entries = useTodayEntries(today.data, tab);
  const toggleFocus = useToggleFocus();

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top']}>
      <View className="w-full max-w-md flex-1 self-center">
        <ScrollView contentContainerClassName="gap-5 pb-40">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <IconButton icon="play-outline" label="Replay" variant="raised" />
            <View className="items-center">
              <Text className="font-hand text-4xl text-ink">Today</Text>
              <View className="-mt-1 h-0.5 w-24 rounded-full bg-brand" />
            </View>
            <IconButton icon="people" label="Friends" variant="raised" />
          </View>

          <WeekStrip
            days={weekOf(selectedDay)}
            summaries={today.data?.week ?? []}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />

          <SegmentedTabs tabs={TODAY_TABS} value={tab} onChange={setTab} />

          {today.isPending && <ActivityIndicator className="py-10" />}
          {today.isError && (
            <Text className="px-4 text-center text-ink-muted">
              Can't reach the API. Is `pnpm dev:api` running?
            </Text>
          )}

          {today.data?.messageOfTheDay && <MessageOfTheDayCard message={today.data.messageOfTheDay} />}
          {today.data?.focus && (
            <FocusCard
              session={today.data.focus}
              onToggle={() => toggleFocus.mutate(today.data.focus!.id)}
            />
          )}

          {today.data && (
            <>
              <GreetingRow greeting={greetingFor(new Date())} name="Billy" />
              <Timeline entries={entries} />
            </>
          )}
        </ScrollView>
        <CaptureBar />
      </View>
    </SafeAreaView>
  );
}
