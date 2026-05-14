import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Caja, CAJA_TIPOS, CajaTipo } from '@/lib/types';

export type CajaFormValues = {
  nombre: string;
  tipo: CajaTipo;
  notas: string;
  activo: boolean;
};

type Props = {
  initial?: Partial<Caja>;
  submitLabel: string;
  onSubmit: (values: CajaFormValues) => Promise<{ error: string | null }>;
  onDelete?: () => Promise<{ error: string | null }>;
};

export function CajaForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [tipo, setTipo] = useState<CajaTipo>(initial?.tipo ?? 'efectivo');
  const [notas, setNotas] = useState(initial?.notas ?? '');
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setPending(true);
    const { error: err } = await onSubmit({
      nombre: nombre.trim(),
      tipo,
      notas: notas.trim(),
      activo,
    });
    setPending(false);
    if (err) setError(traducirError(err));
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setError(null);
    setDeleting(true);
    const { error: err } = await onDelete();
    setDeleting(false);
    if (err) setError(traducirError(err));
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Nombre</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ej: Caja Fuerte Principal"
              placeholderTextColor="#888"
              value={nombre}
              onChangeText={setNombre}
              editable={!pending && !deleting}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Tipo</ThemedText>
            <View style={styles.tipoGroup}>
              {CAJA_TIPOS.map((t) => {
                const selected = tipo === t.value;
                return (
                  <Pressable
                    key={t.value}
                    style={[styles.tipoOption, selected && styles.tipoOptionSelected]}
                    onPress={() => setTipo(t.value)}
                    disabled={pending || deleting}>
                    <ThemedText
                      style={selected ? styles.tipoOptionTextSelected : styles.tipoOptionText}>
                      {t.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Notas (opcional)</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cualquier detalle: número de cuenta, titular, banco..."
              placeholderTextColor="#888"
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={4}
              editable={!pending && !deleting}
            />
          </View>

          <View style={styles.switchRow}>
            <ThemedText type="defaultSemiBold">Activa</ThemedText>
            <Switch value={activo} onValueChange={setActivo} disabled={pending || deleting} />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <Pressable
            style={[styles.button, (pending || deleting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={pending || deleting}>
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>{submitLabel}</ThemedText>
            )}
          </Pressable>

          {onDelete && (
            <Pressable
              style={[styles.deleteButton, (pending || deleting) && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={pending || deleting}>
              {deleting ? (
                <ActivityIndicator color="#b00020" />
              ) : (
                <ThemedText style={styles.deleteButtonText}>Eliminar caja</ThemedText>
              )}
            </Pressable>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function traducirError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('policy')) {
    return 'No tienes permiso para esta acción. Solo un administrador puede crear/editar cajas.';
  }
  return msg;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tipoGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoOption: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tipoOptionSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  tipoOptionText: {
    fontSize: 14,
  },
  tipoOptionTextSelected: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b00020',
  },
  deleteButtonText: {
    color: '#b00020',
    fontWeight: '600',
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
  },
  errorText: { color: '#b00020' },
});
