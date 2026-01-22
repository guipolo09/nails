// ============================================
// ESTADO VAZIO (QUANDO NÃO HÁ DADOS)
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon source={icon} size={80} color={theme.colors.onSurfaceVariant} />
      <Text style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});
