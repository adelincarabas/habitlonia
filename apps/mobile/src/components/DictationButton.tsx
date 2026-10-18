import Ionicons from '@expo/vector-icons/Ionicons';
import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { useThemeColors } from '@/lib/theme';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

/** Null in Expo Go, which doesn't bundle the native module — dictation needs a dev build. */
const speech: SpeechModule | null =
  Platform.OS === 'web' || requireOptionalNativeModule('ExpoSpeechRecognition')
    ? require('expo-speech-recognition').ExpoSpeechRecognitionModule
    : null;

type Props = { value: string; onChange: (text: string) => void };

/** Mic button that dictates into a text field, appending to whatever is already typed. */
export function DictationButton({ value, onChange }: Props) {
  const colors = useThemeColors();
  const [available] = useState(() => speech?.isRecognitionAvailable() ?? false);
  const [listening, setListening] = useState(false);
  const base = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!speech) return;
    const subs = [
      speech.addListener('result', (e) => {
        const transcript = e.results[0]?.transcript.trim();
        if (transcript) onChangeRef.current(base.current ? `${base.current} ${transcript}` : transcript);
      }),
      speech.addListener('end', () => setListening(false)),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      speech?.abort();
    };
  }, []);

  if (!speech || !available) return null;

  async function toggle() {
    if (!speech) return;
    if (listening) {
      speech.stop();
      return;
    }
    const { granted } = await speech.requestPermissionsAsync();
    if (!granted) return;
    base.current = value.trim();
    setListening(true);
    speech.start({ interimResults: true, addsPunctuation: true });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop dictation' : 'Dictate'}
      accessibilityState={{ selected: listening }}
      onPress={toggle}
      className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${listening ? 'bg-brand' : ''}`}
    >
      <Ionicons name={listening ? 'stop' : 'mic'} size={18} color={listening ? 'white' : colors.ink} />
    </Pressable>
  );
}
