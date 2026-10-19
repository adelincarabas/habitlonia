import { WEEKDAY_INITIALS, monthGrid, toDateKey } from '@habitlonia/shared';
import { useHabitHistory } from '@habitlonia/shared/hooks';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';

const MONTHS = Array.from({ length: 12 }, (_, month) => month);

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function openDay(day: Date) {
  router.push({ pathname: '/rundown', params: { date: toDateKey(day) } });
}

export default function CalendarScreen() {
  const thisYear = new Date().getFullYear();
  const todayKey = toDateKey(new Date());
  const [year, setYear] = useState(thisYear);
  const history = useHabitHistory(new Date(year, 0, 1), new Date(year, 11, 31));
  const doneDays = useMemo(
    () => new Set(history.data?.days.filter((d) => d.done > 0).map((d) => d.date)),
    [history.data],
  );

  // Opens on the current month instead of January.
  const scroll = useRef<ScrollViewInstance>(null);
  const scrolledToToday = useRef(false);

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top', 'bottom']}>
      <View className="w-full max-w-md flex-1 self-center">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <IconButton icon="close" label="Close" variant="raised" onPress={close} />
          <View className="items-center">
            <Text className="font-hand text-4xl text-ink">Calendar</Text>
            <View className="-mt-1 h-0.5 w-24 rounded-full bg-brand" />
          </View>
          {/* Keeps the title centered against the close button. */}
          <View className="h-10 w-10" />
        </View>

        <View className="flex-row items-center justify-center gap-4 pt-4">
          <IconButton icon="chevron-back" label="Previous year" onPress={() => setYear(year - 1)} />
          <Text className="w-24 text-center font-hand text-3xl text-ink">{year}</Text>
          <IconButton icon="chevron-forward" label="Next year" onPress={() => setYear(year + 1)} />
        </View>
        <View className="flex-row items-center justify-center gap-2 pb-2">
          <View className="h-2.5 w-2.5 rounded-full bg-brand" />
          <Text className="text-xs text-ink-muted">A habit was done · tap a day for its rundown</Text>
          {history.isFetching && <ActivityIndicator size="small" />}
        </View>
        {history.isError && (
          <Text className="px-8 text-center text-sm text-ink-muted">{`Couldn't load your habits for ${year}.`}</Text>
        )}

        <ScrollView ref={scroll} contentContainerClassName="gap-4 px-4 pb-10 pt-2">
          {MONTHS.map((month) => (
            <View
              key={month}
              onLayout={(e) => {
                if (year !== thisYear || month !== new Date().getMonth() || scrolledToToday.current) return;
                scrolledToToday.current = true;
                scroll.current?.scrollTo({ y: e.nativeEvent.layout.y, animated: false });
              }}
              className="gap-2 rounded-3xl bg-surface p-4 shadow-sm shadow-black/5"
            >
              <Text className="font-hand text-2xl text-ink">
                {new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' })}
              </Text>
              <View className="flex-row">
                {WEEKDAY_INITIALS.map((initial, i) => (
                  <Text key={i} className="flex-1 text-center text-xs font-medium text-ink-muted">
                    {initial}
                  </Text>
                ))}
              </View>
              {monthGrid(year, month).map((week, row) => (
                <View key={row} className="flex-row">
                  {week.map((day, i) => {
                    if (!day) return <View key={i} className="flex-1" />;
                    const key = toDateKey(day);
                    const done = doneDays.has(key);
                    const isToday = key === todayKey;
                    return (
                      <View key={i} className="flex-1 items-center">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${day.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}${done ? ', habits done' : ''}`}
                          onPress={() => openDay(day)}
                          className={`h-9 w-9 items-center justify-center rounded-full active:opacity-60 ${
                            done ? 'bg-brand' : ''
                          } ${isToday ? 'border-2 border-brand' : ''}`}
                        >
                          <Text
                            className={`text-sm ${done ? 'font-semibold text-white' : isToday ? 'font-semibold text-brand' : 'text-ink'}`}
                          >
                            {day.getDate()}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
