import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { AuthForm, Field } from '@/components/AuthForm';
import { describeAuthError, useAuth } from '@/lib/auth';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ name, email, password });
      // The root layout swaps to the Today screen once the session exists.
    } catch (err) {
      setError(describeAuthError(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Create account"
      error={error}
      submitLabel="Sign up"
      submitting={submitting}
      onSubmit={submit}
      footer={
        <Text className="text-ink-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand">
            Log in
          </Link>
        </Text>
      }
    >
      <Field label="Name" value={name} onChangeText={setName} placeholder="Billy" autoComplete="name" returnKeyType="next" />
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
