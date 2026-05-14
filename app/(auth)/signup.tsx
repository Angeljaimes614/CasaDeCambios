import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!nombre.trim() || !email || !password) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setPending(true);
    const { error: err, needsConfirmation } = await signUp(
      email.trim(),
      password,
      nombre.trim(),
    );
    setPending(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsConfirmation) {
      setConfirmationSent(true);
    }
    // Si no necesita confirmación, AuthProvider redirige solo.
  };

  if (confirmationSent) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">¡Casi listo!</ThemedText>
        <ThemedText style={styles.text}>
          Te enviamos un correo a {email}. Revisa tu bandeja y haz clic en el enlace para
          confirmar tu cuenta. Después vuelve aquí e inicia sesión.
        </ThemedText>
        <Pressable
          style={styles.button}
          onPress={() => router.replace('/(auth)/login')}>
          <ThemedText style={styles.buttonText}>Ir al inicio de sesión</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemedText type="title">Crear cuenta</ThemedText>
          <ThemedText style={styles.subtitle}>CasaDeCambios</ThemedText>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Nombre completo</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor="#888"
              autoCapitalize="words"
              value={nombre}
              onChangeText={setNombre}
              editable={!pending}
            />
          </View>

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
              editable={!pending}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Contraseña (mín. 8 caracteres)</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#888"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              editable={!pending}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <Pressable
            style={[styles.button, pending && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={pending}>
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Registrarme</ThemedText>
            )}
          </Pressable>

          <View style={styles.footer}>
            <ThemedText>¿Ya tienes cuenta? </ThemedText>
            <Link href="/(auth)/login">
              <ThemedText type="link">Inicia sesión</ThemedText>
            </Link>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
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
  text: {
    marginTop: 16,
    lineHeight: 22,
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
