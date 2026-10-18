import '../../global.css';

import { Caveat_600SemiBold, useFonts } from '@expo-google-fonts/caveat';
import { ApiProvider } from '@habitlonia/shared/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({ Caveat_600SemiBold });
  const systemScheme = useColorScheme();

  // Native follows the system theme on its own; on web, 'class' dark mode needs <html class="dark"> set by hand.
  useEffect(() => {
    if (Platform.OS === 'web') colorScheme.set(systemScheme === 'dark' ? 'dark' : 'light');
  }, [systemScheme]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={apiClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="add" options={{ presentation: 'modal' }} />
          </Stack>
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
