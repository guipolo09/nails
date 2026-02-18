// ============================================
// TELA DE LISTAGEM DE AGENDAMENTOS
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, SectionList, Pressable } from 'react-native';
import { FAB, Snackbar, Text, SegmentedButtons, IconButton, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import dayjs from 'dayjs';
import {
  ScreenContainer,
  AppointmentCard,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from '../components';
import { useAppointments } from '../hooks';
import { formatDateLong } from '../utils/helpers';
import type { RootStackParamList, Appointment } from '../types';

type ScheduleNavigationProp = StackNavigationProp<RootStackParamList, 'Schedule'>;

type FilterType = 'all' | 'today' | 'upcoming';

interface AppSection {
  title: string;
  data: Appointment[];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Nomes completos para os chips de dia (aba Todos)
const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
// Abreviações para cabeçalhos de seção
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ---- Chip de dia no estilo da referência ----
const DayCell: React.FC<{
  date: string;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
}> = ({ date, isSelected, isToday, onPress }) => {
  const theme = useTheme();
  const d = dayjs(date);
  return (
    <Pressable onPress={onPress} style={styles.dayCell}>
      <View
        style={[
          styles.dayNumberCircle,
          isSelected && { backgroundColor: theme.colors.primary },
          !isSelected && isToday && { borderWidth: 1.5, borderColor: theme.colors.primary },
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            { color: isSelected ? '#FFFFFF' : isToday ? theme.colors.primary : theme.colors.onSurface },
          ]}
        >
          {d.date()}
        </Text>
      </View>
      <Text
        style={[
          styles.dayName,
          {
            color: isSelected
              ? theme.colors.primary
              : theme.colors.onSurfaceVariant,
          },
        ]}
        numberOfLines={1}
      >
        {DAY_NAMES[d.day()]}
      </Text>
    </Pressable>
  );
};

// ---- Tela principal ----
export const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<ScheduleNavigationProp>();
  const { appointments, loading, deleteAppointment, updateAttendanceStatus, refresh } = useAppointments();
  const theme = useTheme();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => dayjs().format('YYYY-MM-DD'));
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const today = dayjs().format('YYYY-MM-DD');

  // Semana atual com offset (domingo → sábado)
  const weekStart = useMemo(
    () => dayjs().startOf('week').add(weekOffset, 'week'),
    [weekOffset]
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day').format('YYYY-MM-DD')),
    [weekStart]
  );
  const weekLabel = `Semana de ${weekStart.format('DD/MM')} à ${weekStart.add(6, 'day').format('DD/MM')}`;

  const prevWeek = () => {
    setWeekOffset(w => w - 1);
    setSelectedDate(null);
  };

  const nextWeek = () => {
    setWeekOffset(w => w + 1);
    setSelectedDate(null);
  };

  const handleDayPress = (date: string) => {
    setSelectedDate(prev => (prev === date ? null : date));
  };

  const filteredAppointments = useMemo(() => {
    switch (filter) {
      case 'today':
        return appointments.filter(a => a.date === today);
      case 'upcoming':
        return appointments.filter(a => a.date >= today);
      case 'all': {
        const weekSet = new Set(weekDays);
        return appointments.filter(a =>
          selectedDate ? a.date === selectedDate : weekSet.has(a.date)
        );
      }
      default:
        return appointments;
    }
  }, [appointments, filter, today, weekDays, selectedDate]);

  const sections = useMemo((): AppSection[] => {
    const grouped: Record<string, Appointment[]> = {};
    filteredAppointments.forEach(a => {
      if (!grouped[a.date]) grouped[a.date] = [];
      grouped[a.date].push(a);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        let title: string;
        if (date === today) {
          title = 'Hoje';
        } else if (filter === 'all') {
          const d = dayjs(date);
          title = `${WEEKDAYS[d.day()]}, ${d.date()} de ${MONTH_NAMES[d.month()]}`;
        } else {
          title = formatDateLong(date);
        }
        return { title, data };
      });
  }, [filteredAppointments, today, filter]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleDeletePress = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (appointmentToDelete) {
      const result = await deleteAppointment(appointmentToDelete.id);
      showSnackbar(result.message);
    }
    setDeleteDialogVisible(false);
    setAppointmentToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogVisible(false);
    setAppointmentToDelete(null);
  };

  const handleConfirmAttendance = async (id: string) => {
    const result = await updateAttendanceStatus(id, 'confirmed');
    showSnackbar(result.message);
  };

  const handleMissedAttendance = async (id: string) => {
    const result = await updateAttendanceStatus(id, 'missed');
    showSnackbar(result.message);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padding={false} scroll={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Agendamentos
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {filteredAppointments.length} agendamento(s)
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={value => setFilter(value as FilterType)}
          buttons={[
            { value: 'today', label: 'Hoje' },
            { value: 'upcoming', label: 'Próximos' },
            { value: 'all', label: 'Todos' },
          ]}
          style={[styles.segmentedButtons, { backgroundColor: theme.colors.surface, borderRadius: 50 }]}
        />
      </View>

      {filter === 'all' && (
        <>
          {/* Navegação por semana */}
          <View style={[styles.weekNavigatorBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <IconButton
              icon="chevron-left"
              size={20}
              onPress={prevWeek}
              iconColor={theme.colors.primary}
            />
            <Text style={[styles.weekLabel, { color: theme.colors.onSurface }]}>
              {weekLabel}
            </Text>
            <IconButton
              icon="chevron-right"
              size={20}
              onPress={nextWeek}
              iconColor={theme.colors.primary}
            />
          </View>

          {/* Células de dias */}
          <View style={styles.daysRow}>
            {weekDays.map(date => (
              <DayCell
                key={date}
                date={date}
                isSelected={selectedDate === date}
                isToday={date === today}
                onPress={() => handleDayPress(date)}
              />
            ))}
          </View>
        </>
      )}

      {sections.length === 0 ? (
        <EmptyState
          icon="calendar-blank"
          title="Nenhum agendamento"
          description={
            filter === 'today'
              ? 'Não há agendamentos para hoje'
              : 'Adicione um novo agendamento tocando no botão +'
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `apt-${item.id}-${index}`}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                { color: theme.colors.primary, backgroundColor: theme.colors.background },
              ]}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <AppointmentCard
              appointment={item}
              onDelete={() => handleDeletePress(item)}
              onConfirm={() => handleConfirmAttendance(item.id)}
              onMissed={() => handleMissedAttendance(item.id)}
              showDate={false}
            />
          )}
          stickySectionHeadersEnabled={false}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateSchedule')}
        color="#FFFFFF"
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Cancelar Agendamento"
        message={`Deseja cancelar o agendamento de "${appointmentToDelete?.serviceName}" às ${appointmentToDelete?.startTime}?`}
        confirmLabel="Cancelar Agendamento"
        cancelLabel="Voltar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  segmentedButtons: {},

  // ---- Navegador de semana (estilo semana.png) ----
  weekNavigatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 2,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  // ---- Células de dias (estilo dia.png) ----
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  dayCell: {
    alignItems: 'center',
    width: 40,
  },
  dayNumberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayName: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },

  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  snackbar: {
    marginBottom: 80,
  },
});
