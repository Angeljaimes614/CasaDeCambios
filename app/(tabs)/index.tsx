import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Caja, CAJA_TIPOS, Moneda, Perfil } from '@/lib/types';

type SaldoRow = {
  id: number;
  caja_id: number;
  moneda_id: number;
  saldo: number;
  costo_promedio: number;
  monedas: Moneda;
};

type TotalMoneda = {
  moneda: Moneda;
  total: number;
  valorCop: number | null; // null = sin valoración (algún saldo tiene CPP=0)
};

type ResumenCaja = {
  caja: Caja;
  valorCop: number | null; // null = tiene saldos pero alguno sin CPP
  monedasConSaldo: number;
};

function tipoLabel(tipo: Caja['tipo']) {
  return CAJA_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatMonto(value: number, decimales: number) {
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function calcularResumen(saldos: SaldoRow[], cajas: Caja[]) {
  const porMoneda = new Map<number, TotalMoneda>();
  const porCaja = new Map<number, ResumenCaja>();

  for (const c of cajas) {
    porCaja.set(c.id, { caja: c, valorCop: 0, monedasConSaldo: 0 });
  }

  let patrimonioCop = 0;
  let patrimonioValuado = true;

  for (const s of saldos) {
    if (s.saldo === 0) continue;

    const existing = porMoneda.get(s.moneda_id);
    const valuado = s.costo_promedio > 0 || s.monedas.es_base;
    const aporteCop = valuado
      ? s.saldo * (s.monedas.es_base ? 1 : s.costo_promedio)
      : 0;

    if (existing) {
      existing.total += s.saldo;
      if (existing.valorCop !== null) {
        if (valuado) existing.valorCop += aporteCop;
        else existing.valorCop = null;
      }
    } else {
      porMoneda.set(s.moneda_id, {
        moneda: s.monedas,
        total: s.saldo,
        valorCop: valuado ? aporteCop : null,
      });
    }

    const cajaResumen = porCaja.get(s.caja_id);
    if (cajaResumen) {
      cajaResumen.monedasConSaldo += 1;
      if (cajaResumen.valorCop !== null) {
        if (valuado) cajaResumen.valorCop += aporteCop;
        else cajaResumen.valorCop = null;
      }
    }

    if (valuado) patrimonioCop += aporteCop;
    else patrimonioValuado = false;
  }

  return {
    porMoneda: Array.from(porMoneda.values()).sort((a, b) =>
      a.moneda.es_base ? -1 : b.moneda.es_base ? 1 : a.moneda.codigo.localeCompare(b.moneda.codigo),
    ),
    porCaja: Array.from(porCaja.values()).sort((a, b) =>
      a.caja.nombre.localeCompare(b.caja.nombre),
    ),
    patrimonioCop,
    patrimonioValuado,
  };
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [saldos, setSaldos] = useState<SaldoRow[] | null>(null);
  const [cajas, setCajas] = useState<Caja[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    setError(null);

    const [perfilRes, saldosRes, cajasRes] = await Promise.all([
      supabase.from('perfiles').select('*').eq('id', user.id).single(),
      supabase.from('saldos_caja').select('*, monedas(*)'),
      supabase.from('cajas').select('*').eq('activo', true),
    ]);

    if (perfilRes.data) setPerfil(perfilRes.data as Perfil);
    if (saldosRes.error) setError(saldosRes.error.message);
    else setSaldos((saldosRes.data ?? []) as unknown as SaldoRow[]);
    if (cajasRes.data) setCajas(cajasRes.data as Caja[]);
  }, [user]);

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

  const loading = !saldos || !cajas;
  const resumen = !loading ? calcularResumen(saldos, cajas) : null;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="title">Inicio</ThemedText>
            <ThemedText style={styles.subtle}>
              Hola, {perfil?.nombre ?? user?.email ?? ''}
              {perfil?.rol ? ` · ${perfil.rol}` : ''}
            </ThemedText>
          </View>
          <Pressable style={styles.logoutBtn} onPress={signOut}>
            <ThemedText style={styles.logoutText}>Salir</ThemedText>
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {loading && !error && <ActivityIndicator size="large" style={styles.loader} />}

        {resumen && (
          <>
            <View style={styles.heroCard}>
              <ThemedText style={styles.heroLabel}>Patrimonio estimado (COP)</ThemedText>
              <ThemedText style={styles.heroAmount}>
                ${formatMonto(resumen.patrimonioCop, 0)}
              </ThemedText>
              <ThemedText style={styles.heroMeta}>
                {resumen.porMoneda.length} moneda{resumen.porMoneda.length === 1 ? '' : 's'} ·{' '}
                {resumen.porCaja.length} caja{resumen.porCaja.length === 1 ? '' : 's'}
                {!resumen.patrimonioValuado && ' · valoración parcial'}
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Por moneda</ThemedText>
              {resumen.porMoneda.length === 0 && (
                <ThemedText style={styles.empty}>Sin saldos registrados todavía.</ThemedText>
              )}
              {resumen.porMoneda.map((tm) => (
                <View key={tm.moneda.id} style={styles.row}>
                  <View style={styles.rowMain}>
                    <ThemedText type="defaultSemiBold">
                      {tm.moneda.codigo} — {tm.moneda.nombre}
                    </ThemedText>
                    <ThemedText style={styles.subtle}>
                      {tm.moneda.simbolo} {formatMonto(tm.total, tm.moneda.decimales)}
                    </ThemedText>
                  </View>
                  <View style={styles.rowRight}>
                    {tm.valorCop !== null ? (
                      <ThemedText style={styles.cop}>
                        ≈ ${formatMonto(tm.valorCop, 0)} COP
                      </ThemedText>
                    ) : (
                      <ThemedText style={styles.warn}>sin valoración</ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Cajas</ThemedText>
              {resumen.porCaja.length === 0 && (
                <ThemedText style={styles.empty}>
                  No has registrado cajas todavía.
                </ThemedText>
              )}
              {resumen.porCaja.map((rc) => (
                <View key={rc.caja.id} style={styles.row}>
                  <View style={styles.rowMain}>
                    <ThemedText type="defaultSemiBold">{rc.caja.nombre}</ThemedText>
                    <ThemedText style={styles.subtle}>
                      {tipoLabel(rc.caja.tipo)}
                      {rc.monedasConSaldo > 0 &&
                        ` · ${rc.monedasConSaldo} moneda${rc.monedasConSaldo === 1 ? '' : 's'}`}
                    </ThemedText>
                  </View>
                  <View style={styles.rowRight}>
                    {rc.monedasConSaldo === 0 ? (
                      <ThemedText style={styles.subtle}>sin saldo</ThemedText>
                    ) : rc.valorCop !== null ? (
                      <ThemedText style={styles.cop}>
                        ≈ ${formatMonto(rc.valorCop, 0)} COP
                      </ThemedText>
                    ) : (
                      <ThemedText style={styles.warn}>sin valoración</ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
  subtle: { opacity: 0.65, fontSize: 14 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { fontSize: 13 },
  heroCard: {
    backgroundColor: '#0a7ea4',
    borderRadius: 16,
    padding: 24,
    gap: 4,
  },
  heroLabel: { color: '#cfe7f0', fontSize: 13 },
  heroAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
  },
  heroMeta: { color: '#cfe7f0', fontSize: 12, marginTop: 6 },
  section: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
    gap: 12,
  },
  rowMain: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end' },
  cop: { fontWeight: '600' },
  warn: { color: '#b07e00', fontSize: 12 },
  empty: { paddingVertical: 12, opacity: 0.6 },
  loader: { marginTop: 32 },
  errorBox: {
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
  },
  errorText: { color: '#b00020' },
});
