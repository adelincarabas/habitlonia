import { WEEKDAY_INITIALS, WEEKDAY_NAMES } from '@habitlonia/shared';
import { Pressable, Text, View } from 'react-native';

type Props = { value: number[]; onChange: (weekdays: number[]) => void };

/** Sunday-to-Saturday toggles. Keeps at least one day picked. */
export function WeekdayPicker({ value, onChange }: Props) {
  function toggle(day: number) {
    if (!value.includes(day)) onChange([...value, day]);
    else if (value.length > 1) onChange(value.filter((d) => d !== day));
  }

  return (
    <View className="flex-row justify-between">
      {WEEKDAY_INITIALS.map((initial, day) => {
        const on = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_NAMES[day]}
            accessibilityState={{ checked: on }}
            onPress={() => toggle(day)}
            className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${on ? 'bg-brand' : 'bg-surface'}`}
          >
            <Text className={`text-sm font-semibold ${on ? 'text-white' : 'text-ink-muted'}`}>{initial}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
