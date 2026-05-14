-- ============================================================================
-- CasaDeCambios — Esquema inicial v1 (MVP monoempresa)
-- ============================================================================
-- Alcance:
--   - Una sola empresa (sin multi-tenant todavía).
--   - Monedas iniciales: COP (base), USD, EUR.
--   - Roles: admin y cajero (extendiendo auth.users de Supabase).
--   - Partida doble: cada operación genera 2+ movimientos.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- perfiles: extiende auth.users con datos del negocio
-- Se crea automáticamente al registrar un usuario (trigger abajo).
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  rol         text not null check (rol in ('admin', 'cajero')) default 'cajero',
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- monedas: catálogo de monedas manejadas
-- Solo una puede ser la moneda base (la de reportes).
-- ---------------------------------------------------------------------------
create table public.monedas (
  id          smallint primary key generated always as identity,
  codigo      text not null unique,            -- 'COP', 'USD', 'EUR'
  nombre      text not null,                   -- 'Peso Colombiano'
  simbolo     text not null,                   -- '$', 'US$', '€'
  decimales   smallint not null default 2,     -- cuántos decimales mostrar
  es_base     boolean not null default false,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create unique index monedas_una_sola_base on public.monedas (es_base) where es_base = true;

-- ---------------------------------------------------------------------------
-- cajas: billeteras o cuentas donde se guarda dinero
-- ---------------------------------------------------------------------------
create table public.cajas (
  id          bigint primary key generated always as identity,
  nombre      text not null,                   -- 'Bancolombia Empresa'
  tipo        text not null check (tipo in ('efectivo', 'banco', 'billetera_digital', 'exchange')),
  notas       text,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- saldos_caja: saldo actual de cada (caja, moneda)
-- Una caja puede tener saldo en varias monedas.
-- costo_promedio se usa para CPP (Costo Promedio Ponderado), en moneda base.
-- ---------------------------------------------------------------------------
create table public.saldos_caja (
  id              bigint primary key generated always as identity,
  caja_id         bigint   not null references public.cajas(id)   on delete restrict,
  moneda_id       smallint not null references public.monedas(id) on delete restrict,
  saldo           numeric(20, 4) not null default 0,
  costo_promedio  numeric(20, 4) not null default 0,
  actualizado_en  timestamptz not null default now(),
  unique (caja_id, moneda_id)
);

-- ---------------------------------------------------------------------------
-- operaciones: cabecera de cada movimiento de dinero
-- Tipos: compra de divisa, venta de divisa, transferencia entre cajas, ajuste.
-- ---------------------------------------------------------------------------
create table public.operaciones (
  id          bigint primary key generated always as identity,
  tipo        text not null check (tipo in ('compra', 'venta', 'transferencia', 'ajuste')),
  fecha       timestamptz not null default now(),
  usuario_id  uuid not null references public.perfiles(id),
  notas       text,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- movimientos: detalle de cada operación (partida doble)
-- Para cada operacion, la suma de monto_en_base debe dar 0 (entra = sale).
-- monto > 0: entra a la caja. monto < 0: sale.
-- tasa_a_base: cuánto vale 1 unidad de esta moneda en la moneda base (COP).
-- ---------------------------------------------------------------------------
create table public.movimientos (
  id              bigint primary key generated always as identity,
  operacion_id    bigint   not null references public.operaciones(id) on delete cascade,
  caja_id         bigint   not null references public.cajas(id)        on delete restrict,
  moneda_id       smallint not null references public.monedas(id)      on delete restrict,
  monto           numeric(20, 4) not null,
  tasa_a_base     numeric(20, 8) not null,
  monto_en_base   numeric(20, 4) generated always as (monto * tasa_a_base) stored
);

create index movimientos_operacion_idx on public.movimientos (operacion_id);
create index movimientos_caja_idx      on public.movimientos (caja_id);

-- ---------------------------------------------------------------------------
-- Trigger: crear perfil automáticamente al registrarse un usuario nuevo
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', new.email),
    'cajero'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Datos iniciales (seed)
-- ---------------------------------------------------------------------------
insert into public.monedas (codigo, nombre, simbolo, decimales, es_base) values
  ('COP', 'Peso Colombiano',         '$',   0, true),
  ('USD', 'Dólar Estadounidense',    'US$', 2, false),
  ('EUR', 'Euro',                    '€',   2, false);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- En MVP monoempresa: cualquier usuario autenticado puede leer todo;
-- solo admins pueden modificar catálogos (monedas, cajas).
-- En v2 (multi-tenant) cambiamos para filtrar por empresa_id.
-- ============================================================================

alter table public.perfiles     enable row level security;
alter table public.monedas      enable row level security;
alter table public.cajas        enable row level security;
alter table public.saldos_caja  enable row level security;
alter table public.operaciones  enable row level security;
alter table public.movimientos  enable row level security;

-- Lectura: cualquier autenticado
create policy "leer_perfiles"    on public.perfiles    for select to authenticated using (true);
create policy "leer_monedas"     on public.monedas     for select to authenticated using (true);
create policy "leer_cajas"       on public.cajas       for select to authenticated using (true);
create policy "leer_saldos"      on public.saldos_caja for select to authenticated using (true);
create policy "leer_operaciones" on public.operaciones for select to authenticated using (true);
create policy "leer_movimientos" on public.movimientos for select to authenticated using (true);

-- Actualizar propio perfil
create policy "actualiza_propio_perfil" on public.perfiles
  for update to authenticated using (id = auth.uid());

-- Admin: modifica catálogos
create policy "admin_modifica_monedas" on public.monedas for all to authenticated
  using      (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'))
  with check (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'));

create policy "admin_modifica_cajas" on public.cajas for all to authenticated
  using      (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'))
  with check (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'));

-- Operaciones: cualquier autenticado puede crear (con usuario_id = el suyo)
create policy "crear_operaciones" on public.operaciones for insert to authenticated
  with check (usuario_id = auth.uid());

create policy "crear_movimientos" on public.movimientos for insert to authenticated
  with check (true);

-- Saldos: solo admin puede modificar directamente (ajustes manuales).
-- Cajeros modificarán saldos vía operaciones (función SQL con security_definer, próximamente).
create policy "admin_modifica_saldos" on public.saldos_caja for all to authenticated
  using      (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'))
  with check (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'));
