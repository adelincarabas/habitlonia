import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FieldProps = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'autoComplete' | 'keyboardType' | 'secureTextEntry' | 'autoCapitalize' | 'returnKeyType' | 'onSubmitEditing' | 'maxLength'
> & { label: string };

export function Field({ label, ...input }: FieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="px-1 text-sm text-ink-muted">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#B9B9C0"
        autoCorrect={false}
        className="h-12 rounded-2xl bg-surface px-4 text-base text-ink shadow-sm shadow-black/5"
        {...input}
      />
    </View>
  );
}

type Props = {
  title: string;
  /** A line of explanation under the title. */
  subtitle?: string;
  error: string | null;
  submitLabel: string;
  submitting: boolean;
  onSubmit: () => void;
  /** The fields. */
  children: ReactNode;
  /** The "switch to the other screen" link under the button. */
  footer: ReactNode;
};

export function AuthForm({ title, subtitle, error, submitLabel, submitting, onSubmit, children, footer }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-surface-sunken">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-md gap-5 self-center">
            <View className="items-center">
              <Text className="font-hand text-5xl text-ink">{title}</Text>
              <View className="-mt-1 h-0.5 w-24 rounded-full bg-brand" />
              {subtitle && <Text className="mt-3 text-center text-ink-muted">{subtitle}</Text>}
            </View>

            <View className="gap-4">{children}</View>

            {error && (
              <Text accessibilityRole="alert" className="px-1 text-center text-sm text-[#A63D2A]">
                {error}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={onSubmit}
              className="h-12 items-center justify-center rounded-full bg-brand active:opacity-80 disabled:opacity-60"
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-semibold text-white">{submitLabel}</Text>}
            </Pressable>

            <View className="items-center">{footer}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
