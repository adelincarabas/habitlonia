import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { entryKindLabel, formatClock, formatClockRange, type Entry } from '@habitlonia/shared';
import { Text, View } from 'react-native';

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
        <MaterialCommunityIcons name="brain" size={22} color="white" />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base text-ink">
          {entry.title}
        </Text>
        <Text className="text-xs text-ink-muted">
          {[entryKindLabel(entry.kind), entry.tag].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text className="text-sm font-medium text-brand">
        {entry.endsAt ? formatClockRange(entry.createdAt, entry.endsAt) : formatClock(entry.createdAt)}
      </Text>
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
    </View>
  );
}

export function Timeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <Text className="px-4 py-10 text-center text-ink-muted">Nothing here yet today.</Text>;
  }

  return (
    <View className="flex-row px-4">
      <View className="flex-1">
        {entries.map((e) => (
          <EntryRow key={e.id} entry={e} />
        ))}
      </View>
      {/* Day rail: one colored segment per entry, like the screenshot's right edge. */}
      <View className="ml-4 w-1 overflow-hidden rounded-full">
        {entries.map((e) => (
          <View key={e.id} className="flex-1" style={{ backgroundColor: e.color }} />
        ))}
      </View>
    </View>
  );
}
