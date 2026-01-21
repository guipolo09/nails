// ============================================
// SERVIÇO DE ARMAZENAMENTO LOCAL
// Wrapper do AsyncStorage para tipagem e facilidade
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Salva dados no AsyncStorage
 */
export const saveData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Erro ao salvar dados (${key}):`, error);
    throw error;
  }
};

/**
 * Recupera dados do AsyncStorage
 */
export const loadData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Erro ao carregar dados (${key}):`, error);
    throw error;
  }
};

/**
 * Remove dados do AsyncStorage
 */
export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Erro ao remover dados (${key}):`, error);
    throw error;
  }
};

/**
 * Limpa todos os dados do app
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    throw error;
  }
};

/**
 * Alias para loadData (compatibilidade)
 */
export const getItem = loadData;

/**
 * Alias para saveData (compatibilidade)
 */
export const setItem = saveData;
