// ============================================
// TESTES — agregações de relatório (funções puras)
// ============================================

import {
  filterByPeriod,
  revenueSummary,
  revenueByService,
  topClients,
  noShowStats,
  type ReportRow,
} from '../utils/reports';

const rows: ReportRow[] = [
  { date: '2026-07-05', serviceName: 'Manicure', clientName: 'Ana', priceCents: 4500, attendanceStatus: 'confirmed', paymentStatus: 'paid' },
  { date: '2026-07-10', serviceName: 'Pedicure', clientName: 'Ana', priceCents: 5000, attendanceStatus: 'confirmed', paymentStatus: 'pending' },
  { date: '2026-07-12', serviceName: 'Manicure', clientName: 'Bia', priceCents: 4500, paymentStatus: 'pending' },
  { date: '2026-07-15', serviceName: 'Gel', clientName: 'Ana', priceCents: 8000, attendanceStatus: 'missed', paymentStatus: 'pending' },
  { date: '2026-06-20', serviceName: 'Manicure', clientName: 'Bia', priceCents: 4500, attendanceStatus: 'confirmed', paymentStatus: 'paid' },
];

describe('filterByPeriod', () => {
  it('filtra pelo intervalo inclusivo', () => {
    const r = filterByPeriod(rows, '2026-07-01', '2026-07-31');
    expect(r).toHaveLength(4);
  });
});

describe('revenueSummary', () => {
  it('exclui faltas do faturamento e separa recebido/pendente', () => {
    const july = filterByPeriod(rows, '2026-07-01', '2026-07-31');
    const s = revenueSummary(july);
    // considerados: 4500 + 5000 + 4500 = 14000 (o 'missed' de 8000 não conta)
    expect(s.totalCents).toBe(14000);
    expect(s.receivedCents).toBe(4500); // só o primeiro está 'paid'
    expect(s.pendingCents).toBe(9500);
    expect(s.count).toBe(3);
  });
});

describe('revenueByService', () => {
  it('agrupa e ordena por faturamento', () => {
    const july = filterByPeriod(rows, '2026-07-01', '2026-07-31');
    const byService = revenueByService(july);
    // Manicure: 4500 + 4500 = 9000 (2x); Pedicure: 5000 (1x); Gel: excluído (missed)
    expect(byService[0]).toEqual({ serviceName: 'Manicure', count: 2, totalCents: 9000 });
    expect(byService[1]).toEqual({ serviceName: 'Pedicure', count: 1, totalCents: 5000 });
    expect(byService.find(s => s.serviceName === 'Gel')).toBeUndefined();
  });
});

describe('topClients', () => {
  it('ordena clientes por faturamento', () => {
    const july = filterByPeriod(rows, '2026-07-01', '2026-07-31');
    const top = topClients(july);
    // Ana: 4500 + 5000 = 9500 (Gel missed não conta); Bia: 4500
    expect(top[0].clientName).toBe('Ana');
    expect(top[0].totalCents).toBe(9500);
    expect(top[1].clientName).toBe('Bia');
  });
});

describe('noShowStats', () => {
  it('calcula a taxa de faltas entre presenças registradas', () => {
    const july = filterByPeriod(rows, '2026-07-01', '2026-07-31');
    const stats = noShowStats(july);
    // confirmados: 2 (Ana Manicure, Ana Pedicure); faltas: 1 (Gel); Bia Manicure sem status
    expect(stats.attended).toBe(2);
    expect(stats.missed).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.rate).toBeCloseTo(1 / 3);
  });
});
