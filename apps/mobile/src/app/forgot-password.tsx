import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { AuthForm, Field } from '@/components/AuthForm';
import { apiClient } from '@/lib/api';
import { describeAuthError } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  // Carry over whatever was typed on the login screen.
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.forgotPassword({ email });
      router.push({ pathname: '/reset-password', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(describeAuthError(err));
    }
    setSubmitting(false);
  }

  return (
    <AuthForm
      title="Forgot password"
      subtitle="Enter your account's email and we'll send you a code to set a new password."
      error={error}
      submitLabel="Send code"
      submitting={submitting}
      onSubmit={submit}
      footer={
        <Text className="text-ink-muted">
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-brand">
            Log in
          </Link>
        </Text>
      }
    >
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
    </AuthForm>
  );
}
