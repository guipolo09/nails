// ============================================
// SELETOR DE HORÁRIO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';
import type { TimeSlot } from '../types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedTime,
  onSelectTime,
}) => {
  const theme = useTheme();
  const availableSlots = slots.filter(s => s.available);
  const unavailableCount = slots.length - availableSlots.length;

  if (availableSlots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          Nenhum horário disponível nesta data
        </Text>
      </View>
    );
  }

  // Agrupar slots em linhas de 4
  const rows: TimeSlot[][] = [];
  for (let i = 0; i < availableSlots.length; i += 4) {
    rows.push(availableSlots.slice(i, i + 4));
  }

  return (
    <View style={styles.container}>
      {unavailableCount > 0 && (
        <Text style={[styles.info, { color: theme.colors.onSurfaceVariant }]}>
          {unavailableCount} horário(s) já ocupado(s)
        </Text>
      )}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(item => {
            const isSelected = item.time === selectedTime;
            return (
              <Chip
                key={item.time}
                mode={isSelected ? 'flat' : 'outlined'}
                selected={isSelected}
                onPress={() => onSelectTime(item.time)}
                style={[
                  styles.chip,
                  { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface },
                ]}
                textStyle={{
                  color: isSelected ? '#FFFFFF' : theme.colors.onSurface,
                  fontSize: 14,
                }}
                showSelectedOverlay={false}
              >
                {item.time}
              </Chip>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  info: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
