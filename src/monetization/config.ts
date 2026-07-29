// ============================================
// CONFIGURAÇÃO DE MONETIZAÇÃO (Free × PRO)
// Preencha as chaves do RevenueCat e crie os produtos para "ligar" a cobrança.
// Enquanto as chaves estiverem vazias, a monetização fica DESLIGADA e tudo
// permanece liberado (nada trava).
// ============================================

// Chaves públicas do RevenueCat (uma por plataforma). Deixe vazio até configurar.
// Onde obter: RevenueCat → Project → API Keys (chave "public" de cada app).
export const REVENUECAT_API_KEY_ANDROID = '';
export const REVENUECAT_API_KEY_IOS = '';

// Identificador do "entitlement" (direito) que representa o acesso PRO,
// criado no painel do RevenueCat e vinculado às assinaturas.
export const PRO_ENTITLEMENT_ID = 'pro';

// Limite do plano gratuito (clientes simultâneas cadastradas).
export const FREE_CLIENT_LIMIT = 50;

/**
 * Funcionalidades exclusivas do PRO. O plano gratuito cobre o básico para
 * autônomas (agenda, clientes até o limite, serviços, agendamentos, lembretes).
 */
export type ProFeature =
  | 'professionals' // múltiplos profissionais
  | 'reports' // relatórios / dashboard de faturamento
  | 'cloud_sync' // backup e sincronização na nuvem
  | 'export' // exportar dados
  | 'packages' // pacotes de serviços
  | 'recurrence'; // agendamentos recorrentes

export const PRO_FEATURE_LABELS: Record<ProFeature, string> = {
  professionals: 'Vários profissionais (equipe)',
  reports: 'Relatórios e faturamento',
  cloud_sync: 'Backup e sincronização na nuvem',
  export: 'Exportar seus dados',
  packages: 'Pacotes de serviços',
  recurrence: 'Agendamentos recorrentes',
};
