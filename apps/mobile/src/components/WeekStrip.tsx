import { WEEKDAY_INITIALS, toDateKey, type DaySummary } from '@habitlonia/shared';
import { Pressable, Text, View } from 'react-native';

type Props = {
  days: Date[];
  summaries: DaySummary[];
  selected: Date;
  onSelect: (day: Date) => void;
};

const EMPTY_DAY = '#D9DCE8';

export function WeekStrip({ days, summaries, selected, onSelect }: Props) {
  const selectedKey = toDateKey(selected);

  return (
    <View className="flex-row justify-between px-4">
      {days.map((day) => {
        const key = toDateKey(day);
        const colors = summaries.find((s) => s.date === key)?.colors ?? [];
        const [left = EMPTY_DAY, right = left] = colors;
        const isSelected = key === selectedKey;

        return (
          <Pressable key={key} onPress={() => onSelect(day)} className="items-center gap-1.5">
            <Text className="text-xs font-medium text-ink-muted">{WEEKDAY_INITIALS[day.getDay()]}</Text>
            <View
              className={`rounded-full p-0.5 ${isSelected ? 'border-2 border-brand' : 'border-2 border-transparent'}`}
            >
              <View className="h-10 w-10 flex-row overflow-hidden rounded-full">
                <View className="flex-1" style={{ backgroundColor: left }} />
                <View className="flex-1" style={{ backgroundColor: right }} />
                <Text className="absolute inset-0 text-center text-sm font-semibold leading-10 text-white">
                  {day.getDate()}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
