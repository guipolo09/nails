// ============================================
// CARD DE SERVIÇO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import { COLORS } from '../utils/constants';
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
  return (
    <Card
      style={[styles.card, selected && styles.cardSelected]}
      onPress={selectable ? onSelect : undefined}
      mode={selected ? 'contained' : 'elevated'}
    >
      <Card.Content style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name}>{service.name}</Text>
          <Text style={styles.duration}>
            {formatDuration(service.durationMinutes)}
          </Text>
        </View>
        {!selectable && (onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <IconButton
                icon="pencil"
                size={24}
                iconColor={COLORS.primary}
                onPress={onEdit}
              />
            )}
            {onDelete && (
              <IconButton
                icon="delete"
                size={24}
                iconColor={COLORS.error}
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
  cardSelected: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
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
    color: COLORS.text,
  },
  duration: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
  },
});
