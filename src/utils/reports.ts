// ============================================
// AGREGAÇÕES DE RELATÓRIO (funções puras, testáveis)
// Operam sobre linhas simples derivadas dos agendamentos.
// Regra de faturamento: agendamentos marcados como falta ('missed') não geram receita.
// ============================================

export interface ReportRow {
  date: string; // YYYY-MM-DD
  serviceName: string;
  clientName: string;
  priceCents?: number;
  attendanceStatus?: 'confirmed' | 'missed';
  paymentStatus?: 'paid' | 'pending';
}

/** Filtra linhas cujo `date` está no intervalo [start, end] (inclusivo, YYYY-MM-DD). */
export function filterByPeriod(rows: ReportRow[], start: string, end: string): ReportRow[] {
  return rows.filter(r => r.date >= start && r.date <= end);
}

/** Linhas que geram receita (não marcadas como falta). */
function revenueRows(rows: ReportRow[]): ReportRow[] {
  return rows.filter(r => r.attendanceStatus !== 'missed');
}

export interface RevenueSummary {
  totalCents: number;
  receivedCents: number;
  pendingCents: number;
  count: number;
}

/** Faturamento total, recebido (pago) e a receber (pendente). */
export function revenueSummary(rows: ReportRow[]): RevenueSummary {
  const considered = revenueRows(rows);
  let totalCents = 0;
  let receivedCents = 0;
  for (const r of considered) {
    const price = r.priceCents ?? 0;
    totalCents += price;
    if (r.paymentStatus === 'paid') receivedCents += price;
  }
  return {
    totalCents,
    receivedCents,
    pendingCents: totalCents - receivedCents,
    count: considered.length,
  };
}

export interface ServiceAggregate {
  serviceName: string;
  count: number;
  totalCents: number;
}

/** Ranking de serviços por faturamento (desc). */
export function revenueByService(rows: ReportRow[]): ServiceAggregate[] {
  const map = new Map<string, ServiceAggregate>();
  for (const r of revenueRows(rows)) {
    const agg = map.get(r.serviceName) ?? { serviceName: r.serviceName, count: 0, totalCents: 0 };
    agg.count += 1;
    agg.totalCents += r.priceCents ?? 0;
    map.set(r.serviceName, agg);
  }
  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents || b.count - a.count);
}

export interface ClientAggregate {
  clientName: string;
  count: number;
  totalCents: number;
}

/** Ranking de clientes por faturamento (desc). */
export function topClients(rows: ReportRow[], limit = 5): ClientAggregate[] {
  const map = new Map<string, ClientAggregate>();
  for (const r of revenueRows(rows)) {
    const agg = map.get(r.clientName) ?? { clientName: r.clientName, count: 0, totalCents: 0 };
    agg.count += 1;
    agg.totalCents += r.priceCents ?? 0;
    map.set(r.clientName, agg);
  }
  return [...map.values()]
    .sort((a, b) => b.totalCents - a.totalCents || b.count - a.count)
    .slice(0, limit);
}

export interface NoShowStats {
  attended: number;
  missed: number;
  total: number;
  rate: number; // 0..1 (faltas / total com status registrado)
}

/** Estatística de faltas entre agendamentos com presença registrada. */
export function noShowStats(rows: ReportRow[]): NoShowStats {
  let attended = 0;
  let missed = 0;
  for (const r of rows) {
    if (r.attendanceStatus === 'confirmed') attended += 1;
    else if (r.attendanceStatus === 'missed') missed += 1;
  }
  const total = attended + missed;
  return { attended, missed, total, rate: total === 0 ? 0 : missed / total };
}
