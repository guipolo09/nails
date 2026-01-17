// ============================================
// CARD DE AGENDAMENTO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, Chip } from 'react-native-paper';
import { COLORS } from '../utils/constants';
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
  const isToday = appointment.date === dayjs().format('YYYY-MM-DD');
  const isPast = dayjs(appointment.date).isBefore(dayjs(), 'day');

  return (
    <Card style={[styles.card, isPast && styles.cardPast]} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.timeColumn}>
          <Text style={styles.time}>{appointment.startTime}</Text>
          <Text style={styles.timeSeparator}>|</Text>
          <Text style={styles.timeEnd}>{appointment.endTime}</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.clientName, isPast && styles.textPast]}>
            {appointment.clientName}
          </Text>
          <Text style={[styles.serviceName, isPast && styles.textPast]}>
            {appointment.serviceName}
          </Text>
          {showDate && (
            <Text style={styles.date}>
              {isToday ? 'Hoje' : formatDateLong(appointment.date)}
            </Text>
          )}
          {appointment.calendarEventId && (
            <Chip
              icon="calendar-check"
              style={styles.chip}
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
            iconColor={COLORS.error}
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
    borderRightColor: COLORS.primary,
    marginRight: 16,
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timeSeparator: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timeEnd: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  info: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  textPast: {
    color: COLORS.textSecondary,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: COLORS.primaryLight,
    height: 24,
  },
  chipText: {
    fontSize: 10,
  },
});
