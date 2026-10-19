import Ionicons from '@expo/vector-icons/Ionicons';
import type { SonglessSong } from '@habitlonia/shared';
import { useApi } from '@habitlonia/shared/hooks';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DictationButton } from '@/components/DictationButton';
import { useThemeColors } from '@/lib/theme';

type Props = {
  song: SonglessSong | null;
  visible: boolean;
  saving: boolean;
  error?: string;
  onSave: (feeling: string) => void;
  onClose: () => void;
};

/** Popup after a Songless round: play the song again and write down how it makes you feel, saved as a memory. */
export function SonglessMemoryModal({ song, visible, saving, error, onSave, onClose }: Props) {
  return (
    <Modal visible={visible && !!song} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 items-center justify-center bg-black/50 px-4"
      >
        {/* Mounted only while open, so the song stops and its player is released when the popup closes. */}
        {visible && song && <MemoryForm song={song} saving={saving} error={error} onSave={onSave} onClose={onClose} />}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MemoryForm({ song, saving, error, onSave, onClose }: Omit<Props, 'visible' | 'song'> & { song: SonglessSong }) {
  const api = useApi();
  const colors = useThemeColors();
  const [feeling, setFeeling] = useState('');
  const player = useAudioPlayer({ uri: api.songlessPreviewUrl(song) }, { updateInterval: 250 });
  const audio = useAudioPlayerStatus(player);

  const canSave = feeling.trim().length > 0 && !saving;
  const progress = audio.duration > 0 ? Math.min(audio.currentTime / audio.duration, 1) : 0;

  function togglePlay() {
    if (audio.playing) {
      player.pause();
      return;
    }
    // Once the preview has played to the end, start it over.
    if (audio.didJustFinish || (audio.duration > 0 && audio.currentTime >= audio.duration)) player.seekTo(0);
    player.play();
  }

  return (
    <View className="w-full max-w-md gap-5 rounded-3xl bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text className="font-hand text-lg text-brand">* Song of the day</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} className="active:opacity-70">
          <Ionicons name="close" size={20} color={colors.inkFaint} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-4">
        <Image source={{ uri: api.songlessArtworkUrl(song) }} className="h-20 w-20 rounded-2xl bg-brand-soft" />
        <View className="flex-1 gap-2">
          <View>
            <Text numberOfLines={1} className="text-xl font-medium text-ink">
              {song.title}
            </Text>
            <Text numberOfLines={1} className="text-sm text-ink-muted">
              {song.artist}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={audio.playing ? 'Pause' : 'Play the song'}
              disabled={!audio.isLoaded}
              onPress={togglePlay}
              className="h-10 w-10 items-center justify-center rounded-full bg-brand active:opacity-80"
            >
              {audio.isLoaded ? (
                <Ionicons name={audio.playing ? 'pause' : 'play'} size={18} color="white" />
              ) : (
                <ActivityIndicator color="white" />
              )}
            </Pressable>
            <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-soft">
              <View className="h-full rounded-full bg-brand" style={{ width: `${progress * 100}%` }} />
            </View>
          </View>
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-base font-semibold text-ink">How does this song make you feel?</Text>
        <View className="flex-row items-start gap-2">
          <TextInput
            value={feeling}
            onChangeText={setFeeling}
            placeholder="It takes me back to…"
            placeholderTextColor={colors.inkFaint}
            multiline
            autoFocus
            className="min-h-24 flex-1 rounded-2xl bg-surface-sunken px-4 py-3 text-base text-ink"
            style={{ textAlignVertical: 'top' }}
          />
          <DictationButton value={feeling} onChange={setFeeling} />
        </View>
        {error && <Text className="text-sm text-red-500">{error}</Text>}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="flex-1 items-center justify-center rounded-full bg-brand-soft py-3 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-brand">Not now</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={() => onSave(feeling.trim())}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand py-3 active:opacity-80 ${
            canSave ? '' : 'opacity-50'
          }`}
        >
          {saving ? <ActivityIndicator color="white" /> : <Ionicons name="bookmark" size={16} color="white" />}
          <Text className="text-sm font-semibold text-white">Save memory</Text>
        </Pressable>
      </View>
    </View>
  );
}
