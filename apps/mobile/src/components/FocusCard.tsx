import Ionicons from '@expo/vector-icons/Ionicons';
import type { FocusSession } from '@habitlonia/shared';
import { useFocusClock } from '@habitlonia/shared/hooks';
import { Pressable, Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

export function FocusCard({ session, onToggle }: { session: FocusSession; onToggle: () => void }) {
  const clock = useFocusClock(session);
  const running = !!session.runningSince;
  const colors = useThemeColors();

  return (
    <View className="mx-4 flex-row items-center gap-5 rounded-3xl bg-surface px-5 py-6 shadow-sm shadow-black/5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={running ? 'Pause focus' : 'Resume focus'}
        onPress={onToggle}
        className="h-14 w-14 items-center justify-center rounded-full bg-surface shadow-md shadow-black/10 active:opacity-70"
      >
        <Ionicons name={running ? 'pause' : 'play'} size={22} color={colors.ink} />
      </Pressable>
      <View className="flex-1">
        <Text className="font-hand text-lg text-brand">* Focus</Text>
        <Text className="text-2xl font-medium text-ink">{session.label}</Text>
        <Text className="text-sm text-ink-muted">{clock}</Text>
      </View>
      {running && <View className="h-2.5 w-2.5 rounded-full bg-brand" />}
    </View>
  );
}
