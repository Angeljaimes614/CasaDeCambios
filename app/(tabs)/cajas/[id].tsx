import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CajaForm } from '@/components/caja-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Caja } from '@/lib/types';

export default function EditarCajaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cajaId = Number(id);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!cajaId) {
      setLoadError('ID inválido.');
      return;
    }
    supabase
      .from('cajas')
      .select('*')
      .eq('id', cajaId)
      .single()
      .then(({ data, error }) => {
        if (error) setLoadError(error.message);
        else setCaja(data as Caja);
      });
  }, [cajaId]);

  if (loadError) {
    return (
      <ThemedView style={styles.center}>
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{loadError}</ThemedText>
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
    <CajaForm
      initial={caja}
      submitLabel="Guardar cambios"
      onSubmit={async (values) => {
        const { error } = await supabase
          .from('cajas')
          .update({
            nombre: values.nombre,
            tipo: values.tipo,
            notas: values.notas || null,
            activo: values.activo,
          })
          .eq('id', cajaId);
        if (error) return { error: error.message };
        router.back();
        return { error: null };
      }}
      onDelete={async () => {
        const { error } = await supabase.from('cajas').delete().eq('id', cajaId);
        if (error) return { error: error.message };
        router.back();
        return { error: null };
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
