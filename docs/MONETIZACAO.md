# Monetização — Free × PRO (Nails App)

Documento de decisão + guia de ativação. O **scaffolding já está no código**
(RevenueCat), desligado por padrão — o app funciona 100% liberado até você
preencher as chaves e criar os produtos nas lojas.

## 1. Modelo escolhido

- **Assinatura** (recorrente), com **plano mensal** e **plano anual com desconto**.
- **Teste grátis** recomendado (ex.: 7 dias) — configurável no RevenueCat/loja.
- Cobrança **obrigatoriamente** via IAP da loja (Google Play Billing / StoreKit).
  Não use Pix/cartão externo para desbloquear features digitais — reprova na revisão.

## 2. Divisão Free × PRO

### Plano gratuito (autônoma)
- Agenda, agendamentos, lembretes.
- Serviços (com preço).
- **Clientes: até 50** (`FREE_CLIENT_LIMIT`).
- 1 profissional (implícito — a tela de profissionais é PRO).

### Plano PRO (sem limites)
- **Vários profissionais** (equipe) — `professionals`
- **Relatórios / dashboard** de faturamento — `reports`
- **Backup e sincronização na nuvem** — `cloud_sync`
- **Exportar dados** (LGPD/portabilidade) — `export`
- **Pacotes de serviços** — `packages`
- **Agendamentos recorrentes** — `recurrence`
- **Clientes ilimitados**

As features acima estão listadas em [`src/monetization/config.ts`](../src/monetization/config.ts)
(`ProFeature` / `PRO_FEATURE_LABELS`).

## 3. Como funciona no código

- **Seam agnóstica:** [`src/monetization/`](../src/monetization/) define o contrato
  `PurchasesAdapter`. O adaptador padrão é "não configurado".
- **RevenueCat:** [`revenuecatAdapter.ts`](../src/monetization/revenuecatAdapter.ts) usa
  `react-native-purchases`; só é registrado se houver **chave** (ver §4).
- **Direitos:** [`EntitlementContext`](../src/context/EntitlementContext.tsx) expõe `isPro`.
  Regra central: **se a monetização estiver desligada, `isPro = true`** (nada trava).
  Quando ligada, `isPro` reflete a assinatura real.
- **Paywall:** [`PaywallScreen`](../src/screens/PaywallScreen.tsx) mostra benefícios e
  planos (mensal/anual) vindos do RevenueCat.
- **Gating aplicado em:** Home (Profissionais, Relatórios, Pacotes →
  [`HomeScreen`](../src/screens/HomeScreen.tsx)); limite de 50 clientes
  ([`CreateClientScreen`](../src/screens/CreateClientScreen.tsx)); exportar
  ([`SecurityScreen`](../src/screens/SecurityScreen.tsx)); recorrência
  ([`CreateScheduleScreen`](../src/screens/CreateScheduleScreen.tsx)). Locked → abre o paywall.

> Enquanto `REVENUECAT_API_KEY_*` estiverem vazias, **nada disso trava** — ideal para
> testar/publicar antes de ativar a cobrança.

## 4. Como LIGAR a monetização

### Passo 1 — RevenueCat
1. Crie conta em revenuecat.com e um **Project**.
2. Adicione os apps **Android** e **iOS**; copie as **Public API Keys** de cada um.
3. Crie um **Entitlement** com identificador **`pro`** (igual a `PRO_ENTITLEMENT_ID`).
4. Crie uma **Offering** com dois **Packages**: **Monthly** e **Annual**, cada um
   vinculado ao produto de assinatura da respectiva loja.
5. Preencha as chaves em [`src/monetization/config.ts`](../src/monetization/config.ts):
   ```ts
   export const REVENUECAT_API_KEY_ANDROID = 'goog_XXXX';
   export const REVENUECAT_API_KEY_IOS = 'appl_XXXX';
   ```
   (Ideal: mover para variáveis de ambiente com `expo-constants`, não commitar chave.)

### Passo 2 — Google Play
1. Play Console (taxa única US$ 25).
2. **Monetize → Products → Subscriptions**: criar a assinatura `pro` com base plans
   **mensal** e **anual** (anual com desconto), preços e teste grátis.
3. Vincular o RevenueCat ao Play (service account com permissão de billing).
4. Build de produção: `eas build -p android --profile production` (AAB) → teste interno → produção.

### Passo 3 — App Store
1. Apple Developer Program (US$ 99/ano; precisa de Mac).
2. App Store Connect → **In-App Purchases → Auto-Renewable Subscriptions**: um
   *Subscription Group* com os planos **mensal** e **anual**, preços e trial.
3. Vincular o RevenueCat ao App Store (In-App Purchase Key).
4. Build: `eas build -p ios --profile production`.
5. A revisão da Apple exige: **Restaurar compras** (já há no paywall), preço/termos
   claros, link para **Política de Privacidade** (já existe a tela — publique também numa
   URL pública) e **EULA**.

### Passo 4 — Publicar a política de privacidade numa URL
Ambas as lojas exigem uma **URL pública** de política de privacidade. O texto já está
em [`PrivacyPolicyScreen`](../src/screens/PrivacyPolicyScreen.tsx) — replique-o numa página
(GitHub Pages, Notion público, site simples) e informe a URL nas fichas das lojas.

## 5. Checklist rápido de ativação
- [ ] Entitlement `pro` + Offering (monthly/annual) no RevenueCat
- [ ] Assinaturas criadas no Google Play e na App Store
- [ ] Chaves preenchidas em `config.ts`
- [ ] Política de privacidade publicada (URL)
- [ ] Build de produção + teste interno em cada loja
- [ ] Testar: comprar, restaurar, e conferir que as features PRO destravam
