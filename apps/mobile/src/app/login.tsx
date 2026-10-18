import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { AuthForm, Field } from '@/components/AuthForm';
import { describeAuthError, useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      // The root layout swaps to the Today screen once the session exists.
    } catch (err) {
      setError(describeAuthError(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Welcome back"
      error={error}
      submitLabel="Log in"
      submitting={submitting}
      onSubmit={submit}
      footer={
        <Text className="text-ink-muted">
          New here?{' '}
          <Link href="/register" className="font-semibold text-brand">
            Create an account
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
        returnKeyType="next"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        autoComplete="current-password"
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
    </AuthForm>
  );
}
