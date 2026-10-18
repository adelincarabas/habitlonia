import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ApiError,
  MAX_PHOTOS_PER_ENTRY,
  formatClock,
  formatClockRange,
  type EntryDetail,
  type EntryKind,
} from '@habitlonia/shared';
import { useAddEntryPhoto, useApi, useEntry, useRemoveEntryPhoto, useUpdateEntry } from '@habitlonia/shared/hooks';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DictationButton } from '@/components/DictationButton';
import { IconButton } from '@/components/IconButton';
import { SUPPORTED_PHOTO_TYPES, pickPhotos } from '@/lib/photos';
import { useThemeColors } from '@/lib/theme';

const KIND_TITLES: Record<EntryKind, string> = {
  memory: 'Memory',
  thought: 'Thought',
  feeling: 'Feeling',
  habit: 'Habit',
};

const DESCRIPTION_PLACEHOLDERS: Record<EntryKind, string> = {
  memory: 'What do you want to remember about it?',
  thought: 'Where was this thought going?',
  feeling: 'What brought this feeling on?',
  habit: 'How did it go?',
};

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return "Can't reach the server. Is `pnpm dev:api` running?";
  return 'Something went wrong. Please try again.';
}

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useEntry(id);

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top', 'bottom']}>
      <View className="w-full max-w-md flex-1 self-center">
        {entry.data ? (
          // Keyed so the form's local state starts over if the route switches to another entry.
          <EntryForm key={entry.data.id} entry={entry.data} />
        ) : (
          <>
            <View className="flex-row items-center px-4 pt-2">
              <IconButton icon="chevron-back" label="Back" variant="raised" onPress={close} />
            </View>
            {entry.isPending ? (
              <ActivityIndicator className="py-10" />
            ) : (
              <Text className="px-4 py-10 text-center text-ink-muted">
                {entry.error instanceof ApiError && entry.error.status === 404
                  ? "This entry doesn't exist anymore."
                  : describeError(entry.error)}
              </Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function EntryForm({ entry }: { entry: EntryDetail }) {
  const colors = useThemeColors();
  const update = useUpdateEntry(entry.id);

  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description ?? '');

  const dirty = title.trim() !== entry.title || description.trim() !== (entry.description ?? '');
  const canSave = dirty && title.trim().length > 0 && !update.isPending;

  function save() {
    if (!canSave) return;
    update.mutate({ title: title.trim(), description: description.trim() });
  }

  const when = entry.endsAt ? formatClockRange(entry.createdAt, entry.endsAt) : formatClock(entry.createdAt);
  const day = new Date(entry.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <View className="flex-row items-center justify-between px-4 pt-2">
        <IconButton icon="chevron-back" label="Back" variant="raised" onPress={close} />
        <Text className="font-hand text-4xl text-ink">{KIND_TITLES[entry.kind]}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={save}
          className={`rounded-full px-5 py-2.5 ${canSave ? 'bg-brand active:opacity-70' : 'bg-surface'}`}
        >
          <Text className={`font-semibold ${canSave ? 'text-white' : 'text-ink-faint'}`}>
            {update.isPending ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="gap-6 px-4 pb-10 pt-6" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <Text className="flex-1 text-sm text-ink-muted">
            {[day, when, entry.tag].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-medium text-ink-muted">Title</Text>
          <TextInput
            accessibilityLabel="Title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.inkFaint}
            className="rounded-2xl bg-surface px-4 py-3 text-xl font-semibold text-ink"
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-medium text-ink-muted">Description</Text>
          <View className="flex-row rounded-2xl bg-surface pr-1 pt-1">
            <TextInput
              accessibilityLabel="Description"
              value={description}
              onChangeText={setDescription}
              placeholder={DESCRIPTION_PLACEHOLDERS[entry.kind]}
              placeholderTextColor={colors.inkFaint}
              multiline
              textAlignVertical="top"
              className="min-h-32 flex-1 px-4 py-2 text-base leading-6 text-ink"
            />
            <DictationButton value={description} onChange={setDescription} />
          </View>
        </View>

        {update.isError && <Text className="text-center text-ink-muted">{describeError(update.error)}</Text>}

        <PhotoSection entry={entry} />
      </ScrollView>
    </>
  );
}

function PhotoSection({ entry }: { entry: EntryDetail }) {
  const api = useApi();
  const colors = useThemeColors();
  const addPhoto = useAddEntryPhoto(entry.id);
  const removePhoto = useRemoveEntryPhoto(entry.id);
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const room = MAX_PHOTOS_PER_ENTRY - entry.photos.length - uploading;

  async function add() {
    setMessage(null);
    const { photos, skipped } = await pickPhotos(room);
    const problems: string[] = [];
    if (skipped) problems.push(`Skipped ${skipped} photo${skipped > 1 ? 's' : ''}: use ${SUPPORTED_PHOTO_TYPES}.`);

    // One at a time keeps each request small and shows photos as they land.
    const toUpload = photos.slice(0, room);
    setUploading(toUpload.length);
    for (const photo of toUpload) {
      try {
        await addPhoto.mutateAsync(photo);
      } catch (err) {
        problems.push(describeError(err));
      }
      setUploading((n) => n - 1);
    }
    setUploading(0);
    setMessage(problems.length ? [...new Set(problems)].join('\n') : null);
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs font-medium text-ink-muted">Photos</Text>
        {entry.photos.length > 0 && (
          <Text className="text-xs text-ink-faint">
            {entry.photos.length}/{MAX_PHOTOS_PER_ENTRY}
          </Text>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {entry.photos.map((photo) => (
          <View key={photo.id} className="aspect-square w-[32%] overflow-hidden rounded-2xl bg-surface">
            <Image
              source={{ uri: api.photoUrl(photo) }}
              accessibilityIgnoresInvertColors
              className="h-full w-full"
              resizeMode="cover"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              disabled={removePhoto.isPending}
              onPress={() => removePhoto.mutate(photo.id)}
              hitSlop={8}
              className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/50 active:opacity-70"
            >
              <Ionicons name="close" size={16} color="white" />
            </Pressable>
          </View>
        ))}

        {Array.from({ length: uploading }, (_, i) => (
          <View key={`uploading-${i}`} className="aspect-square w-[32%] items-center justify-center rounded-2xl bg-surface">
            <ActivityIndicator />
          </View>
        ))}

        {room > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            disabled={uploading > 0}
            onPress={add}
            className="aspect-square w-[32%] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-faint active:opacity-70 disabled:opacity-50"
          >
            <Ionicons name="images-outline" size={24} color={colors.ink} />
            <Text className="text-xs font-medium text-ink">Add photos</Text>
          </Pressable>
        )}
      </View>

      {(message || removePhoto.isError) && (
        <Text className="text-sm text-ink-muted">{message ?? describeError(removePhoto.error)}</Text>
      )}
    </View>
  );
}
