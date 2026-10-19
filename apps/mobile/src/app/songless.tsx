import Ionicons from '@expo/vector-icons/Ionicons';
import { parseSpotifyPlaylistId } from '@habitlonia/shared';
import { useImportSonglessPlaylist, useSongless } from '@habitlonia/shared/hooks';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { useThemeColors } from '@/lib/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function SonglessPlaylistScreen() {
  const colors = useThemeColors();
  const current = useSongless();
  const importPlaylist = useImportSonglessPlaylist();
  const [link, setLink] = useState('');

  const playlist = current.data?.playlist;
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
            : 'Guess songs from any Spotify playlist'}
        </Text>

        <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-6" keyboardShouldPersistTaps="handled">
          <View className="gap-3 rounded-3xl bg-surface p-5 shadow-sm shadow-black/5">
            <Text className="text-base font-semibold text-ink">Paste a playlist link</Text>
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
                {importPlaylist.isPending ? 'Loading songs…' : playlist ? 'Switch playlist' : 'Start playing'}
              </Text>
            </Pressable>
          </View>
          <Text className="px-4 text-center text-xs text-ink-faint">Songless uses the first 100 songs of a playlist.</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
