// ============================================
// REPOSITÓRIO DE SERVIÇOS
// Implementação local - preparado para futura API
// ============================================

import { saveData, loadData } from '../storage/asyncStorage';
import { STORAGE_KEYS } from '../utils/constants';
import { generateId, getCurrentTimestamp } from '../utils/helpers';
import type { Service, CreateServiceDTO, UpdateServiceDTO, Repository } from '../types';

/**
 * Interface do repositório de serviços
 * Preparada para implementação com API REST
 */
export interface IServiceRepository extends Repository<Service, CreateServiceDTO, UpdateServiceDTO> {
  getAll(): Promise<Service[]>;
  getById(id: string): Promise<Service | null>;
  create(data: CreateServiceDTO): Promise<Service>;
  update(id: string, data: UpdateServiceDTO): Promise<Service | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Implementação local do repositório usando AsyncStorage
 */
class LocalServiceRepository implements IServiceRepository {
  private async getAllServices(): Promise<Service[]> {
    const data = await loadData<Service[]>(STORAGE_KEYS.SERVICES);
    return data || [];
  }

  private async saveAllServices(services: Service[]): Promise<void> {
    await saveData(STORAGE_KEYS.SERVICES, services);
  }

  async getAll(): Promise<Service[]> {
    return this.getAllServices();
  }

  async getById(id: string): Promise<Service | null> {
    const services = await this.getAllServices();
    return services.find(s => s.id === id) || null;
  }

  async create(data: CreateServiceDTO): Promise<Service> {
    const services = await this.getAllServices();
    const timestamp = getCurrentTimestamp();

    const newService: Service = {
      id: generateId(),
      name: data.name.trim(),
      durationMinutes: data.durationMinutes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    services.push(newService);
    await this.saveAllServices(services);

    return newService;
  }

  async update(id: string, data: UpdateServiceDTO): Promise<Service | null> {
    const services = await this.getAllServices();
    const index = services.findIndex(s => s.id === id);

    if (index === -1) {
      return null;
    }

    const updatedService: Service = {
      ...services[index],
      ...data,
      name: data.name?.trim() || services[index].name,
      updatedAt: getCurrentTimestamp(),
    };

    services[index] = updatedService;
    await this.saveAllServices(services);

    return updatedService;
  }

  async delete(id: string): Promise<boolean> {
    const services = await this.getAllServices();
    const filteredServices = services.filter(s => s.id !== id);

    if (filteredServices.length === services.length) {
      return false;
    }

    await this.saveAllServices(filteredServices);
    return true;
  }
}

// Singleton para uso em todo o app
// Futuramente pode ser substituído por ApiServiceRepository
export const serviceRepository: IServiceRepository = new LocalServiceRepository();
