import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Caja, CAJA_TIPOS } from '@/lib/types';
import { supabase } from '@/lib/supabase';

function tipoLabel(tipo: Caja['tipo']) {
  return CAJA_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

export default function CajasListScreen() {
  const [cajas, setCajas] = useState<Caja[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('cajas')
      .select('*')
      .order('nombre');
    if (err) setError(err.message);
    else setCajas(data as Caja[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Cajas</ThemedText>
        <Link href="/(tabs)/cajas/nueva" asChild>
          <Pressable style={styles.addBtn}>
            <ThemedText style={styles.addBtnText}>+ Nueva</ThemedText>
          </Pressable>
        </Link>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {!cajas && !error && <ActivityIndicator size="large" style={styles.loader} />}

      {cajas && cajas.length === 0 && (
        <View style={styles.empty}>
          <ThemedText style={styles.emptyText}>
            Todavía no has registrado ninguna caja.
          </ThemedText>
          <ThemedText style={styles.emptyHint}>
            Toca &quot;+ Nueva&quot; para agregar tu primera billetera.
          </ThemedText>
        </View>
      )}

      {cajas && cajas.length > 0 && (
        <FlatList
          data={cajas}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <Link
              href={{ pathname: '/(tabs)/cajas/[id]', params: { id: String(item.id) } }}
              asChild>
              <Pressable style={styles.row}>
                <View style={styles.rowMain}>
                  <ThemedText type="defaultSemiBold">{item.nombre}</ThemedText>
                  <ThemedText style={styles.rowMeta}>
                    {tipoLabel(item.tipo)}
                    {!item.activo && ' · inactivo'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.chevron}>›</ThemedText>
              </Pressable>
            </Link>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  addBtn: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowMeta: {
    opacity: 0.6,
    fontSize: 13,
  },
  chevron: {
    fontSize: 24,
    opacity: 0.4,
  },
  empty: {
    paddingHorizontal: 24,
    paddingTop: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyHint: {
    opacity: 0.6,
  },
  loader: {
    marginTop: 32,
  },
  errorBox: {
    margin: 24,
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
  },
  errorText: {
    color: '#b00020',
  },
});
