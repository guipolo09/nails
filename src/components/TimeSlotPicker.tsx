// ============================================
// SELETOR DE HORÁRIO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { COLORS } from '../utils/constants';
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
  const availableSlots = slots.filter(s => s.available);
  const unavailableCount = slots.length - availableSlots.length;

  if (availableSlots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
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
        <Text style={styles.info}>
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
                  isSelected && styles.chipSelected,
                ]}
                textStyle={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
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
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
