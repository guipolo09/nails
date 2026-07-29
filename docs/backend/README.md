# Backend / Sincronização — Guia de Conexão (Fase 3)

O app já traz **toda a arquitetura de sincronização offline-first** pronta e
**agnóstica de provedor**. Enquanto nenhum provedor é conectado, o app funciona
100% local (a tela **Conta e Sincronização** mostra "não configurado").

Este guia mostra como conectar o **Supabase** (recomendado) implementando dois
adaptadores. Nenhum outro arquivo do app precisa mudar.

## Como a sincronização funciona (visão geral)

- **Fonte de verdade da UI:** SQLite local criptografado (rápido, offline).
- **Outbox:** toda mudança local é enfileirada em `sync_outbox` (só quando a
  sincronização está ativada — após login).
- **Push:** `runSync()` envia o outbox para a nuvem via `RemoteAdapter.push()`.
- **Pull:** baixa mudanças desde um cursor via `RemoteAdapter.pull()` e aplica
  localmente com **Last-Write-Wins** (`src/sync/mergeLWW.ts`).
- **Seam:** `src/sync/types.ts` define `RemoteAdapter` e `AuthAdapter`.
  Registre implementações com `registerRemoteAdapter` / `registerAuthAdapter`.

## Passo 1 — Criar o projeto Supabase

1. Crie um projeto em supabase.com.
2. No **SQL Editor**, rode o arquivo [`schema.sql`](./schema.sql) (tabelas + RLS).
3. Em **Authentication → Providers**, habilite **Phone** e configure um provedor
   de SMS (ex.: Twilio). Custo de SMS é do provedor.
4. Copie a **Project URL** e a **anon key** (Settings → API).

> ⚠️ As credenciais são suas — eu (assistente) não as insiro. Guarde-as em
> variáveis de ambiente (ex.: `app.config.ts` + `expo-constants`), não no git.

## Passo 2 — Instalar o SDK

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

## Passo 3 — Implementar os adaptadores

Crie `src/sync/supabase/index.ts` com o conteúdo abaixo (template pronto):

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type {
  RemoteAdapter, AuthAdapter, ChangeRecord, PullResult, RemoteRecord, AccountSession, SyncEntity,
} from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true },
});

const ENTITIES: SyncEntity[] = ['clients', 'services', 'professionals', 'packages', 'appointments', 'package_slots'];

export const supabaseAuthAdapter: AuthAdapter = {
  isConfigured: () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),

  async getSession() {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    return u ? { userId: u.id, phone: u.phone ?? '' } : null;
  },

  async requestOtp(phone) {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw new Error(error.message);
  },

  async verifyOtp(phone, code) {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (error || !data.user) throw new Error(error?.message ?? 'Código inválido');
    return { userId: data.user.id, phone: data.user.phone ?? phone };
  },

  async signOut() {
    await supabase.auth.signOut();
  },
};

export const supabaseRemoteAdapter: RemoteAdapter = {
  isConfigured: () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),

  async push(changes: ChangeRecord[]) {
    // Agrupa por entidade; delete vira tombstone (deletedAt = agora).
    for (const entity of ENTITIES) {
      const forEntity = changes.filter(c => c.entity === entity);
      if (!forEntity.length) continue;

      const rows = forEntity.map(c =>
        c.op === 'delete'
          ? { id: c.entityId, deletedAt: new Date().toISOString(), updatedAt: c.updatedAt }
          : { ...c.payload, id: c.entityId }
      );
      // ownerId é preenchido pelo default (auth.uid()) / RLS.
      const { error } = await supabase.from(entity).upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
  },

  async pull(since: string | null): Promise<PullResult> {
    const changes: RemoteRecord[] = [];
    let maxUpdated = since ?? '';

    for (const entity of ENTITIES) {
      let query = supabase.from(entity).select('*');
      if (since) query = query.gt('updatedAt', since);
      const { data, error } = await query;
      if (error) throw new Error(error.message);

      for (const row of data ?? []) {
        const deleted = Boolean((row as { deletedAt?: string }).deletedAt);
        changes.push({
          entity,
          entityId: String((row as { id: string }).id),
          deleted,
          payload: deleted ? null : (row as Record<string, unknown>),
          updatedAt: String((row as { updatedAt?: string }).updatedAt ?? ''),
        });
        const ru = String((row as { updatedAt?: string }).updatedAt ?? '');
        if (ru > maxUpdated) maxUpdated = ru;
      }
    }
    return { changes, cursor: maxUpdated };
  },
};
```

## Passo 4 — Registrar na inicialização

Em `App.tsx`, antes de montar os provedores (ou logo após `initDatabase()`):

```ts
import { registerRemoteAdapter, registerAuthAdapter } from './src/sync';
import { supabaseRemoteAdapter, supabaseAuthAdapter } from './src/sync/supabase';

registerRemoteAdapter(supabaseRemoteAdapter);
registerAuthAdapter(supabaseAuthAdapter);
```

Pronto. A tela **Conta e Sincronização** passará a mostrar o login por telefone;
ao entrar, `enableSyncAndSeed()` envia os dados locais para a nuvem e os ciclos de
`runSync()` mantêm tudo em dia.

## Passo 5 — Validar (obrigatório antes de produção)

- **Isolamento multi-tenant:** logar como conta A e confirmar que não lê nenhum
  dado da conta B (teste de RLS).
- **Round-trip:** criar cliente/agendamento no aparelho 1, sincronizar, e ver
  aparecer no aparelho 2 após login na mesma conta.
- **Offline:** usar o app sem internet e conferir o envio ao reconectar.
- **Exclusão:** apagar um registro e confirmar que some no outro aparelho (tombstone).

## Backup

Com a sincronização ativa, o backup é consequência (dados replicados na nuvem).
O export manual em JSON (tela Segurança e Privacidade) continua como rede extra.

## Próximos passos sugeridos (fora do MVP de sync)

- Disparar `runSync()` periodicamente e ao reconectar a rede (ex.: `NetInfo` +
  um intervalo/onForeground). Hoje o sync é manual ("Sincronizar agora") e no login.
- Sincronizar também as **configurações** (horários/feriados) — hoje ficam locais.
