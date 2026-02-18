// ============================================
// CARD DE AGENDAMENTO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, Chip, Button, useTheme } from 'react-native-paper';
import { formatDateLong } from '../utils/helpers';
import type { Appointment } from '../types';
import dayjs from 'dayjs';

interface AppointmentCardProps {
  appointment: Appointment;
  onDelete?: () => void;
  onConfirm?: () => void;
  onMissed?: () => void;
  showDate?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onDelete,
  onConfirm,
  onMissed,
  showDate = true,
}) => {
  const theme = useTheme();
  const isToday = appointment.date === dayjs().format('YYYY-MM-DD');
  const isPast = dayjs(appointment.date).isBefore(dayjs(), 'day');
  const { attendanceStatus } = appointment;

  return (
    <Card style={[styles.card, isPast && styles.cardPast]} mode="elevated">
      <Card.Content style={styles.content}>
        {/* Linha superior: horário + nome + botão de deletar */}
        <View style={styles.topRow}>
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
              numberOfLines={1}
            >
              {appointment.clientName}
            </Text>
            <Text
              style={[styles.serviceName, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {appointment.serviceName}
            </Text>
            {showDate && (
              <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
                {isToday ? 'Hoje' : formatDateLong(appointment.date)}
              </Text>
            )}
          </View>

          {!isPast && onDelete && (
            <IconButton
              icon="close-circle"
              size={26}
              iconColor={theme.colors.error}
              onPress={onDelete}
              style={styles.deleteButton}
            />
          )}
        </View>

        {/* Chip do calendário */}
        {appointment.calendarEventId && (
          <View style={styles.chipsRow}>
            <Chip
              icon="calendar-check"
              style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={styles.chipText}
              compact
            >
              Agenda
            </Chip>
          </View>
        )}

        {/* Seção de presença — sempre com a mesma altura para evitar resize do card */}
        {isPast && (attendanceStatus || onConfirm || onMissed) && (
          <View style={styles.attendanceRow}>
            {attendanceStatus === 'confirmed' ? (
              <Chip
                icon="check-circle"
                style={[styles.attendanceStatusChip, { backgroundColor: '#4CAF5022' }]}
                textStyle={[styles.chipText, { color: '#2E7D32' }]}
                compact
              >
                Compareceu
              </Chip>
            ) : attendanceStatus === 'missed' ? (
              <Chip
                icon="close-circle"
                style={[styles.attendanceStatusChip, { backgroundColor: '#F4433622' }]}
                textStyle={[styles.chipText, { color: '#C62828' }]}
                compact
              >
                Não foi
              </Chip>
            ) : (
              <>
                {onConfirm && (
                  <Button
                    mode="outlined"
                    icon="check-circle-outline"
                    onPress={onConfirm}
                    textColor="#2E7D32"
                    style={[styles.attendanceButton, { borderColor: '#4CAF50' }]}
                    contentStyle={styles.attendanceButtonContent}
                    labelStyle={styles.attendanceButtonLabel}
                    compact
                  >
                    Compareceu
                  </Button>
                )}
                {onMissed && (
                  <Button
                    mode="outlined"
                    icon="close-circle-outline"
                    onPress={onMissed}
                    textColor="#C62828"
                    style={[styles.attendanceButton, { borderColor: '#F44336' }]}
                    contentStyle={styles.attendanceButtonContent}
                    labelStyle={styles.attendanceButtonLabel}
                    compact
                  >
                    Não foi
                  </Button>
                )}
              </>
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
  cardPast: {
    opacity: 0.75,
  },
  content: {
    paddingVertical: 10,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deleteButton: {
    margin: 0,
    marginLeft: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingLeft: 2,
  },
  timeColumn: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 2,
    marginRight: 16,
    paddingTop: 2,
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
    height: 26,
  },
  chipText: {
    fontSize: 10,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  statusChip: {
    marginTop: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000020',
  },
  attendanceStatusChip: {
    height: 34,
    alignSelf: 'flex-start',
  },
  attendanceButton: {
    flex: 1,
    borderRadius: 8,
  },
  attendanceButtonContent: {
    height: 34,
  },
  attendanceButtonLabel: {
    fontSize: 12,
  },
});
