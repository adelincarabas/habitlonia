import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './IconButton';

type Props = { onVoice?: () => void; onVideo?: () => void; onExpand?: () => void };

/** Floating capture controls pinned to the bottom of the Today screen. */
export function CaptureBar({ onVoice, onVideo, onExpand }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 flex-row items-center justify-between px-6"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <IconButton icon="mic" label="Record voice" size="md" variant="raised" onPress={onVoice} />
      <IconButton icon="videocam" label="Record video" size="lg" variant="brand" onPress={onVideo} />
      <IconButton icon="chevron-up" label="Expand" size="md" variant="raised" onPress={onExpand} />
    </View>
  );
}
