// ============================================
// SERVIÇO DE PRIVACIDADE DE DADOS (LGPD)
// Direitos do titular: portabilidade (exportar) e eliminação (apagar).
// ============================================

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../database/database';
import { clientRepository } from './clientRepository';
import { serviceRepository } from './serviceRepository';
import { appointmentRepository } from './appointmentRepository';
import { packageRepository } from './packageRepository';
import { settingsRepository } from './settingsRepository';
import { buildExportPayload } from './exportPayload';

export type { ExportPayload } from './exportPayload';
export { buildExportPayload } from './exportPayload';

async function writeAndShare(fileName: string, content: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar dados',
      UTI: 'public.json',
    });
  }
}

/**
 * Exporta TODOS os dados do app em JSON e abre o menu de compartilhamento.
 */
export async function exportAllData(appVersion: string): Promise<void> {
  const [clients, services, appointments, packages, settings] = await Promise.all([
    Promise.resolve(clientRepository.getAll()),
    serviceRepository.getAll(),
    appointmentRepository.getAll(),
    packageRepository.getAllPackages(),
    settingsRepository.getSettings(),
  ]);

  const payload = buildExportPayload({
    exportedAt: new Date().toISOString(),
    appVersion,
    clients,
    services,
    appointments,
    packages,
    settings,
  });

  await writeAndShare('nails-dados-completos.json', JSON.stringify(payload, null, 2));
}

/**
 * Exporta os dados de UMA cliente específica (portabilidade individual).
 */
export async function exportClientData(clientId: string, appVersion: string): Promise<void> {
  const client = clientRepository.getById(clientId);
  if (!client) throw new Error('Cliente não encontrada');

  const [allAppointments, allPackages] = await Promise.all([
    appointmentRepository.getAll(),
    packageRepository.getByClientId(clientId),
  ]);

  const appointments = allAppointments.filter(
    a => a.clientId === clientId || a.clientName === client.name
  );

  const data = {
    exportedAt: new Date().toISOString(),
    appVersion,
    client,
    appointments,
    packages: allPackages,
  };

  const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  await writeAndShare(`nails-cliente-${safeName}.json`, JSON.stringify(data, null, 2));
}

/**
 * Elimina permanentemente uma cliente e TODO o seu histórico (direito ao
 * esquecimento). Remove agendamentos e pacotes vinculados (por id ou nome
 * desnormalizado) e, por fim, o cadastro da cliente — de forma atômica.
 */
export function eraseClientData(clientId: string): boolean {
  const client = clientRepository.getById(clientId);
  if (!client) return false;

  db.withTransactionSync(() => {
    // Agendamentos: por vínculo de id ou por nome desnormalizado (PII residual)
    db.runSync('DELETE FROM appointments WHERE clientId = ? OR clientName = ?', [
      clientId,
      client.name,
    ]);
    // Pacotes por vínculo de id (slots caem em cascata) e por nome
    db.runSync('DELETE FROM packages WHERE clientId = ? OR clientName = ?', [
      clientId,
      client.name,
    ]);
    // Cliente
    db.runSync('DELETE FROM clients WHERE id = ?', [clientId]);
  });

  return true;
}
