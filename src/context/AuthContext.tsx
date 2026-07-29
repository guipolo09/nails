// ============================================
// CONTEXTO DE AUTENTICAÇÃO / BLOQUEIO
// Controla se o app está bloqueado e re-bloqueia ao voltar do segundo plano.
// ============================================

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isLockEnabled } from '../services/authService';

interface AuthContextType {
  /** Se o bloqueio por PIN/biometria está ativado nas configurações. */
  lockEnabled: boolean;
  /** Se o app está bloqueado neste momento (deve exibir a LockScreen). */
  isLocked: boolean;
  /** Chamado após autenticação bem-sucedida. */
  unlock: () => void;
  /** Recarrega a configuração de bloqueio (após ativar/desativar em Ajustes). */
  refreshLockConfig: () => Promise<void>;
  /** Ainda carregando a configuração inicial. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const lockEnabledRef = useRef(false);

  const refreshLockConfig = async () => {
    const enabled = await isLockEnabled();
    lockEnabledRef.current = enabled;
    setLockEnabled(enabled);
    // Se acabou de ativar o bloqueio, não trava a sessão atual;
    // se desativou, garante que não fique preso na tela de bloqueio.
    if (!enabled) setIsLocked(false);
  };

  useEffect(() => {
    const init = async () => {
      const enabled = await isLockEnabled();
      lockEnabledRef.current = enabled;
      setLockEnabled(enabled);
      setIsLocked(enabled); // inicia bloqueado se o bloqueio estiver ativo
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      // Ao ir para segundo plano/inativo, re-bloqueia (se o bloqueio estiver ativo).
      if ((next === 'background' || next === 'inactive') && lockEnabledRef.current) {
        setIsLocked(true);
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, []);

  const unlock = () => setIsLocked(false);

  return (
    <AuthContext.Provider value={{ lockEnabled, isLocked, unlock, refreshLockConfig, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
