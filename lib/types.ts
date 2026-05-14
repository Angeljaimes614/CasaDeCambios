export type CajaTipo = 'efectivo' | 'banco' | 'billetera_digital' | 'exchange';

export type Caja = {
  id: number;
  nombre: string;
  tipo: CajaTipo;
  notas: string | null;
  activo: boolean;
  creado_en: string;
};

export type Moneda = {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  decimales: number;
  es_base: boolean;
};

export type Perfil = {
  id: string;
  nombre: string;
  rol: 'admin' | 'cajero';
  activo: boolean;
};

export const CAJA_TIPOS: { value: CajaTipo; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco', label: 'Cuenta bancaria' },
  { value: 'billetera_digital', label: 'Billetera digital' },
  { value: 'exchange', label: 'Exchange / cripto' },
];
