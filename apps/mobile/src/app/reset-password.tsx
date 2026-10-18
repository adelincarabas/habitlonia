import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { AuthForm, Field } from '@/components/AuthForm';
import { describeAuthError, useAuth } from '@/lib/auth';

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The code is tied to an email, so there's nothing to do here without one.
  if (!email) return <Redirect href="/forgot-password" />;

  async function submit() {
    if (submitting || !email) return;
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword({ email, code, password });
      // The root layout swaps to the Today screen once the session exists.
    } catch (err) {
      setError(describeAuthError(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="New password"
      subtitle={`If ${email} has an account, we sent it a 6-digit code. It expires in 15 minutes.`}
      error={error}
      submitLabel="Set password"
      submitting={submitting}
      onSubmit={submit}
      footer={
        <Text className="text-ink-muted">
          No code?{' '}
          <Link href={{ pathname: '/forgot-password', params: { email } }} replace className="font-semibold text-brand">
            Send another
          </Link>
        </Text>
      }
    >
      <Field
        label="Code"
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        autoComplete="one-time-code"
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="next"
      />
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
    </AuthForm>
  );
}
