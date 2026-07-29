// ============================================
// RESOLUÇÃO DE CONFLITO — Last-Write-Wins (LWW)
// Função pura (testável) que decide se a versão remota deve sobrescrever a local,
// comparando os timestamps `updatedAt` (ISO 8601 — comparação lexicográfica = cronológica).
// ============================================

/**
 * Retorna true se a mudança remota deve vencer (ser aplicada localmente).
 * Em empate de timestamp, o remoto vence (convergência determinística entre dispositivos).
 */
export function remoteWins(
  localUpdatedAt: string | null | undefined,
  remoteUpdatedAt: string
): boolean {
  if (!localUpdatedAt) return true;
  return remoteUpdatedAt >= localUpdatedAt;
}

/**
 * Ordem de aplicação por entidade: pais antes de filhos, para respeitar as
 * chaves estrangeiras ao aplicar mudanças remotas localmente.
 */
export const ENTITY_APPLY_ORDER: Record<string, number> = {
  clients: 0,
  services: 1,
  professionals: 2,
  packages: 3,
  appointments: 4,
  package_slots: 5,
};

export function compareByApplyOrder(a: string, b: string): number {
  return (ENTITY_APPLY_ORDER[a] ?? 99) - (ENTITY_APPLY_ORDER[b] ?? 99);
}
