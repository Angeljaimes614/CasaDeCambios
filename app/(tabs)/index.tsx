import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Moneda = {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  decimales: number;
  es_base: boolean;
};

type Perfil = {
  nombre: string;
  rol: 'admin' | 'cajero';
};

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [monedas, setMonedas] = useState<Moneda[] | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('monedas')
      .select('*')
      .order('codigo')
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setMonedas(data as Moneda[]);
      });

    supabase
      .from('perfiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setPerfil(data as Perfil);
      });
  }, [user]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="title">CasaDeCambios</ThemedText>
          <ThemedText style={styles.welcome}>
            Hola, {perfil?.nombre ?? user?.email ?? ''}
            {perfil?.rol ? ` · ${perfil.rol}` : ''}
          </ThemedText>
        </View>
        <Pressable style={styles.logoutBtn} onPress={signOut}>
          <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Monedas disponibles</ThemedText>

        {error && (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
          </View>
        )}

        {!monedas && !error && <ActivityIndicator size="large" style={styles.loader} />}

        {monedas && (
          <View style={styles.list}>
            {monedas.map((m) => (
              <View key={m.id} style={styles.row}>
                <ThemedText type="defaultSemiBold" style={styles.symbol}>
                  {m.simbolo}
                </ThemedText>
                <ThemedText>
                  {m.codigo} — {m.nombre}
                  {m.es_base ? ' (base)' : ''}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  headerText: {
    flex: 1,
    gap: 4,
  },
  welcome: {
    opacity: 0.7,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  loader: {
    marginTop: 16,
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
  },
  symbol: {
    minWidth: 36,
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
  },
  errorText: {
    color: '#b00020',
  },
});
