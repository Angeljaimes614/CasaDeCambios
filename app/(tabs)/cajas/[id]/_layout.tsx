import { Stack } from 'expo-router';

export default function CajaDetalleLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Detalle' }} />
      <Stack.Screen name="editar" options={{ title: 'Editar caja' }} />
      <Stack.Screen
        name="ajustar"
        options={{ title: 'Ajustar saldo', presentation: 'modal' }}
      />
    </Stack>
  );
}
