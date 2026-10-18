import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { IconButton } from './IconButton';

type Props = { greeting: string; name: string; onLedger?: () => void; onHistory?: () => void };

export function GreetingRow({ greeting, name, onLedger, onHistory }: Props) {
  return (
    <View className="flex-row items-center gap-2 px-4">
      <View className="flex-1">
        <Text className="font-hand text-3xl text-ink">
          {greeting}, {name}.
        </Text>
        <View className="-mt-1 h-0.5 w-40 rounded-full bg-ink" />
      </View>
      <Ionicons name="sunny" size={22} color="#F2B705" />
      <IconButton icon="time-outline" label="History" onPress={onHistory} />
      <Pressable
        onPress={onLedger}
        className="flex-row items-center gap-1 rounded-full bg-surface px-4 py-2 shadow-sm shadow-black/5 active:opacity-70"
      >
        <Text className="font-semibold text-brand">Ledger</Text>
        <Ionicons name="chevron-forward" size={16} color="#2B4BDB" />
      </Pressable>
    </View>
  );
}
