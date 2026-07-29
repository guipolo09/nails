# Plano Técnico — Nails App → Produto Comercial

> Documento de engenharia para evoluir o app de agendamento de uso local para um
> produto comercializável, seguro e escalável.
> Baseado na avaliação de segurança e usabilidade do código atual.

---

## 1. Visão geral e princípio arquitetural

O app hoje é **100% local, offline, sem autenticação e com persistência dividida**
entre SQLite (clientes) e AsyncStorage (o resto). O objetivo é chegar a um produto
**multi-tenant, com nuvem, seguro e conforme LGPD**, sem quebrar a experiência offline.

**Princípio guia: _local-first / offline-first_.** O SQLite local continua sendo a
fonte de verdade da UI (leitura/escrita instantânea, sem tela de carregando), e a
nuvem é uma camada de **sincronização e backup** por cima. Isso preserva o que já
funciona bem e evita reescrever a UI.

### Sequenciamento (dependência técnica × prioridade de negócio)

A tabela de prioridades da avaliação foi reordenada por **dependência técnica**: a
migração para SQLite (item 3 do negócio) vem primeiro porque destrava todo o resto
com baixo custo. A justificativa de cada mudança de ordem está em cada fase.

| Fase | Entrega | Prioridade de negócio | Depende de |
|------|---------|----------------------|------------|
| **0** ✅ | Fundação: SQLite unificado + testes + CI **(CONCLUÍDA)** | 3 | — |
| **1** ✅ | Segurança & LGPD (bloqueio, cripto, consentimento) **(CONCLUÍDA)** | 1 | 0 |
| **2** ✅ | Usabilidade core (agenda estendida, editar/remarcar, visão de dia) **(CONCLUÍDA)** | 4 | 0 |
| **3** ✅ | Backend + sync + backup + contas **(SCAFFOLD — pronto para conectar provedor)** | 2 | 0, 1 |
| **4** ✅ | Camada comercial (preço, faturamento, relatórios) **(CONCLUÍDA)** | 5 | 0, 3 |
| **5** ✅ | Multi-profissional / multi-salão + horários por dia **(CONCLUÍDA)** | 6 | 3, 4 |

Estimativas em **semanas-desenvolvedor (SD)** para 1 dev pleno; ajuste conforme o time.

---

## 2. Fase 0 — Fundação: unificar em SQLite (~2–3 SD) — ✅ CONCLUÍDA

> **Status:** entregue. Esquema SQLite unificado (`services`, `appointments`, `packages`,
> `package_slots`, `settings`) com FKs e índices; repositórios reescritos mantendo a API
> assíncrona; condição de corrida eliminada via transação atômica na criação de
> agendamento; migração idempotente AsyncStorage→SQLite ([migrations.ts](../src/database/migrations.ts))
> executada antes dos provedores no [App.tsx](../App.tsx); 17 testes unitários passando +
> workflow de CI ([ci.yml](../.github/workflows/ci.yml)). `tsc` limpo.
> **Pendência de validação:** smoke test em device/emulador (execução nativa do SQLite).

**Por que primeiro:** resolve de uma só vez os problemas de desempenho (re-serialização
do array inteiro), condição de corrida na checagem de conflito e dados órfãos entre os
dois bancos. Tudo depois assenta sobre esta base.

### 2.1 Esquema de banco

Estender [`src/database/database.ts`](../src/database/database.ts) com o restante das tabelas
(hoje só existe `clients`):

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS services (
  id            TEXT PRIMARY KEY NOT NULL,
  name          TEXT NOT NULL,
  durationMinutes INTEGER NOT NULL,
  priceCents    INTEGER,               -- preparado para Fase 4
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id            TEXT PRIMARY KEY NOT NULL,
  clientId      TEXT REFERENCES clients(id) ON DELETE SET NULL,
  clientName    TEXT NOT NULL,          -- desnormalizado p/ histórico
  serviceId     TEXT REFERENCES services(id) ON DELETE SET NULL,
  serviceName   TEXT NOT NULL,
  date          TEXT NOT NULL,          -- YYYY-MM-DD
  startTime     TEXT NOT NULL,          -- HH:mm
  endTime       TEXT NOT NULL,
  calendarEventId TEXT,
  attendanceStatus TEXT,                -- 'confirmed' | 'missed' | NULL
  recurrenceGroupId TEXT,
  packageId     TEXT REFERENCES packages(id) ON DELETE SET NULL,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appt_client ON appointments(clientId);
CREATE INDEX IF NOT EXISTS idx_appt_group ON appointments(recurrenceGroupId);

CREATE TABLE IF NOT EXISTS packages (
  id          TEXT PRIMARY KEY NOT NULL,
  clientId    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  clientName  TEXT NOT NULL,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS package_slots (
  id          TEXT PRIMARY KEY NOT NULL,
  packageId   TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  serviceId   TEXT,
  serviceName TEXT NOT NULL,
  durationMinutes INTEGER NOT NULL,
  date        TEXT,
  startTime   TEXT,
  endTime     TEXT,
  appointmentId TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  orderIndex  INTEGER NOT NULL DEFAULT 0
);

-- settings continua como chave-valor único; pode ir para tabela ou permanecer
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL                    -- JSON serializado
);
```

### 2.2 Camada de dados

- Reescrever [`serviceRepository.ts`](../src/services/serviceRepository.ts),
  [`appointmentRepository.ts`](../src/services/appointmentRepository.ts) e
  [`packageRepository.ts`](../src/services/packageRepository.ts) usando `db.getAllSync` /
  `db.runSync` no mesmo estilo já usado em [`clientRepository.ts`](../src/services/clientRepository.ts).
- **Manter as mesmas assinaturas** (`getAll`, `create`, etc.) para não tocar nos hooks/telas.
  Os métodos hoje são `async` (AsyncStorage); pode-se mantê-los `async` retornando valores
  síncronos (`Promise.resolve`) para minimizar mudanças nos hooks, ou migrar hooks para
  chamadas síncronas como já é feito em [`useClients.ts`](../src/hooks/useClients.ts).

### 2.3 Corrigir a condição de corrida na checagem de conflito

Hoje `hasConflict` lê e depois `create` grava — janela de corrida. Substituir por uma
**transação única** que valida e insere atomicamente:

```ts
create(data: CreateAppointmentDTO): Appointment {
  return db.withTransactionSync(() => {
    const conflict = db.getFirstSync(
      `SELECT 1 FROM appointments
       WHERE date = ? AND startTime < ? AND endTime > ? LIMIT 1`,
      [data.date, endTime, data.startTime]   // sobreposição: existente.start < novo.end AND existente.end > novo.start
    );
    if (conflict) throw new Error('Conflito de horário');
    db.runSync(`INSERT INTO appointments (...) VALUES (...)`, [...]);
    return appointment;
  });
}
```

### 2.4 Migração de dados (usuários existentes)

Script único idempotente em `src/database/migrations.ts`, executado na inicialização:
1. Ler `@nails/services`, `@nails/appointments`, `@nails/packages`, `@nails/settings` do AsyncStorage.
2. Se existirem, inserir nas tabelas novas dentro de uma transação.
3. Gravar flag `settings['migratedToSqliteV1'] = true` e **não** apagar o AsyncStorage
   imediatamente (manter 1–2 versões como rede de segurança; limpar depois).

### 2.5 Qualidade

- Introduzir **Jest + React Native Testing Library**.
- Testes unitários para: sobreposição de horários (`checkTimeConflict`), `calculateEndTime`,
  geração de slots, e os repositórios (conflito, órfãos ao excluir cliente).
- **GitHub Actions**: `tsc --noEmit` + `jest` + `eslint` em cada push.

**Critérios de aceite:** app funciona igual ao anterior; excluir cliente não deixa
agendamento órfão inconsistente; dois agendamentos simultâneos no mesmo horário são
impossíveis; suíte de testes verde.

---

## 3. Fase 1 — Segurança & LGPD (~2–3 SD) — ✅ CONCLUÍDA

> **Status:** entregue. Bloqueio por PIN (hash SHA-256 + salt no SecureStore) e biometria
> ([authService.ts](../src/services/authService.ts), [AuthContext.tsx](../src/context/AuthContext.tsx),
> [LockScreen.tsx](../src/screens/LockScreen.tsx)); re-bloqueio ao voltar do segundo plano;
> **criptografia total do banco** com SQLCipher via op-sqlite, chave de 256 bits no SecureStore
> ([database.ts](../src/database/database.ts), [encryption.ts](../src/database/encryption.ts)),
> com migração automática do banco legado em texto puro; consentimento LGPD
> ([ConsentScreen.tsx](../src/screens/ConsentScreen.tsx), [consentService.ts](../src/services/consentService.ts)),
> política de privacidade ([PrivacyPolicyScreen.tsx](../src/screens/PrivacyPolicyScreen.tsx)),
> exportação de dados e exclusão total de cliente ([dataPrivacyService.ts](../src/services/dataPrivacyService.ts));
> tela de Segurança e Privacidade em Ajustes. 19 testes passando, `tsc` limpo.
>
> **⚠️ Mudança de workflow (importante):** a criptografia SQLCipher usa um módulo nativo
> (`@op-engineering/op-sqlite` com o flag `"op-sqlite": { "sqlcipher": true }` no package.json).
> **O app não roda mais no Expo Go nem na Web** — é preciso um **dev build**:
> ```bash
> npx expo install expo-dev-client
> npx expo prebuild
> npx expo run:android   # ou run:ios / eas build --profile development
> ```
> **Pendência de validação:** todo o comportamento nativo (abertura do banco criptografado,
> migração texto-puro→cifrado, PIN, biometria, exportar/compartilhar arquivo) precisa de
> smoke test em device/emulador com dev build.

**Por que aqui:** é a prioridade nº 1 de negócio e **pré-requisito legal** para publicar.
Feito antes do backend porque protege o dado onde ele já existe (no dispositivo).

### 3.1 Bloqueio de acesso
- `expo-local-authentication` (biometria) + fallback de **PIN** guardado com hash
  (`expo-crypto`, nunca em texto puro) no `expo-secure-store`.
- Gate na abertura e ao retornar do background (usar `AppState`). Configurável em Ajustes:
  ativar/desativar, trocar PIN, tempo para re-bloquear.

### 3.2 Criptografia em repouso
- Migrar o SQLite para **SQLCipher** via `op-sqlite` (suporta chave de criptografia) ou
  manter `expo-sqlite` e cifrar os campos sensíveis (`phone`, `notes`) em nível de aplicação.
  Recomendado: SQLCipher (transparente, cobre tudo).
- Chave de banco gerada no 1º uso e guardada no `expo-secure-store` (Keychain/Keystore).
- Na **Web**, dados ficam em IndexedDB/localStorage — deixar explícito na política que a
  versão web não deve guardar PII sensível, ou desabilitar campos sensíveis no web.

### 3.3 Conformidade LGPD
- **Tela de consentimento** no onboarding + **Política de Privacidade** (documento) acessível em Ajustes.
- **Direito de acesso/portabilidade:** função "Exportar dados da cliente" (JSON/CSV) e
  "Exportar todos os dados".
- **Direito ao esquecimento:** "Excluir cliente e todo o histórico" (cascata real, agora
  possível com FKs da Fase 0).
- Definir **papel do titular**: a dona do salão é a controladora; o app (se houver nuvem)
  é operador — isso muda os termos.

**Critérios de aceite:** app abre bloqueado; banco ilegível fora do app; é possível
exportar e apagar completamente os dados de uma cliente.

---

## 4. Fase 2 — Usabilidade core (~2–3 SD) — ✅ CONCLUÍDA

> **Status:** entregue.
> - **Agendar além de 7 dias:** botão "Escolher outra data" com date picker nativo em
>   [CreateScheduleScreen](../src/screens/CreateScheduleScreen.tsx) e na remarcação.
> - **Editar/remarcar:** nova [RescheduleScreen](../src/screens/RescheduleScreen.tsx) +
>   `reschedule()` no repositório (recalcula término, valida conflito excluindo o próprio,
>   atualiza evento do calendário e reagenda a notificação) e `rescheduleAppointment()` no hook.
> - **Cancelar série recorrente:** diálogo "Somente este / Toda a série" na
>   [ScheduleScreen](../src/screens/ScheduleScreen.tsx) usando `recurrenceGroupId` +
>   `deleteSeries()` no hook.
> - **Feedback de recorrência:** as datas que falham (conflito/feriado) agora são listadas
>   ao usuário, em vez do silêncio anterior.
> - **Visão de dia:** já existente (navegador de semana + células de dia + lista por dia);
>   agora com ações de editar por card.
> - Helpers puros extraídos e testados (`getRecurrenceDates`, `minutesBetween`); 23 testes passando, `tsc` limpo.
> **Pendência de validação:** smoke test no dev build (date picker nativo, remarcação com
> atualização de calendário/notificação, cancelamento de série).

Independe do backend; entrega valor imediato e destrava a percepção de "agenda de verdade".

### 4.1 Agendar além de 7 dias
- Substituir a lista fixa de 7 dias em
  [`CreateScheduleScreen.tsx`](../src/screens/CreateScheduleScreen.tsx) por um seletor de
  data real (`@react-native-community/datetimepicker`, já instalado) ou um calendário
  (`react-native-calendars`). Manter os atalhos "Hoje/Amanhã".

### 4.2 Editar / remarcar agendamento
- Adicionar `update` completo (data/hora/serviço) no repositório e hook, revalidando conflito.
- Ao remarcar: atualizar o evento de calendário (deletar+recriar ou `updateEventAsync`) e
  reagendar a notificação.
- Fluxo de UI reutilizando a tela de criação em modo edição.

### 4.3 Cancelar série recorrente
- Usar `recurrenceGroupId` (já existe) para oferecer "cancelar só este" × "cancelar toda a série".

### 4.4 Feedback de recorrência
- No loop de criação, coletar as datas que falharam (conflito/feriado) e **mostrar quais**,
  em vez do silêncio atual. Validar feriado antes de tentar criar.

### 4.5 Visão de dia / agenda
- Tela de agenda com **grade do dia** (linha do tempo por horário) além da lista atual.
  `react-native-calendars` (agenda view) cobre bem.

**Critérios de aceite:** agendar qualquer data futura; remarcar sem recriar do zero;
usuária vê exatamente quais recorrências não entraram.

---

## 5. Fase 3 — Backend, sincronização e contas (~5–8 SD) — ✅ SCAFFOLD CONCLUÍDO

> **Status:** entregue a **arquitetura completa de sincronização offline-first,
> agnóstica de provedor** (decisão: montar o cliente + esquema sem amarrar a um
> provedor agora; login por **telefone/OTP**).
> - **Seam de adaptadores:** [`src/sync/types.ts`](../src/sync/types.ts) define
>   `RemoteAdapter`/`AuthAdapter`; [`adapters.ts`](../src/sync/adapters.ts) registra
>   implementações (padrão = "não configurado", app 100% offline).
> - **Outbox + cursor:** [`outbox.ts`](../src/sync/outbox.ts) enfileira mudanças locais
>   (só quando a sync está ativada, evitando bloat). Wired em clients/services/appointments
>   (calendarEventId é device-local e fica de fora).
> - **Motor de sync:** [`syncService.ts`](../src/sync/syncService.ts) — push/pull, aplicação
>   remota com **Last-Write-Wins** ([`mergeLWW.ts`](../src/sync/mergeLWW.ts), puro e testado),
>   ordenação por FK, e `enableSyncAndSeed()` para o primeiro envio.
> - **Contas:** [`AccountContext`](../src/context/AccountContext.tsx) +
>   [`AccountScreen`](../src/screens/AccountScreen.tsx) (login por telefone/OTP + status/sync),
>   acessível por Ajustes → "Conta e Sincronização".
> - **Backend:** esquema Postgres multi-tenant + **RLS** e **template de adaptador Supabase**
>   prontos em [`docs/backend/`](./backend/README.md).
> - 29 testes passando, `tsc` limpo.
>
> **O que falta para ativar (com o usuário):** criar o projeto Supabase, rodar o `schema.sql`,
> habilitar SMS, implementar os 2 adaptadores (template pronto) e registrá-los — ver
> [docs/backend/README.md](./backend/README.md). **Pendências conscientes:** sync automático
> por intervalo/reconexão (hoje é manual + no login) e sync de configurações/pacotes-slots
> (core já coberto). Validação de isolamento multi-tenant (RLS) obrigatória antes de produção.

**Por que só agora:** é o item de maior custo e risco; só compensa depois que a base local
está sólida (Fase 0) e segura (Fase 1). É o que habilita **backup e continuidade do negócio**.

### 5.1 Stack recomendada
- **Supabase** (Postgres gerenciado + Auth + Row Level Security + Realtime) — encurta muito
  o caminho para multi-tenant e já resolve autenticação e regras de acesso por linha.
  Alternativa: Firebase, ou API própria (Node/Nest + Postgres) se quiser controle total.

### 5.2 Modelo multi-tenant
- Toda tabela ganha `ownerId` (ou `salonId`). **RLS** garante que cada conta só enxerga os
  próprios dados — pilar de segurança do multi-tenant.
- Auth por e-mail/OTP ou telefone (mercado BR responde bem a login por telefone).

### 5.3 Estratégia de sincronização (offline-first)
- **Fonte de verdade da UI = SQLite local** (mantém velocidade e uso offline).
- Sincronizador bidirecional:
  - Cada registro ganha `updatedAt` (já existe) + `deletedAt` (soft delete) + `syncStatus`.
  - **Push:** registros com mudanças locais sobem; **pull:** baixa mudanças desde o último cursor.
  - **Resolução de conflito:** _last-write-wins_ por `updatedAt` no MVP; evoluir se necessário.
- Fila de operações offline; retry com backoff quando volta a conexão.
- Considerar libs como **WatermelonDB** ou **PowerSync/Legend-State** se o esforço manual
  de sync ficar alto — decisão a validar num spike de 2–3 dias.

### 5.4 Backup
- Com sync, o backup é consequência (dado replicado na nuvem). Adicionar export manual
  (JSON) como rede extra.

**Critérios de aceite:** trocar de aparelho e recuperar todos os dados via login; usar o
app sem internet e sincronizar ao reconectar; conta A nunca vê dados da conta B (testar RLS).

### ⚠️ Impacto em segurança/LGPD
Ao subir dados para a nuvem, o produto passa a ser **operador** de dados pessoais:
criptografia em trânsito (HTTPS/TLS — padrão no Supabase), em repouso no Postgres, DPA com
o provedor, e a política de privacidade da Fase 1 precisa ser atualizada para refletir a nuvem.

---

## 6. Fase 4 — Camada comercial (~2–4 SD) — ✅ CONCLUÍDA

> **Status:** entregue.
> - **Preço no serviço:** campo `priceCents` (centavos inteiros) no cadastro/edição
>   ([CreateServiceScreen](../src/screens/CreateServiceScreen.tsx)) e exibido no
>   [ServiceCard](../src/components/ServiceCard.tsx). Helpers `formatCurrency`/`parsePriceToCents`.
> - **Faturamento por agendamento:** snapshot de `priceCents` no agendamento (estável se o
>   serviço mudar depois) + `paymentStatus` (pago/pendente) com toggle no
>   [AppointmentCard](../src/components/AppointmentCard.tsx). Colunas adicionadas via
>   `ensureColumn` (migração idempotente de esquema) em [database.ts](../src/database/database.ts).
> - **Dashboard:** [DashboardScreen](../src/screens/DashboardScreen.tsx) com faturamento
>   (total/recebido/a receber), serviços mais vendidos (barras), taxa de faltas e ranking de
>   clientes, com seletor de período (mês / 30 dias / tudo). Sem dependência de biblioteca de
>   gráficos (barras em View).
> - Agregações puras e testadas em [reports.ts](../src/utils/reports.ts); 34 testes passando, `tsc` limpo.
> - Sincronização e esquema Postgres atualizados com as novas colunas.
> **Pendência de validação:** smoke test no dev build (cadastro de preço, marcar pago,
> números do dashboard).

Depende do backend (relatórios consolidados) mas o dado local já pode começar.

### 6.1 Preço e faturamento
- Campo `priceCents` no serviço (já previsto no esquema da Fase 0) — usar centavos inteiros,
  **nunca float**, para evitar erro de arredondamento em dinheiro.
- Preço efetivo no agendamento (pode diferir do padrão do serviço → snapshot em `appointments`).
- Marcar agendamento como pago/pendente; forma de pagamento.

### 6.2 Relatórios / dashboard
- Faturamento por período, serviços mais vendidos, taxa de faltas (`attendanceStatus` já existe),
  ranking de clientes. Gráficos com `victory-native` ou `react-native-gifted-charts`.

### 6.3 Monetização do produto (modelo de negócio do app)
- Definir plano (assinatura mensal por salão via RevenueCat, p.ex.). Decisão de produto,
  não bloqueante para as fases técnicas.

**Critérios de aceite:** cadastrar preço, registrar pagamento e ver faturamento do mês.

---

## 7. Fase 5 — Multi-profissional e horários por dia (~3–5 SD) — ✅ CONCLUÍDA

> **Status:** entregue.
> - **Profissionais:** tabela `professionals` + [professionalRepository](../src/services/professionalRepository.ts)
>   (com outbox de sync) + [useProfessionals](../src/hooks/useProfessionals.ts) +
>   [ProfessionalsScreen](../src/screens/ProfessionalsScreen.tsx) (CRUD, ativar/inativar).
> - **Agenda por profissional:** `professionalId`/`professionalName` no agendamento (colunas via
>   `ensureColumn`); seleção opcional no fluxo de criação; profissional exibido no card.
> - **Conflito por profissional:** a checagem de sobreposição agora é por profissional
>   (duas manicures podem atender no mesmo horário); agendamentos sem profissional compartilham
>   o "recurso único" padrão (`IFNULL` agrupa).
> - **Horário por dia da semana:** `weeklyHours` em `AppSettings` (migrado do horário global);
>   geração de slots respeita o dia da semana e **dias fechados (folga fixa)**;
>   [BusinessHoursScreen](../src/screens/BusinessHoursScreen.tsx) edita cada dia.
> - Sync e esquema Postgres atualizados (nova entidade + colunas). 36 testes passando, `tsc` limpo.
> **Pendência de validação:** smoke test no dev build (cadastro de profissional, conflito por
> profissional, folga fixa bloqueando o dia).

Depende do multi-tenant (Fase 3) e da camada comercial (Fase 4).

### 7.1 Profissionais
- Tabela `professionals` (pertencente ao salão). Agendamento passa a ter `professionalId`.
- Checagem de conflito passa a ser **por profissional** (duas manicures podem atender no
  mesmo horário) — ajustar a query da Fase 0 para incluir `professionalId`.
- Visão de agenda por profissional / consolidada.

### 7.2 Horário de funcionamento por dia da semana
- Substituir `businessHours { start, end }` único por configuração **por dia** (0–6), com
  possibilidade de dia fechado (folga fixa semanal, ex.: fecha 2ª-feira).
- Geração de slots (`generateTimeSlotsWithSettings`) passa a consultar o horário do dia da semana.
- Manter feriados avulsos como exceções pontuais por cima da regra semanal.

**Critérios de aceite:** cada profissional tem sua agenda; salão pode fechar em dias fixos;
horários diferentes por dia da semana.

---

## 8. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Migração AsyncStorage→SQLite corromper dados de usuários existentes | Alto | Migração idempotente + manter AsyncStorage como backup por 1–2 versões + testes |
| SQLCipher/op-sqlite quebrar build Expo (Web) | Médio | Spike de compatibilidade antes; estratégia separada para Web |
| Complexidade do sync offline estourar prazo | Alto | Spike com PowerSync/WatermelonDB antes de decidir manual; começar com LWW simples |
| RLS mal configurada vazar dados entre contas | Crítico | Testes automatizados de isolamento por tenant antes do go-live |
| LGPD incompleta na hora de vender | Bloqueante | Fase 1 entrega o mínimo legal antes de qualquer distribuição paga |

---

## 9. Resumo do caminho crítico

```
Fase 0 (SQLite) ──┬── Fase 1 (Segurança/LGPD) ──┐
                  │                              ├── Fase 3 (Backend/Sync) ── Fase 4 (Comercial) ── Fase 5 (Multi-prof)
                  └── Fase 2 (Usabilidade) ──────┘
```

- **Fases 0–2** entregam um app local sólido, seguro e vendável para autônomas (MVP comercial mínimo).
- **Fases 3–5** transformam em produto SaaS multi-salão escalável.

Esforço total estimado: **~16–26 SD** (~4 a 6 meses para 1 dev; menos com time).

---

## 10. Próximo passo sugerido

Começar pela **Fase 0**, que é barata e destrava tudo. Posso, quando você autorizar,
implementar a extensão do esquema SQLite e a reescrita dos repositórios mantendo as
assinaturas atuais, com a migração de dados e os primeiros testes.
