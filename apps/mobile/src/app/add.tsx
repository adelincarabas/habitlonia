import {
  ENTRY_COLORS,
  ENTRY_KIND_OPTIONS,
  EntryKind,
  REPEAT_OPTIONS,
  addDays,
  atClock,
  clockRangeOn,
  clockText,
  describeRepeat,
  formatSpan,
  fromDateKey,
  parseClock,
  repeatFor,
  toDateKey,
  type CreateEntryInput,
  type RepeatOption,
} from '@habitlonia/shared';
import { useCreateEntry, useCreateHabit } from '@habitlonia/shared/hooks';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DictationButton } from '@/components/DictationButton';
import { IconButton } from '@/components/IconButton';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TimeField } from '@/components/TimeField';
import { WeekdayPicker } from '@/components/WeekdayPicker';
import { useThemeColors } from '@/lib/theme';

const TITLE_PLACEHOLDERS: Record<EntryKind, string> = {
  memory: 'the walk home after the hike',
  thought: 'call her back later',
  feeling: 'calm after coffee',
  habit: 'go for a run',
};

const TAG_PLACEHOLDERS: Record<EntryKind, string> = {
  memory: 'thankful',
  thought: 'curious',
  feeling: 'calm',
  habit: 'energized',
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
  const createEntry = useCreateEntry();
  const createHabit = useCreateHabit();

  const [day, setDay] = useState(() => fromDateKey(params.date ?? '') ?? new Date());
  const [kind, setKind] = useState<EntryKind>(() => EntryKind.safeParse(params.kind).data ?? 'memory');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [color, setColor] = useState<string>(ENTRY_COLORS[0]);
  const [start, setStart] = useState(nowClock);
  const [end, setEnd] = useState('');
  const [repeatOption, setRepeatOption] = useState<RepeatOption>('once');
  const [weekdays, setWeekdays] = useState(() => [day.getDay()]);

  const isHabit = kind === 'habit';
  const repeat = isHabit ? repeatFor(repeatOption, weekdays) : null;
  const startMinutes = parseClock(start);
  const endMinutes = parseClock(end);
  const range =
    isHabit && startMinutes !== null && endMinutes !== null ? clockRangeOn(day, startMinutes, endMinutes) : null;
  const when = isHabit ? range : startMinutes !== null ? { start: atClock(day, startMinutes), end: null } : null;
  const isPending = createEntry.isPending || createHabit.isPending;
  const canSave = title.trim().length > 0 && when !== null && !isPending;

  function save() {
    if (!canSave || !when) return;
    if (repeat && startMinutes !== null && endMinutes !== null) {
      createHabit.mutate(
        {
          title: title.trim(),
          tag: tag.trim() || undefined,
          color,
          startsOn: toDateKey(day),
          startMinutes,
          endMinutes,
          repeat,
        },
        { onSuccess: close },
      );
      return;
    }
    const input: CreateEntryInput = {
      kind,
      title: title.trim(),
      description: description.trim() || undefined,
      tag: tag.trim() || undefined,
      color,
      createdAt: when.start.toISOString(),
      endsAt: when.end?.toISOString(),
    };
    createEntry.mutate(input, { onSuccess: close });
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
              {isPending ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-6 px-4 pb-10 pt-6" keyboardShouldPersistTaps="handled">
          <View className="-mx-4">
            <SegmentedTabs tabs={ENTRY_KIND_OPTIONS} value={kind} onChange={setKind} />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-medium text-ink-muted">Title</Text>
            <TextInput
              accessibilityLabel="Title"
              value={title}
              onChangeText={setTitle}
              placeholder={TITLE_PLACEHOLDERS[kind]}
              placeholderTextColor={colors.inkFaint}
              autoFocus
              className="rounded-2xl bg-surface px-4 py-3 text-base text-ink"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-medium text-ink-muted">What happened? (optional)</Text>
            <View className="flex-row rounded-2xl bg-surface pr-1 pt-1">
              <TextInput
                accessibilityLabel="What happened?"
                value={description}
                onChangeText={setDescription}
                placeholder="Tell the story, as much or as little as you like"
                placeholderTextColor={colors.inkFaint}
                multiline
                textAlignVertical="top"
                className="min-h-24 flex-1 px-4 py-2 text-base leading-6 text-ink"
              />
              <DictationButton value={description} onChange={setDescription} />
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
            <Text className="text-xs font-medium text-ink-muted">{repeat ? 'Starting' : 'Day'}</Text>
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
              <TimeField label={isHabit ? 'From' : 'At'} value={start} onChange={setStart} />
              {isHabit && <TimeField label="To" value={end} onChange={setEnd} />}
            </View>
            {isHabit && range && startMinutes !== null && endMinutes !== null && (
              <Text className="text-sm text-ink-muted">
                {formatSpan((range.end.getTime() - range.start.getTime()) / 60000)}
                {endMinutes < startMinutes ? ' · ends the next day' : ''}
              </Text>
            )}
            {isHabit && startMinutes !== null && endMinutes !== null && !range && (
              <Text className="text-sm text-ink-muted">A habit needs different start and end times.</Text>
            )}
          </View>

          {isHabit && (
            <View className="gap-2">
              <Text className="text-xs font-medium text-ink-muted">Repeat</Text>
              <View className="-mx-4">
                <SegmentedTabs tabs={REPEAT_OPTIONS} value={repeatOption} onChange={setRepeatOption} />
              </View>
              {repeat?.every === 'week' && <WeekdayPicker value={weekdays} onChange={setWeekdays} />}
              {repeat && <Text className="text-sm text-ink-muted">{describeRepeat(repeat)}</Text>}
            </View>
          )}

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

          {(createEntry.isError || createHabit.isError) && (
            <Text className="text-center text-ink-muted">Couldn't save. Is `pnpm dev:api` running?</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
