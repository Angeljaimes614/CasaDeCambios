import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Caja, CAJA_TIPOS, Moneda } from '@/lib/types';

type SaldoRow = {
  id: number;
  saldo: number;
  costo_promedio: number;
  actualizado_en: string;
  moneda_id: number;
  monedas: Moneda;
};

function tipoLabel(tipo: Caja['tipo']) {
  return CAJA_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatMonto(saldo: number, decimales: number) {
  return saldo.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export default function CajaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cajaId = Number(id);
  const { user } = useAuth();
  const [caja, setCaja] = useState<Caja | null>(null);
  const [saldos, setSaldos] = useState<SaldoRow[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!cajaId || !user) return;
    setError(null);

    const [cajaRes, saldosRes, perfilRes] = await Promise.all([
      supabase.from('cajas').select('*').eq('id', cajaId).single(),
      supabase
        .from('saldos_caja')
        .select('id, saldo, costo_promedio, actualizado_en, moneda_id, monedas(*)')
        .eq('caja_id', cajaId)
        .order('moneda_id'),
      supabase.from('perfiles').select('rol').eq('id', user.id).single(),
    ]);

    if (cajaRes.error) setError(cajaRes.error.message);
    else setCaja(cajaRes.data as Caja);

    if (!saldosRes.error) setSaldos((saldosRes.data ?? []) as unknown as SaldoRow[]);

    if (perfilRes.data?.rol === 'admin') setIsAdmin(true);
  }, [cajaId, user]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!caja) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        <View style={styles.headerBlock}>
          <ThemedText type="title">{caja.nombre}</ThemedText>
          <ThemedText style={styles.meta}>
            {tipoLabel(caja.tipo)}
            {!caja.activo && ' · inactiva'}
          </ThemedText>
          {caja.notas && <ThemedText style={styles.notas}>{caja.notas}</ThemedText>}
        </View>

        <View style={styles.actions}>
          <Link
            href={{ pathname: '/(tabs)/cajas/[id]/editar', params: { id: String(cajaId) } }}
            asChild>
            <Pressable style={styles.secondaryBtn}>
              <ThemedText style={styles.secondaryBtnText}>Editar info</ThemedText>
            </Pressable>
          </Link>
          {isAdmin && (
            <Link
              href={{ pathname: '/(tabs)/cajas/[id]/ajustar', params: { id: String(cajaId) } }}
              asChild>
              <Pressable style={styles.primaryBtn}>
                <ThemedText style={styles.primaryBtnText}>+ Ajustar saldo</ThemedText>
              </Pressable>
            </Link>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Saldos</ThemedText>

          {!saldos && <ActivityIndicator style={styles.loader} />}

          {saldos && saldos.length === 0 && (
            <View style={styles.empty}>
              <ThemedText style={styles.emptyText}>
                Esta caja todavía no tiene saldos registrados.
              </ThemedText>
              {isAdmin && (
                <ThemedText style={styles.emptyHint}>
                  Toca &quot;Ajustar saldo&quot; arriba para registrar el saldo inicial.
                </ThemedText>
              )}
            </View>
          )}

          {saldos && saldos.length > 0 && (
            <View style={styles.saldosList}>
              {saldos.map((s) => (
                <View key={s.id} style={styles.saldoRow}>
                  <View style={styles.saldoMain}>
                    <ThemedText type="defaultSemiBold">
                      {s.monedas.codigo} — {s.monedas.nombre}
                    </ThemedText>
                    {!s.monedas.es_base && s.costo_promedio > 0 && (
                      <ThemedText style={styles.saldoMeta}>
                        CPP: ${formatMonto(s.costo_promedio, 2)} / {s.monedas.codigo}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.saldoMonto}>
                    {s.monedas.simbolo} {formatMonto(s.saldo, s.monedas.decimales)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerBlock: { gap: 4 },
  meta: { opacity: 0.6 },
  notas: { marginTop: 8, lineHeight: 22 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#888',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryBtnText: { fontWeight: '600' },
  section: { gap: 12 },
  empty: { paddingVertical: 16, gap: 8 },
  emptyText: { opacity: 0.7 },
  emptyHint: { opacity: 0.5, fontSize: 13 },
  saldosList: { gap: 4 },
  saldoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
    gap: 12,
  },
  saldoMain: { flex: 1, gap: 2 },
  saldoMeta: { fontSize: 12, opacity: 0.6 },
  saldoMonto: { fontSize: 16 },
  loader: { marginTop: 16 },
  errorBox: {
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
  },
  errorText: { color: '#b00020' },
});
