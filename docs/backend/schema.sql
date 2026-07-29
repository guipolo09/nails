-- ============================================================
-- ESQUEMA POSTGRES + RLS (multi-tenant) — Nails App / Fase 3
-- Compatível com Supabase (usa auth.uid()).
--
-- Estratégia:
--  * Cada linha pertence a um dono (ownerId = usuário autenticado).
--  * Row Level Security garante que cada conta só enxerga os próprios dados.
--  * Colunas em camelCase (entre aspas) espelham EXATAMENTE as colunas locais
--    do SQLite, para o adaptador cliente mapear payloads 1:1 (só acrescenta
--    "ownerId" e lê "deletedAt"/"updatedAt").
--  * "deletedAt" (tombstone) propaga exclusões no pull.
--  * "updatedAt" é a base do Last-Write-Wins.
-- ============================================================

-- Extensão para gen_random_uuid (já habilitada no Supabase)
create extension if not exists "pgcrypto";

-- ---------- Função utilitária: exige dono = usuário logado ----------
-- (No Supabase, auth.uid() retorna o UUID do usuário autenticado.)

-- ============================ CLIENTS ============================
create table if not exists public.clients (
  "id"        text primary key,
  "ownerId"   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "name"      text not null,
  "phone"     text,
  "notes"     text,
  "tier"      text not null default 'regular',
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" timestamptz
);
create index if not exists idx_clients_owner_updated on public.clients ("ownerId", "updatedAt");

-- ============================ SERVICES ============================
create table if not exists public.services (
  "id"              text primary key,
  "ownerId"         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "name"            text not null,
  "durationMinutes" integer not null,
  "priceCents"      integer,
  "createdAt"       text not null,
  "updatedAt"       text not null,
  "deletedAt"       timestamptz
);
create index if not exists idx_services_owner_updated on public.services ("ownerId", "updatedAt");

-- ========================== PROFESSIONALS ==========================
create table if not exists public.professionals (
  "id"        text primary key,
  "ownerId"   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "name"      text not null,
  "active"    integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" timestamptz
);
create index if not exists idx_professionals_owner_updated on public.professionals ("ownerId", "updatedAt");

-- ============================ PACKAGES ============================
create table if not exists public.packages (
  "id"         text primary key,
  "ownerId"    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId"   text,
  "clientName" text not null,
  "createdAt"  text not null,
  "updatedAt"  text not null,
  "deletedAt"  timestamptz
);
create index if not exists idx_packages_owner_updated on public.packages ("ownerId", "updatedAt");

-- ========================== APPOINTMENTS ==========================
-- Obs.: calendarEventId NÃO é sincronizado (é local do aparelho).
create table if not exists public.appointments (
  "id"                text primary key,
  "ownerId"           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId"          text,
  "clientName"        text not null,
  "serviceId"         text,
  "serviceName"       text not null,
  "professionalId"    text,
  "professionalName"  text,
  "date"              text not null,
  "startTime"         text not null,
  "endTime"           text not null,
  "attendanceStatus"  text,
  "priceCents"        integer,
  "paymentStatus"     text,
  "recurrenceGroupId" text,
  "packageId"         text,
  "createdAt"         text not null,
  "updatedAt"         text not null,
  "deletedAt"         timestamptz
);
create index if not exists idx_appts_owner_updated on public.appointments ("ownerId", "updatedAt");

-- ========================= PACKAGE_SLOTS =========================
create table if not exists public.package_slots (
  "id"              text primary key,
  "ownerId"         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "packageId"       text not null,
  "serviceId"       text,
  "serviceName"     text not null,
  "durationMinutes" integer not null,
  "date"            text,
  "startTime"       text,
  "endTime"         text,
  "appointmentId"   text,
  "status"          text not null default 'pending',
  "orderIndex"      integer not null default 0,
  "updatedAt"       text,
  "deletedAt"       timestamptz
);
create index if not exists idx_slots_owner on public.package_slots ("ownerId");

-- ============================================================
-- ROW LEVEL SECURITY — cada conta só acessa os próprios dados
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['clients','services','professionals','packages','appointments','package_slots']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format($f$
      drop policy if exists "%1$s_select_own" on public.%1$I;
      create policy "%1$s_select_own" on public.%1$I
        for select using ("ownerId" = auth.uid());
    $f$, t);

    execute format($f$
      drop policy if exists "%1$s_insert_own" on public.%1$I;
      create policy "%1$s_insert_own" on public.%1$I
        for insert with check ("ownerId" = auth.uid());
    $f$, t);

    execute format($f$
      drop policy if exists "%1$s_update_own" on public.%1$I;
      create policy "%1$s_update_own" on public.%1$I
        for update using ("ownerId" = auth.uid()) with check ("ownerId" = auth.uid());
    $f$, t);

    execute format($f$
      drop policy if exists "%1$s_delete_own" on public.%1$I;
      create policy "%1$s_delete_own" on public.%1$I
        for delete using ("ownerId" = auth.uid());
    $f$, t);
  end loop;
end $$;

-- ============================================================
-- OBSERVAÇÕES
--  * O cliente faz "soft delete" enviando op='delete'; o adaptador deve
--    traduzir isso para UPDATE ... SET "deletedAt" = now() (tombstone),
--    para que o pull propague a exclusão a outros dispositivos.
--  * O pull deve retornar linhas com "updatedAt" > cursor (e tombstones).
--    Recomenda-se usar o maior "updatedAt" recebido como próximo cursor.
--  * Teste de isolamento (multi-tenant) OBRIGATÓRIO antes de produção:
--    autenticar como conta A e garantir que não lê nenhuma linha da conta B.
-- ============================================================
