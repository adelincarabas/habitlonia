import { colorScheme } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { storage } from './storage';

const KEY = 'habitlonia.theme';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_OPTIONS: readonly { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

type ThemePreferenceValue = { preference: ThemePreference; setPreference: (next: ThemePreference) => void };

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

/** Applies the saved light/dark choice and remembers changes on this device. */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference | null>(null);
  const systemScheme = useColorScheme();

  useEffect(() => {
    storage
      .get(KEY)
      .then((saved) => setPreferenceState(isPreference(saved) ? saved : 'system'))
      .catch(() => setPreferenceState('system'));
  }, []);

  useEffect(() => {
    if (!preference) return;
    // Native overrides the OS appearance and follows it again on 'system'. On web, 'class' dark mode
    // needs <html class="dark"> set by hand, so 'system' has to be resolved here.
    if (Platform.OS === 'web' && preference === 'system') colorScheme.set(systemScheme === 'dark' ? 'dark' : 'light');
    else colorScheme.set(preference);
  }, [preference, systemScheme]);

  const value = useMemo<ThemePreferenceValue | null>(
    () =>
      preference && {
        preference,
        setPreference: (next) => {
          setPreferenceState(next);
          storage.set(KEY, next).catch(() => {
            // Still applied for this session; it just won't be remembered.
          });
        },
      },
    [preference],
  );

  // Wait for the saved choice so the app doesn't flash the wrong theme on launch.
  if (!value) return null;

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemePreferenceValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) throw new Error('useThemePreference must be used inside <ThemePreferenceProvider>');
  return value;
}
