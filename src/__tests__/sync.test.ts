// ============================================
// TESTES — resolução de conflito de sincronização (LWW)
// Funções puras, sem dependências nativas.
// ============================================

import { remoteWins, compareByApplyOrder, ENTITY_APPLY_ORDER } from '../sync/mergeLWW';

describe('remoteWins', () => {
  it('remoto vence quando não há versão local', () => {
    expect(remoteWins(null, '2026-07-27T10:00:00.000Z')).toBe(true);
    expect(remoteWins(undefined, '2026-07-27T10:00:00.000Z')).toBe(true);
  });

  it('remoto vence quando é mais recente', () => {
    expect(remoteWins('2026-07-27T09:00:00.000Z', '2026-07-27T10:00:00.000Z')).toBe(true);
  });

  it('local vence quando é mais recente', () => {
    expect(remoteWins('2026-07-27T11:00:00.000Z', '2026-07-27T10:00:00.000Z')).toBe(false);
  });

  it('em empate, remoto vence (convergência determinística)', () => {
    const ts = '2026-07-27T10:00:00.000Z';
    expect(remoteWins(ts, ts)).toBe(true);
  });
});

describe('compareByApplyOrder', () => {
  it('ordena pais antes de filhos (respeita FKs)', () => {
    const entities = ['package_slots', 'appointments', 'clients', 'services', 'packages'];
    const sorted = [...entities].sort(compareByApplyOrder);
    expect(sorted).toEqual(['clients', 'services', 'packages', 'appointments', 'package_slots']);
  });

  it('clientes vêm antes de agendamentos', () => {
    expect(ENTITY_APPLY_ORDER.clients).toBeLessThan(ENTITY_APPLY_ORDER.appointments);
  });
});
