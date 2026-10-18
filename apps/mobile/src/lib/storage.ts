import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keychain / Keystore on native. The browser has neither, so web falls back to localStorage.
export const storage = {
  get: async (key: string): Promise<string | null> =>
    Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key),
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
