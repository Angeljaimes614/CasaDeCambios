import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

type Moneda = {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  decimales: number;
  es_base: boolean;
};

export default function HomeScreen() {
  const [monedas, setMonedas] = useState<Moneda[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('monedas')
      .select('*')
      .order('codigo')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setMonedas(data as Moneda[]);
      });
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">CasaDeCambios</ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Prueba de conexión con Supabase
      </ThemedText>

      {error && (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
        </View>
      )}

      {!monedas && !error && <ActivityIndicator size="large" style={styles.loader} />}

      {monedas && (
        <View style={styles.list}>
          <ThemedText type="defaultSemiBold">
            {monedas.length} monedas cargadas desde Supabase:
          </ThemedText>
          {monedas.map((m) => (
            <View key={m.id} style={styles.row}>
              <ThemedText type="defaultSemiBold">{m.simbolo}</ThemedText>
              <ThemedText>
                {m.codigo} — {m.nombre}
                {m.es_base ? ' (base)' : ''}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
    gap: 16,
  },
  subtitle: {
    opacity: 0.7,
  },
  loader: {
    marginTop: 32,
  },
  list: {
    gap: 12,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: '#b00020',
  },
});
