import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { Caja, Moneda } from '@/lib/types';

type SaldoActual = {
  saldo: number;
  costo_promedio: number;
};

export default function AjustarSaldoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cajaId = Number(id);

  const [caja, setCaja] = useState<Caja | null>(null);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [monedaId, setMonedaId] = useState<number | null>(null);
  const [saldoActual, setSaldoActual] = useState<SaldoActual | null>(null);
  const [saldoInput, setSaldoInput] = useState('');
  const [cppInput, setCppInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar caja + monedas activas
  useEffect(() => {
    if (!cajaId) return;
    Promise.all([
      supabase.from('cajas').select('*').eq('id', cajaId).single(),
      supabase.from('monedas').select('*').eq('activo', true).order('codigo'),
    ]).then(([cajaRes, monedasRes]) => {
      if (cajaRes.data) setCaja(cajaRes.data as Caja);
      if (monedasRes.data) {
        const list = monedasRes.data as Moneda[];
        setMonedas(list);
        if (list.length > 0) setMonedaId(list[0].id);
      }
      setLoading(false);
    });
  }, [cajaId]);

  // Cuando cambie la moneda seleccionada, traer saldo actual
  useEffect(() => {
    if (!cajaId || monedaId == null) return;
    supabase
      .from('saldos_caja')
      .select('saldo, costo_promedio')
      .eq('caja_id', cajaId)
      .eq('moneda_id', monedaId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSaldoActual(data as SaldoActual);
          setSaldoInput(String(data.saldo));
          setCppInput(data.costo_promedio > 0 ? String(data.costo_promedio) : '');
        } else {
          setSaldoActual(null);
          setSaldoInput('');
          setCppInput('');
        }
      });
  }, [cajaId, monedaId]);

  const monedaSel = monedas.find((m) => m.id === monedaId);
  const esMonedaBase = monedaSel?.es_base ?? false;

  const handleSubmit = async () => {
    setError(null);

    if (monedaId == null) {
      setError('Selecciona una moneda.');
      return;
    }

    const saldoNum = Number(saldoInput.replace(/,/g, '.'));
    if (Number.isNaN(saldoNum)) {
      setError('Saldo inválido. Usa solo números (ej: 1500.50).');
      return;
    }

    let cppNum = 0;
    if (esMonedaBase) {
      cppNum = 1;
    } else if (cppInput.trim()) {
      cppNum = Number(cppInput.replace(/,/g, '.'));
      if (Number.isNaN(cppNum) || cppNum < 0) {
        setError('Costo promedio inválido.');
        return;
      }
    }

    setSaving(true);
    const { error: err } = await supabase.from('saldos_caja').upsert(
      {
        caja_id: cajaId,
        moneda_id: monedaId,
        saldo: saldoNum,
        costo_promedio: cppNum,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: 'caja_id,moneda_id' },
    );
    setSaving(false);

    if (err) {
      setError(
        err.message.toLowerCase().includes('row-level security')
          ? 'Solo un administrador puede ajustar saldos.'
          : err.message,
      );
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
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
          {caja && (
            <View style={styles.headerBlock}>
              <ThemedText type="subtitle">{caja.nombre}</ThemedText>
              <ThemedText style={styles.meta}>Ajuste manual de saldo</ThemedText>
            </View>
          )}

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Moneda</ThemedText>
            <View style={styles.monedaGroup}>
              {monedas.map((m) => {
                const selected = monedaId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.monedaOption, selected && styles.monedaOptionSelected]}
                    onPress={() => setMonedaId(m.id)}
                    disabled={saving}>
                    <ThemedText
                      style={
                        selected ? styles.monedaOptionTextSelected : styles.monedaOptionText
                      }>
                      {m.codigo}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {saldoActual && (
            <View style={styles.infoBox}>
              <ThemedText style={styles.infoText}>
                Saldo actual: {monedaSel?.simbolo} {saldoActual.saldo}
                {!esMonedaBase &&
                  saldoActual.costo_promedio > 0 &&
                  ` · CPP: $${saldoActual.costo_promedio} / ${monedaSel?.codigo}`}
              </ThemedText>
            </View>
          )}

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">
              Saldo nuevo ({monedaSel?.simbolo ?? ''} {monedaSel?.codigo ?? ''})
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
              value={saldoInput}
              onChangeText={setSaldoInput}
              editable={!saving}
            />
          </View>

          {!esMonedaBase && (
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                Costo promedio (opcional, en moneda base por unidad)
              </ThemedText>
              <ThemedText style={styles.hint}>
                Cuánto te costó en promedio cada {monedaSel?.codigo}. Déjalo vacío si no
                tienes la información todavía — lo calcularemos cuando registres
                operaciones reales.
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#888"
                keyboardType="decimal-pad"
                value={cppInput}
                onChangeText={setCppInput}
                editable={!saving}
              />
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <Pressable
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Guardar saldo</ThemedText>
            )}
          </Pressable>
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
    gap: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerBlock: { gap: 4, marginBottom: 8 },
  meta: { opacity: 0.6 },
  field: { gap: 8 },
  hint: { opacity: 0.6, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  monedaGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monedaOption: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  monedaOptionSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  monedaOptionText: { fontSize: 14 },
  monedaOptionTextSelected: { fontSize: 14, color: '#fff', fontWeight: '600' },
  infoBox: {
    padding: 12,
    backgroundColor: '#eef6f9',
    borderRadius: 8,
  },
  infoText: { fontSize: 13, color: '#0a7ea4' },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  errorBox: {
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
  },
  errorText: { color: '#b00020' },
});
