// ============================================
// CARD DE AGENDAMENTO
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, Chip, Button, useTheme } from 'react-native-paper';
import { formatDateLong, formatCurrency } from '../utils/helpers';
import type { Appointment } from '../types';
import dayjs from 'dayjs';

interface AppointmentCardProps {
  appointment: Appointment;
  onDelete?: () => void;
  onEdit?: () => void;
  onConfirm?: () => void;
  onMissed?: () => void;
  onTogglePayment?: () => void;
  showDate?: boolean;
  packageLabel?: string; // ex: "2/4" — posição do slot no pacote
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onDelete,
  onEdit,
  onConfirm,
  onMissed,
  onTogglePayment,
  showDate = true,
  packageLabel,
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
              {appointment.priceCents != null ? ` · ${formatCurrency(appointment.priceCents)}` : ''}
            </Text>
            {appointment.professionalName ? (
              <Text style={[styles.professional, { color: theme.colors.primary }]} numberOfLines={1}>
                {appointment.professionalName}
              </Text>
            ) : null}
            {showDate && (
              <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
                {isToday ? 'Hoje' : formatDateLong(appointment.date)}
              </Text>
            )}
          </View>

          {!isPast && (onEdit || onDelete) && (
            <View style={styles.actionsColumn}>
              {onEdit && (
                <IconButton
                  icon="pencil"
                  size={22}
                  iconColor={theme.colors.primary}
                  onPress={onEdit}
                  style={styles.actionButton}
                />
              )}
              {onDelete && (
                <IconButton
                  icon="close-circle"
                  size={26}
                  iconColor={theme.colors.error}
                  onPress={onDelete}
                  style={styles.actionButton}
                />
              )}
            </View>
          )}
        </View>

        {/* Chips: pacote e/ou calendário */}
        {(appointment.packageId || appointment.calendarEventId) && (
          <View style={styles.chipsRow}>
            {appointment.packageId && (
              <Chip
                icon="package-variant-closed"
                style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer ?? theme.colors.primaryContainer }]}
                textStyle={[styles.chipText, { color: theme.colors.secondary ?? theme.colors.primary }]}
                compact
              >
                {packageLabel ? `Pacote · ${packageLabel}` : 'Pacote'}
              </Chip>
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
        )}

        {/* Pagamento — quando há preço e não foi marcado como falta */}
        {appointment.priceCents != null &&
          appointment.attendanceStatus !== 'missed' &&
          onTogglePayment && (
            <View style={styles.paymentRow}>
              <Button
                mode={appointment.paymentStatus === 'paid' ? 'contained' : 'contained-tonal'}
                icon={appointment.paymentStatus === 'paid' ? 'cash-check' : 'cash-clock'}
                onPress={onTogglePayment}
                buttonColor={appointment.paymentStatus === 'paid' ? '#2E7D32' : '#FFE0B2'}
                textColor={appointment.paymentStatus === 'paid' ? '#FFFFFF' : '#E65100'}
                style={styles.paymentButton}
                contentStyle={styles.paymentButtonContent}
                labelStyle={styles.paymentButtonLabel}
              >
                {appointment.paymentStatus === 'paid'
                  ? `Pago · ${formatCurrency(appointment.priceCents)}`
                  : `Marcar como pago · ${formatCurrency(appointment.priceCents)}`}
              </Button>
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
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionButton: {
    margin: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingLeft: 2,
  },
  paymentRow: {
    marginTop: 10,
    paddingLeft: 2,
  },
  paymentButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
  },
  paymentButtonContent: {
    height: 40,
    paddingHorizontal: 8,
  },
  paymentButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
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
  professional: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
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
