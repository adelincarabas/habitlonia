import {
  ENTRY_COLORS,
  ENTRY_KIND_OPTIONS,
  EntryKind,
  addDays,
  atClock,
  clockRangeOn,
  clockText,
  formatSpan,
  fromDateKey,
  parseClock,
  type CreateEntryInput,
} from '@habitlonia/shared';
import { useCreateEntry } from '@habitlonia/shared/hooks';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DictationButton } from '@/components/DictationButton';
import { IconButton } from '@/components/IconButton';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TimeField } from '@/components/TimeField';
import { useThemeColors } from '@/lib/theme';

const TAG_PLACEHOLDERS: Record<EntryKind, string> = {
  memory: 'thankful',
  thought: 'curious',
  feeling: 'calm',
  action: 'energized',
};

function nowClock(): string {
  const now = new Date();
  return clockText(now.getHours() * 60 + now.getMinutes());
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function AddEntryScreen() {
  const params = useLocalSearchParams<{ date?: string; kind?: string }>();
  const colors = useThemeColors();
  const create = useCreateEntry();

  const [day, setDay] = useState(() => fromDateKey(params.date ?? '') ?? new Date());
  const [kind, setKind] = useState<EntryKind>(() => EntryKind.safeParse(params.kind).data ?? 'memory');
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [color, setColor] = useState<string>(ENTRY_COLORS[0]);
  const [start, setStart] = useState(nowClock);
  const [end, setEnd] = useState('');

  const isAction = kind === 'action';
  const startMinutes = parseClock(start);
  const endMinutes = parseClock(end);
  const range =
    isAction && startMinutes !== null && endMinutes !== null ? clockRangeOn(day, startMinutes, endMinutes) : null;
  const when = isAction ? range : startMinutes !== null ? { start: atClock(day, startMinutes), end: null } : null;
  const canSave = title.trim().length > 0 && when !== null && !create.isPending;

  function save() {
    if (!canSave || !when) return;
    const input: CreateEntryInput = {
      kind,
      title: title.trim(),
      tag: tag.trim() || undefined,
      color,
      createdAt: when.start.toISOString(),
      endsAt: when.end?.toISOString(),
    };
    create.mutate(input, { onSuccess: close });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top', 'bottom']}>
      <View className="w-full max-w-md flex-1 self-center">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <IconButton icon="close" label="Close" variant="raised" onPress={close} />
          <Text className="font-hand text-4xl text-ink">Add</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={save}
            className={`rounded-full px-5 py-2.5 ${canSave ? 'bg-brand active:opacity-70' : 'bg-surface'}`}
          >
            <Text className={`font-semibold ${canSave ? 'text-white' : 'text-ink-faint'}`}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-6 px-4 pb-10 pt-6" keyboardShouldPersistTaps="handled">
          <View className="-mx-4">
            <SegmentedTabs tabs={ENTRY_KIND_OPTIONS} value={kind} onChange={setKind} />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-medium text-ink-muted">What happened?</Text>
            <View className="flex-row items-center rounded-2xl bg-surface pr-1">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={isAction ? 'went for a run' : 'the walk home after the hike'}
                placeholderTextColor={colors.inkFaint}
                autoFocus
                className="flex-1 px-4 py-3 text-base text-ink"
              />
              <DictationButton value={title} onChange={setTitle} />
            </View>
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-medium text-ink-muted">Tag (optional)</Text>
            <TextInput
              value={tag}
              onChangeText={setTag}
              placeholder={TAG_PLACEHOLDERS[kind]}
              placeholderTextColor={colors.inkFaint}
              className="rounded-2xl bg-surface px-4 py-3 text-base text-ink"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-medium text-ink-muted">Day</Text>
            <View className="flex-row items-center justify-between rounded-2xl bg-surface px-2 py-1">
              <IconButton icon="chevron-back" label="Previous day" onPress={() => setDay((d) => addDays(d, -1))} />
              <Text className="text-base font-medium text-ink">
                {day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <IconButton icon="chevron-forward" label="Next day" onPress={() => setDay((d) => addDays(d, 1))} />
            </View>
          </View>

          <View className="gap-2">
            <View className="flex-row gap-3">
              <TimeField label={isAction ? 'From' : 'At'} value={start} onChange={setStart} />
              {isAction && <TimeField label="To" value={end} onChange={setEnd} />}
            </View>
            {isAction && range && startMinutes !== null && endMinutes !== null && (
              <Text className="text-sm text-ink-muted">
                {formatSpan((range.end.getTime() - range.start.getTime()) / 60000)}
                {endMinutes < startMinutes ? ' · ends the next day' : ''}
              </Text>
            )}
            {isAction && startMinutes !== null && endMinutes !== null && !range && (
              <Text className="text-sm text-ink-muted">An action needs different start and end times.</Text>
            )}
          </View>

          <View className="gap-2">
            <Text className="text-xs font-medium text-ink-muted">Color</Text>
            <View className="flex-row flex-wrap gap-3">
              {ENTRY_COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityLabel={`Color ${c}`}
                  accessibilityState={{ selected: c === color }}
                  onPress={() => setColor(c)}
                  className={`rounded-full border-2 p-0.5 ${c === color ? 'border-ink' : 'border-transparent'}`}
                >
                  <View className="h-9 w-9 rounded-full" style={{ backgroundColor: c }} />
                </Pressable>
              ))}
            </View>
          </View>

          {create.isError && (
            <Text className="text-center text-ink-muted">Couldn't save. Is `pnpm dev:api` running?</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
