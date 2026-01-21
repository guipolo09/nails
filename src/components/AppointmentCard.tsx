// ============================================
// CARD DE AGENDAMENTO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, Chip, useTheme } from 'react-native-paper';
import { formatDate, formatDateLong } from '../utils/helpers';
import type { Appointment } from '../types';
import dayjs from 'dayjs';

interface AppointmentCardProps {
  appointment: Appointment;
  onDelete?: () => void;
  showDate?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onDelete,
  showDate = true,
}) => {
  const theme = useTheme();
  const isToday = appointment.date === dayjs().format('YYYY-MM-DD');
  const isPast = dayjs(appointment.date).isBefore(dayjs(), 'day');

  return (
    <Card style={[styles.card, isPast && styles.cardPast]} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={[styles.timeColumn, { borderRightColor: theme.colors.primary }]}>
          <Text style={[styles.time, { color: theme.colors.primary }]}>
            {appointment.startTime}
          </Text>
          <Text style={[styles.timeSeparator, { color: theme.colors.onSurfaceVariant }]}>
            |
          </Text>
          <Text style={[styles.timeEnd, { color: theme.colors.onSurfaceVariant }]}>
            {appointment.endTime}
          </Text>
        </View>

        <View style={styles.info}>
          <Text
            style={[
              styles.clientName,
              { color: isPast ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
            ]}
          >
            {appointment.clientName}
          </Text>
          <Text
            style={[
              styles.serviceName,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {appointment.serviceName}
          </Text>
          {showDate && (
            <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
              {isToday ? 'Hoje' : formatDateLong(appointment.date)}
            </Text>
          )}
          {appointment.calendarEventId && (
            <Chip
              icon="calendar-check"
              style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={styles.chipText}
              compact
            >
              Agenda
            </Chip>
          )}
        </View>

        {onDelete && !isPast && (
          <IconButton
            icon="close-circle"
            size={28}
            iconColor={theme.colors.error}
            onPress={onDelete}
          />
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
  cardPast: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timeColumn: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 2,
    marginRight: 16,
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
  },
  timeSeparator: {
    fontSize: 12,
  },
  timeEnd: {
    fontSize: 14,
  },
  info: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
  },
  serviceName: {
    fontSize: 14,
    marginTop: 2,
  },
  date: {
    fontSize: 14,
    marginTop: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    height: 24,
  },
  chipText: {
    fontSize: 10,
  },
});
