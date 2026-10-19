import Ionicons from '@expo/vector-icons/Ionicons';
import {
  isCorrectGuess,
  pickNextSong,
  searchSongs,
  SONGLESS_CLIP_SECONDS,
  type SonglessPlaylist,
  type SonglessSong,
} from '@habitlonia/shared';
import { useApi } from '@habitlonia/shared/hooks';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

type Attempt = { kind: 'skip' } | { kind: 'wrong'; song: SonglessSong };
type Status = 'guessing' | 'won' | 'lost';

const MAX_SECONDS = SONGLESS_CLIP_SECONDS[SONGLESS_CLIP_SECONDS.length - 1];
const formatSeconds = (s: number) => `${s}s`;

/** Songless on the Today screen: hear a sliver of a song from your playlist and name it. */
export function SonglessCard({ playlist, onChangePlaylist }: { playlist: SonglessPlaylist; onChangePlaylist: () => void }) {
  const api = useApi();
  const colors = useThemeColors();
  const played = useRef(new Set<string>());
  const [song, setSong] = useState(() => pickNextSong(playlist.songs, played.current));
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [status, setStatus] = useState<Status>('guessing');
  const [query, setQuery] = useState('');

  const player = useAudioPlayer(null, { updateInterval: 50 });
  const audio = useAudioPlayerStatus(player);
  // Seconds of the clip heard so far while it plays, for the progress bar.
  const [heard, setHeard] = useState(0);
  const [clipPlaying, setClipPlaying] = useState(false);
  const stopAt = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  // A new playlist was picked: start over with a song from it.
  const [shownPlaylist, setShownPlaylist] = useState(playlist);
  if (shownPlaylist !== playlist) {
    setShownPlaylist(playlist);
    played.current = new Set();
    setSong(pickNextSong(playlist.songs, played.current));
    setAttempts([]);
    setStatus('guessing');
    setQuery('');
  }

  useEffect(() => {
    if (!song) return;
    played.current.add(song.id);
    stopClip();
    player.replace({ uri: api.songlessPreviewUrl(song) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, player, api]);

  // The player is released on unmount; just make sure nothing keeps polling it.
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const step = Math.min(attempts.length, SONGLESS_CLIP_SECONDS.length - 1);
  const clipSeconds = status === 'guessing' ? SONGLESS_CLIP_SECONDS[step] : MAX_SECONDS;
  const suggestions = useMemo(() => searchSongs(playlist.songs, query), [playlist.songs, query]);

  function stopClip() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stopAt.current = null;
    setHeard(0);
    setClipPlaying(false);
    player.pause();
  }

  // A timer can't stop audio within 0.1s of when it was actually heard, so watch the playhead every frame instead.
  function watchPlayhead() {
    const t = player.currentTime;
    if (stopAt.current !== null && t >= stopAt.current) {
      stopClip();
      return;
    }
    setHeard(t);
    frame.current = requestAnimationFrame(watchPlayhead);
  }

  async function playClip() {
    if (stopAt.current !== null) {
      stopClip();
      return;
    }
    await player.seekTo(0);
    stopAt.current = clipSeconds;
    setClipPlaying(true);
    player.play();
    frame.current = requestAnimationFrame(watchPlayhead);
  }

  function nextAttempt(attempt: Attempt) {
    stopClip();
    const next = [...attempts, attempt];
    setAttempts(next);
    if (next.length >= SONGLESS_CLIP_SECONDS.length) setStatus('lost');
  }

  function guess(picked: SonglessSong) {
    if (!song) return;
    setQuery('');
    if (isCorrectGuess(song, picked)) {
      stopClip();
      setStatus('won');
    } else {
      nextAttempt({ kind: 'wrong', song: picked });
    }
  }

  function nextSong() {
    stopClip();
    setAttempts([]);
    setStatus('guessing');
    setQuery('');
    setSong(pickNextSong(playlist.songs, played.current, song?.id));
  }

  if (!song) return null;

  const nextSeconds = SONGLESS_CLIP_SECONDS[step + 1];

  return (
    <View className="mx-4 gap-4 rounded-3xl bg-surface px-5 py-5 shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between">
        <Text className="font-hand text-lg text-brand">* Songless</Text>
        <Pressable accessibilityRole="button" onPress={onChangePlaylist} className="flex-row items-center gap-1 active:opacity-70">
          <Text numberOfLines={1} className="max-w-48 text-sm text-ink-muted">
            {playlist.name}
          </Text>
          <Ionicons name="swap-horizontal" size={14} color={colors.inkFaint} />
        </Pressable>
      </View>

      {status === 'guessing' ? (
        <View className="flex-row items-center gap-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clipPlaying ? 'Stop' : `Play ${formatSeconds(clipSeconds)}`}
            disabled={!audio.isLoaded}
            onPress={playClip}
            className="h-14 w-14 items-center justify-center rounded-full bg-surface shadow-md shadow-black/10 active:opacity-70"
          >
            {audio.isLoaded ? (
              <Ionicons name={clipPlaying ? 'stop' : 'play'} size={22} color={colors.ink} />
            ) : (
              <ActivityIndicator />
            )}
          </Pressable>
          <View className="flex-1 gap-2">
            <Text className="text-2xl font-medium text-ink">{formatSeconds(clipSeconds)}</Text>
            <View className="h-1.5 overflow-hidden rounded-full bg-brand-soft">
              <View className="h-full rounded-full bg-brand" style={{ width: `${Math.min(heard / clipSeconds, 1) * 100}%` }} />
            </View>
          </View>
        </View>
      ) : (
        <Reveal song={song} artworkUrl={api.songlessArtworkUrl(song)} won={status === 'won'} seconds={SONGLESS_CLIP_SECONDS[step]} />
      )}

      <View className="flex-row gap-1.5">
        {SONGLESS_CLIP_SECONDS.map((seconds, i) => {
          const attempt = attempts[i];
          const tone =
            status === 'won' && i === attempts.length
              ? 'bg-emerald-500'
              : attempt
                ? attempt.kind === 'skip'
                  ? 'bg-ink-faint'
                  : 'bg-red-500'
                : i === step && status === 'guessing'
                  ? 'bg-brand'
                  : 'bg-brand-soft';
          return (
            <View key={seconds} className="flex-1 items-center gap-1">
              <View className={`h-1.5 w-full rounded-full ${tone}`} />
              <Text className="text-xs text-ink-muted">{formatSeconds(seconds)}</Text>
            </View>
          );
        })}
      </View>

      {attempts.length > 0 && (
        <View className="gap-1">
          {attempts.map((attempt, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <Ionicons
                name={attempt.kind === 'skip' ? 'play-skip-forward' : 'close'}
                size={14}
                color={attempt.kind === 'skip' ? colors.inkFaint : '#EF4444'}
              />
              <Text numberOfLines={1} className="flex-1 text-sm text-ink-muted">
                {attempt.kind === 'skip' ? 'Skipped' : `${attempt.song.title} · ${attempt.song.artist}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {status === 'guessing' ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Know it? Search the playlist…"
              placeholderTextColor={colors.inkFaint}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => suggestions[0] && guess(suggestions[0])}
              className="flex-1 rounded-2xl bg-surface-sunken px-4 py-3 text-base text-ink"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => nextAttempt({ kind: 'skip' })}
              className="rounded-2xl bg-brand-soft px-4 py-3 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-brand">
                {nextSeconds ? `Skip +${+(nextSeconds - clipSeconds).toFixed(1)}s` : 'Give up'}
              </Text>
            </Pressable>
          </View>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => guess(s)}
              className="rounded-2xl px-4 py-2 active:bg-surface-sunken"
            >
              <Text numberOfLines={1} className="text-base text-ink">
                {s.title}
              </Text>
              <Text numberOfLines={1} className="text-sm text-ink-muted">
                {s.artist}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => (audio.playing ? player.pause() : player.play())}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand-soft py-3 active:opacity-70"
          >
            <Ionicons name={audio.playing ? 'pause' : 'play'} size={16} color={colors.brand} />
            <Text className="text-sm font-semibold text-brand">{audio.playing ? 'Pause' : 'Listen'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={nextSong}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand py-3 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-white">Next song</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

type RevealProps = { song: SonglessSong; artworkUrl: string; won: boolean; seconds: number };

function Reveal({ song, artworkUrl, won, seconds }: RevealProps) {
  return (
    <View className="flex-row items-center gap-4">
      <Image source={{ uri: artworkUrl }} className="h-16 w-16 rounded-2xl bg-brand-soft" />
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${won ? 'text-emerald-500' : 'text-red-500'}`}>
          {won ? `Got it in ${formatSeconds(seconds)}` : 'Out of tries'}
        </Text>
        <Text numberOfLines={1} className="text-xl font-medium text-ink">
          {song.title}
        </Text>
        <Text numberOfLines={1} className="text-sm text-ink-muted">
          {song.artist}
        </Text>
      </View>
    </View>
  );
}

/** Shown until a playlist is picked. */
export function SonglessSetupCard({ onSetUp }: { onSetUp: () => void }) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSetUp}
      className="mx-4 flex-row items-center gap-5 rounded-3xl bg-surface px-5 py-6 shadow-sm shadow-black/5 active:opacity-80"
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-surface shadow-md shadow-black/10">
        <Ionicons name="musical-notes" size={22} color={colors.ink} />
      </View>
      <View className="flex-1">
        <Text className="font-hand text-lg text-brand">* Songless</Text>
        <Text className="text-base text-ink">Guess songs from your playlist in 0.1s</Text>
        <Text className="text-sm text-ink-muted">Paste a Spotify playlist link to start</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </Pressable>
  );
}
