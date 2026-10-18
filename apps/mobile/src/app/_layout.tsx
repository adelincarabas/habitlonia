import '../../global.css';

import { Caveat_600SemiBold, useFonts } from '@expo-google-fonts/caveat';
import { ApiProvider } from '@habitlonia/shared/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemePreferenceProvider } from '@/lib/theme-preference';

function RootStack() {
  const { state } = useAuth();
  const signedIn = state.status === 'signedIn';

  // Wait for the saved session to be checked so a logged-in user doesn't flash the login screen.
  if (state.status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="entry/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({ Caveat_600SemiBold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={apiClient}>
          <ThemePreferenceProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <RootStack />
            </AuthProvider>
          </ThemePreferenceProvider>
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
