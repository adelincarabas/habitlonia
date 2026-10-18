import { parseClock } from '@habitlonia/shared';
import { Text, TextInput, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

type Props = { label: string; value: string; onChange: (text: string) => void };

/** 24-hour "HH:MM" input. Typing "1000" becomes "10:00". */
export function TimeField({ label, value, onChange }: Props) {
  const colors = useThemeColors();
  const invalid = value.length > 0 && parseClock(value) === null;

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    onChange(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
  }

  return (
    <View className="flex-1 gap-1.5">
      <Text className="text-xs font-medium text-ink-muted">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={handleChange}
        placeholder="HH:MM"
        placeholderTextColor={colors.inkFaint}
        keyboardType="number-pad"
        maxLength={5}
        className={`rounded-2xl border-2 bg-surface px-4 py-3 text-center text-2xl font-medium text-ink ${invalid ? 'border-[#E85A3A]' : 'border-transparent'}`}
      />
    </View>
  );
}
