import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { useAuth } from '@/lib/auth';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function ProfileScreen() {
  const { state, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  // The root layout swaps to the login screen once the session is gone.
  if (state.status !== 'signedIn') return null;
  const { user } = state;

  async function logOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top', 'bottom']}>
      <View className="w-full max-w-md flex-1 self-center">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <IconButton icon="close" label="Close" variant="raised" onPress={close} />
          <Text className="font-hand text-4xl text-ink">Profile</Text>
          {/* Keeps the title centered against the close button. */}
          <View className="h-10 w-10" />
        </View>

        <View className="items-center gap-2 px-4 pt-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-soft">
            <Text className="font-hand text-5xl text-brand">{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text className="mt-2 font-hand text-4xl text-ink">{user.name}</Text>
          <Text className="text-ink-muted">{user.email}</Text>
        </View>

        <View className="mt-auto px-6 pb-6">
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={logOut}
            className="h-12 items-center justify-center rounded-full bg-surface shadow-sm shadow-black/5 active:opacity-70 disabled:opacity-60"
          >
            {signingOut ? (
              <ActivityIndicator />
            ) : (
              <Text className="text-base font-semibold text-[#A63D2A]">Log out</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
