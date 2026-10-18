import '../../global.css';

import { Caveat_600SemiBold, useFonts } from '@expo-google-fonts/caveat';
import { ApiProvider } from '@habitlonia/shared/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({ Caveat_600SemiBold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={apiClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
