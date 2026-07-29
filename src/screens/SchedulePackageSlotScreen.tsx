// ============================================
// TELA DE AGENDAMENTO DE SLOT DE PACOTE
// ============================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { Text, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import dayjs from 'dayjs';
import { ScreenContainer, BigButton, TimeSlotPicker, EmptyState, LoadingState } from '../components';
import { useAppointments, useSettings } from '../hooks';
import { usePackages } from '../hooks/usePackages';
import { packageRepository } from '../services/packageRepository';
import {
  generateTimeSlotsWithSettings,
  formatDateLong,
  calculateEndTime,
  formatDuration,
} from '../utils/helpers';
import type { RootStackParamList, Appointment, PackageSlot, ServicePackage, AppSettings } from '../types';

type ScheduleSlotRouteProp = RouteProp<RootStackParamList, 'SchedulePackageSlot'>;
type ScheduleSlotNavigationProp = StackNavigationProp<RootStackParamList, 'SchedulePackageSlot'>;

// ---- Abreviações ----
const WEEKDAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAYS_AHEAD = 30;
const CELL_WIDTH = 52;
const CELL_GAP = 6;
const SNAP = CELL_WIDTH + CELL_GAP;

interface DateItem {
  value: string;
  dayNum: number;
  weekday: string;
  month: string;
  isToday: boolean;
  isHoliday: boolean;
}

// ---- Componente de picker de datas por rolagem ----
const DateScrollPicker: React.FC<{
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  settings: AppSettings | null;
}> = ({ selectedDate, onSelectDate, settings }) => {
  const theme = useTheme();
  const listRef = useRef<FlatList<DateItem>>(null);

  const dates = useMemo<DateItem[]>(() =>
    Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = dayjs().add(i, 'day');
      const value = d.format('YYYY-MM-DD');
      return {
        value,
        dayNum: d.date(),
        weekday: WEEKDAY_ABBR[d.day()],
        month: MONTH_ABBR[d.month()],
        isToday: i === 0,
        isHoliday: settings?.holidays.includes(value) ?? false,
      };
    }), [settings]);

  // Centra no item selecionado
  useEffect(() => {
    if (!selectedDate) return;
    const index = dates.findIndex(d => d.value === selectedDate);
    if (index >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }, 100);
    }
  }, [selectedDate, dates]);

  return (
    <FlatList
      ref={listRef}
      data={dates}
      horizontal
      keyExtractor={item => item.value}
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP}
      decelerationRate="fast"
      contentContainerStyle={styles.datePickerContent}
      getItemLayout={(_, index) => ({ length: SNAP, offset: SNAP * index, index })}
      renderItem={({ item }) => {
        const isSelected = selectedDate === item.value;
        const isToday = item.isToday;
        return (
          <Pressable
            onPress={() => !item.isHoliday && onSelectDate(item.value)}
            style={[styles.dateCell, { marginRight: CELL_GAP, opacity: item.isHoliday ? 0.35 : 1 }]}
          >
            <Text
              style={[
                styles.dateCellWeekday,
                { color: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant },
              ]}
            >
              {item.weekday}
            </Text>
            <View
              style={[
                styles.dateCellCircle,
                isSelected && { backgroundColor: theme.colors.primary },
                !isSelected && isToday && { borderWidth: 1.5, borderColor: theme.colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.dateCellNum,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : isToday
                      ? theme.colors.primary
                      : theme.colors.onSurface,
                  },
                ]}
              >
                {item.dayNum}
              </Text>
            </View>
            <Text
              style={[
                styles.dateCellMonth,
                { color: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant },
              ]}
            >
              {item.month}
            </Text>
          </Pressable>
        );
      }}
    />
  );
};

// ---- Tela principal ----
export const SchedulePackageSlotScreen: React.FC = () => {
  const navigation = useNavigation<ScheduleSlotNavigationProp>();
  const route = useRoute<ScheduleSlotRouteProp>();
  const { packageId, slotId } = route.params;
  const { createAppointment, getAppointmentsByDate } = useAppointments();
  const { scheduleSlot } = usePackages();
  const { settings } = useSettings();
  const theme = useTheme();

  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [slot, setSlot] = useState<PackageSlot | null>(null);
  const [step, setStep] = useState<'datetime' | 'confirm'>('datetime');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    packageRepository.getById(packageId).then(p => {
      if (p) {
        setPkg(p);
        const s = p.slots.find(sl => sl.id === slotId);
        if (s) setSlot(s);
      }
    });
  }, [packageId, slotId]);

  useEffect(() => {
    if (selectedDate) {
      getAppointmentsByDate(selectedDate).then(setDayAppointments);
      setSelectedTime(null);
    }
  }, [selectedDate, getAppointmentsByDate]);

  const timeSlots = useMemo(() => {
    if (!selectedDate || !slot) return [];
    return generateTimeSlotsWithSettings(selectedDate, dayAppointments, slot.durationMinutes, settings);
  }, [selectedDate, slot, dayAppointments, settings]);

  const showSnackbar = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleGoToConfirm = () => {
    if (!selectedDate || !selectedTime) {
      showSnackbar('Selecione data e horário');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!pkg || !slot || !selectedDate || !selectedTime) return;
    setLoading(true);
    try {
      const endTime = calculateEndTime(selectedTime, slot.durationMinutes);
      const result = await createAppointment({
        clientName: pkg.clientName,
        clientId: pkg.clientId,
        serviceId: slot.serviceId,
        date: selectedDate,
        startTime: selectedTime,
        packageId: pkg.id,
      });
      if (!result.success) {
        showSnackbar(result.message);
        return;
      }
      await scheduleSlot(packageId, slotId, {
        date: selectedDate,
        startTime: selectedTime,
        endTime,
        appointmentId: result.data?.id,
      });
      showSnackbar('Horário agendado com sucesso!');
      setTimeout(() => navigation.goBack(), 1200);
    } finally {
      setLoading(false);
    }
  };

  if (!slot || !pkg) {
    return <ScreenContainer><LoadingState /></ScreenContainer>;
  }

  const endTime = selectedTime ? calculateEndTime(selectedTime, slot.durationMinutes) : '';
  const slotIndex = pkg.slots.findIndex(s => s.id === slotId);
  const slotLabel = `${slotIndex + 1}/${pkg.slots.length}`;

  return (
    <ScreenContainer>
      {/* Info do slot */}
      <View style={[styles.slotInfo, { backgroundColor: theme.colors.primaryContainer }]}>
        <View style={styles.slotInfoRow}>
          <Text style={[styles.slotService, { color: theme.colors.primary }]}>
            {slot.serviceName}
          </Text>
          <View style={[styles.slotBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.slotBadgeText}>{slotLabel}</Text>
          </View>
        </View>
        <Text style={[styles.slotMeta, { color: theme.colors.onPrimaryContainer }]}>
          {formatDuration(slot.durationMinutes)} · {pkg.clientName}
        </Text>
      </View>

      {step === 'datetime' && (
        <View style={styles.content}>
          {/* Picker de data */}
          <Text style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>Data</Text>
          <View style={[styles.pickerWrapper, { borderColor: theme.colors.outlineVariant }]}>
            <DateScrollPicker
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              settings={settings}
            />
          </View>

          {/* Slots de horário */}
          {selectedDate && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.colors.onBackground, marginTop: 16 }]}>
                Horário{' '}
                <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: '400', fontSize: 13 }}>
                  · {formatDateLong(selectedDate)}
                </Text>
              </Text>
              {timeSlots.length === 0 ? (
                <EmptyState
                  icon="clock-alert"
                  title="Sem horários disponíveis"
                  description="Tente outra data"
                />
              ) : (
                <TimeSlotPicker
                  slots={timeSlots}
                  selectedTime={selectedTime}
                  onSelectTime={handleTimeSelect}
                />
              )}
            </>
          )}

          <BigButton
            label="Confirmar Seleção"
            icon="arrow-right"
            onPress={handleGoToConfirm}
            disabled={!selectedDate || !selectedTime}
          />
        </View>
      )}

      {step === 'confirm' && (
        <View style={styles.content}>
          <Text style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>Confirmar</Text>
          <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface }]}>
            <ConfirmLine label="Cliente" value={pkg.clientName} theme={theme} />
            <ConfirmLine label="Serviço" value={`${slot.serviceName} (${slotLabel})`} theme={theme} />
            <ConfirmLine label="Data" value={formatDateLong(selectedDate!)} theme={theme} />
            <ConfirmLine label="Horário" value={`${selectedTime} – ${endTime}`} theme={theme} last />
          </View>
          <BigButton
            label="Agendar"
            icon="check"
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
          />
        </View>
      )}

      {step === 'confirm' ? (
        <BigButton
          label="Voltar"
          mode="text"
          icon="arrow-left"
          onPress={() => setStep('datetime')}
        />
      ) : (
        <BigButton label="Cancelar" mode="text" onPress={() => navigation.goBack()} />
      )}

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {snackbarMessage}
      </Snackbar>
    </ScreenContainer>
  );
};

// ---- Sub-componente linha de confirmação ----
const ConfirmLine: React.FC<{ label: string; value: string; theme: any; last?: boolean }> = ({
  label,
  value,
  theme,
  last,
}) => (
  <View style={[styles.confirmRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000015' }]}>
    <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  slotInfo: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  slotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotService: { fontSize: 18, fontWeight: '700', flex: 1 },
  slotBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slotBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  slotMeta: { fontSize: 13, marginTop: 4 },

  content: { flex: 1 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  // ---- Date picker ----
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  datePickerContent: {
    paddingHorizontal: 10,
  },
  dateCell: {
    width: CELL_WIDTH,
    alignItems: 'center',
  },
  dateCellWeekday: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateCellCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dateCellNum: {
    fontSize: 17,
    fontWeight: '700',
  },
  dateCellMonth: {
    fontSize: 10,
    fontWeight: '500',
  },

  // ---- Confirm ----
  confirmCard: {
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  confirmLabel: { fontSize: 13 },
  confirmValue: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
});
