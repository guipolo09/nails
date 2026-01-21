// ============================================
// CARD DE SERVIÇO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, useTheme } from 'react-native-paper';
import { formatDuration } from '../utils/helpers';
import type { Service } from '../types';

interface ServiceCardProps {
  service: Service;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onEdit,
  onDelete,
  onSelect,
  selectable = false,
  selected = false,
}) => {
  const theme = useTheme();

  return (
    <Card
      style={[
        styles.card,
        selected && {
          backgroundColor: theme.colors.primaryContainer,
          borderWidth: 2,
          borderColor: theme.colors.primary,
        },
      ]}
      onPress={selectable ? onSelect : undefined}
      mode={selected ? 'contained' : 'elevated'}
    >
      <Card.Content style={styles.content}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]}>
            {service.name}
          </Text>
          <Text style={[styles.duration, { color: theme.colors.onSurfaceVariant }]}>
            {formatDuration(service.durationMinutes)}
          </Text>
        </View>
        {!selectable && (onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <IconButton
                icon="pencil"
                size={24}
                iconColor={theme.colors.primary}
                onPress={onEdit}
              />
            )}
            {onDelete && (
              <IconButton
                icon="delete"
                size={24}
                iconColor={theme.colors.error}
                onPress={onDelete}
              />
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  duration: {
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
  },
});
