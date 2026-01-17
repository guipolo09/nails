// ============================================
// BOTÃO GRANDE E ACESSÍVEL
// ============================================

import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  mode?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
  loading?: boolean;
  color?: string;
}

export const BigButton: React.FC<BigButtonProps> = ({
  label,
  onPress,
  icon,
  mode = 'contained',
  disabled = false,
  loading = false,
  color,
}) => {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      icon={icon}
      disabled={disabled}
      loading={loading}
      style={styles.button}
      contentStyle={styles.content}
      labelStyle={styles.label}
      buttonColor={color}
    >
      {label}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
    borderRadius: 12,
  },
  content: {
    height: 56,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
  },
});
