import Ionicons from '@expo/vector-icons/Ionicons';
import { parseSpotifyPlaylistId, toDateKey, type SavedSonglessPlaylist } from '@habitlonia/shared';
import {
  useImportSonglessPlaylist,
  useRemoveSonglessPlaylist,
  useSelectSonglessPlaylist,
  useSongless,
} from '@habitlonia/shared/hooks';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { useThemeColors } from '@/lib/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function SonglessPlaylistScreen() {
  const colors = useThemeColors();
  const current = useSongless(toDateKey(new Date()));
  const importPlaylist = useImportSonglessPlaylist();
  const selectPlaylist = useSelectSonglessPlaylist();
  const removePlaylist = useRemoveSonglessPlaylist();
  const [link, setLink] = useState('');

  const playlist = current.data?.playlist;
  const saved = current.data?.playlists ?? [];
  const valid = parseSpotifyPlaylistId(link) !== null;

  function load() {
    if (!valid || importPlaylist.isPending) return;
    importPlaylist.mutate({ link }, { onSuccess: close });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top', 'bottom']}>
      <View className="w-full max-w-md flex-1 self-center">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <IconButton icon="close" label="Close" variant="raised" onPress={close} />
          <View className="items-center">
            <Text className="font-hand text-4xl text-ink">Songless</Text>
            <View className="-mt-1 h-0.5 w-24 rounded-full bg-brand" />
          </View>
          {/* Keeps the title centered against the close button. */}
          <View className="h-10 w-10" />
        </View>
        <Text className="px-8 pt-2 text-center text-sm text-ink-muted">
          {playlist
            ? `Playing from ${playlist.name} · ${playlist.songs.length} songs`
            : 'Guess a song a day from any Spotify playlist'}
        </Text>

        <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-6" keyboardShouldPersistTaps="handled">
          {saved.length > 0 && (
            <View className="gap-1 rounded-3xl bg-surface p-3 shadow-sm shadow-black/5">
              <Text className="px-2 pb-1 pt-2 text-base font-semibold text-ink">Your playlists</Text>
              {saved.map((item) => (
                <SavedPlaylistRow
                  key={item.id}
                  playlist={item}
                  playing={item.id === playlist?.id}
                  busy={selectPlaylist.isPending || removePlaylist.isPending}
                  onPlay={() => selectPlaylist.mutate(item.id, { onSuccess: close })}
                  onRemove={() => removePlaylist.mutate(item.id)}
                />
              ))}
              {(selectPlaylist.isError || removePlaylist.isError) && (
                <Text className="px-2 text-sm text-red-500">
                  {(selectPlaylist.error ?? removePlaylist.error)?.message}
                </Text>
              )}
            </View>
          )}

          <View className="gap-3 rounded-3xl bg-surface p-5 shadow-sm shadow-black/5">
            <Text className="text-base font-semibold text-ink">
              {saved.length > 0 ? 'Add another playlist' : 'Paste a playlist link'}
            </Text>
            <Text className="text-sm text-ink-muted">
              In Spotify, open a playlist, tap ··· then Share, then Copy link. The playlist has to be public.
            </Text>
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder="https://open.spotify.com/playlist/…"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={load}
              className="rounded-2xl bg-surface-sunken px-4 py-3 text-base text-ink"
            />
            {link.trim().length > 0 && !valid && (
              <Text className="text-sm text-red-500">{"That doesn't look like a Spotify playlist link"}</Text>
            )}
            {importPlaylist.isError && <Text className="text-sm text-red-500">{importPlaylist.error.message}</Text>}
            <Pressable
              accessibilityRole="button"
              disabled={!valid || importPlaylist.isPending}
              onPress={load}
              className={`flex-row items-center justify-center gap-2 rounded-full bg-brand py-4 active:opacity-80 ${
                valid && !importPlaylist.isPending ? '' : 'opacity-50'
              }`}
            >
              {importPlaylist.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="musical-notes" size={18} color="white" />
              )}
              <Text className="text-base font-semibold text-white">
                {importPlaylist.isPending ? 'Loading songs…' : playlist ? 'Add and play' : 'Start playing'}
              </Text>
            </Pressable>
          </View>
          <Text className="px-4 text-center text-xs text-ink-faint">
            Each playlist has one song a day. Songless uses the first 100 songs of a playlist.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

type RowProps = {
  playlist: SavedSonglessPlaylist;
  playing: boolean;
  busy: boolean;
  onPlay: () => void;
  onRemove: () => void;
};

/** A saved playlist: tap to play it, with its link to open in Spotify. */
function SavedPlaylistRow({ playlist, playing, busy, onPlay, onRemove }: RowProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onPlay}
        className="flex-1 flex-row items-center gap-3 rounded-2xl px-2 py-2 active:bg-surface-sunken"
      >
        <View className={`h-10 w-10 items-center justify-center rounded-full ${playing ? 'bg-brand' : 'bg-brand-soft'}`}>
          <Ionicons name={playing ? 'musical-notes' : 'play'} size={16} color={playing ? 'white' : colors.brand} />
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-base text-ink">
            {playlist.name}
          </Text>
          <Text numberOfLines={1} className="text-sm text-ink-muted">
            {[playing ? 'Playing' : null, `${playlist.songCount} songs`, playlist.playedToday ? 'played today' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${playlist.name} in Spotify`}
        onPress={() => Linking.openURL(playlist.link)}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-sunken"
      >
        <Ionicons name="open-outline" size={16} color={colors.inkFaint} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${playlist.name}`}
        disabled={busy}
        onPress={onRemove}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-sunken"
      >
        <Ionicons name="trash-outline" size={16} color={colors.inkFaint} />
      </Pressable>
    </View>
  );
}
