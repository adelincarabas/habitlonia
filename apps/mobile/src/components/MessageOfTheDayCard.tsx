import Ionicons from '@expo/vector-icons/Ionicons';
import type { MessageOfTheDay } from '@habitlonia/shared';
import { Pressable, Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

export function MessageOfTheDayCard({ message, onPress }: { message: MessageOfTheDay; onPress?: () => void }) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 flex-row items-center gap-4 rounded-3xl bg-surface p-4 shadow-sm shadow-black/5 active:opacity-80"
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand">
        <Ionicons name="play" size={22} color="white" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-brand">message of the day</Text>
        <Text numberOfLines={1} className="text-base text-ink">
          {message.text}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </Pressable>
  );
}
