import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { entryKindLabel, formatClock, formatClockRange, type Entry } from '@habitlonia/shared';
import { Pressable, Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';
import { DoneCheck } from './DoneCheck';

type RowProps = { entry: Entry; onOpen: (entry: Entry) => void; onToggleDone?: (entry: Entry) => void };

function EntryRow({ entry, onOpen, onToggleDone }: RowProps) {
  const colors = useThemeColors();
  const isHabit = entry.kind === 'habit';
  const done = entry.done === true;
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the details"
        onPress={() => onOpen(entry)}
        className="flex-1 flex-row items-center gap-3 py-3 active:opacity-60"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
          <MaterialCommunityIcons name="brain" size={22} color="white" />
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className={`text-base ${done ? 'text-ink-muted line-through' : 'text-ink'}`}>
            {entry.title}
          </Text>
          <Text className="text-xs text-ink-muted">
            {[entryKindLabel(entry.kind), entry.tag].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {entry.habitId && <MaterialCommunityIcons name="repeat" size={14} color={colors.brand} />}
        <Text className="text-sm font-medium text-brand">
          {entry.endsAt ? formatClockRange(entry.createdAt, entry.endsAt) : formatClock(entry.createdAt)}
        </Text>
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
      </Pressable>
      {/* Beside the row, not inside it, so ticking a habit doesn't also open it. */}
      {isHabit && onToggleDone && <DoneCheck done={done} onPress={() => onToggleDone(entry)} />}
    </View>
  );
}

type Props = { entries: Entry[]; onOpen: (entry: Entry) => void; onToggleDone?: (entry: Entry) => void };

export function Timeline({ entries, onOpen, onToggleDone }: Props) {
  if (entries.length === 0) {
    return <Text className="px-4 py-10 text-center text-ink-muted">Nothing here yet today.</Text>;
  }

  return (
    <View className="flex-row px-4">
      <View className="flex-1">
        {entries.map((e) => (
          <EntryRow key={e.id} entry={e} onOpen={onOpen} onToggleDone={onToggleDone} />
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
