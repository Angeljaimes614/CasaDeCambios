import { Stack } from 'expo-router';

export default function CajasLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Cajas', headerShown: false }} />
      <Stack.Screen name="nueva" options={{ title: 'Nueva caja', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Editar caja' }} />
    </Stack>
  );
}
