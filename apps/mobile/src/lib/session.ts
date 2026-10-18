import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'habitlonia.session-token';

// Keychain / Keystore on native. The browser has neither, so web falls back to localStorage.
const storage = {
  get: async (): Promise<string | null> =>
    Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY),
  set: async (value: string): Promise<void> => {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, value);
    else await SecureStore.setItemAsync(KEY, value);
  },
  remove: async (): Promise<void> => {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  },
};

// The API client reads the token synchronously-ish on every request, so keep a copy in memory.
let token: string | null = null;

export const getToken = () => token;

export async function loadToken(): Promise<string | null> {
  token = await storage.get();
  return token;
}

export async function saveToken(next: string): Promise<void> {
  token = next;
  await storage.set(next);
}

export async function clearToken(): Promise<void> {
  token = null;
  await storage.remove();
}
