import { useRouter } from 'expo-router';

import { CajaForm } from '@/components/caja-form';
import { supabase } from '@/lib/supabase';

export default function NuevaCajaScreen() {
  const router = useRouter();

  return (
    <CajaForm
      submitLabel="Crear caja"
      onSubmit={async (values) => {
        const { error } = await supabase.from('cajas').insert({
          nombre: values.nombre,
          tipo: values.tipo,
          notas: values.notas || null,
          activo: values.activo,
        });
        if (error) return { error: error.message };
        router.back();
        return { error: null };
      }}
    />
  );
}
