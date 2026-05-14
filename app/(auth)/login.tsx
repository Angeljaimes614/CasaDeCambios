import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Email y contraseña son obligatorios.');
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
    // Si todo bien, AuthProvider actualiza el state y el layout redirige solo.
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Iniciar sesión</ThemedText>
        <ThemedText style={styles.subtitle}>CasaDeCambios</ThemedText>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Email</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="tucorreo@ejemplo.com"
            placeholderTextColor="#888"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Contraseña</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#888"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Entrar</ThemedText>
          )}
        </Pressable>

        <View style={styles.footer}>
          <ThemedText>¿No tienes cuenta? </ThemedText>
          <Link href="/(auth)/signup">
            <ThemedText type="link">Regístrate</ThemedText>
          </Link>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    gap: 16,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 16,
  },
  field: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
  },
  errorText: {
    color: '#b00020',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
});
