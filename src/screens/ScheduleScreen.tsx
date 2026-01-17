// ============================================
// TELA DE LISTAGEM DE AGENDAMENTOS
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, SectionList } from 'react-native';
import { FAB, Snackbar, Text, SegmentedButtons } from 'react-native-paper';
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
import { COLORS } from '../utils/constants';
import { formatDateLong } from '../utils/helpers';
import type { RootStackParamList, Appointment } from '../types';

type ScheduleNavigationProp = StackNavigationProp<RootStackParamList, 'Schedule'>;

type FilterType = 'all' | 'today' | 'upcoming';

interface AppointmentSection {
  title: string;
  data: Appointment[];
}

export const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<ScheduleNavigationProp>();
  const { appointments, loading, deleteAppointment, refresh } = useAppointments();

  // Recarrega os dados quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const today = dayjs().format('YYYY-MM-DD');

  const filteredAppointments = useMemo(() => {
    switch (filter) {
      case 'today':
        return appointments.filter(a => a.date === today);
      case 'upcoming':
        return appointments.filter(a => a.date >= today);
      default:
        return appointments;
    }
  }, [appointments, filter, today]);

  const sections = useMemo((): AppointmentSection[] => {
    const grouped: Record<string, Appointment[]> = {};

    filteredAppointments.forEach(appointment => {
      if (!grouped[appointment.date]) {
        grouped[appointment.date] = [];
      }
      grouped[appointment.date].push(appointment);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        title: date === today ? 'Hoje' : formatDateLong(date),
        data,
      }));
  }, [filteredAppointments, today]);

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
        <Text style={styles.title}>Agendamentos</Text>
        <Text style={styles.subtitle}>
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
          style={styles.segmentedButtons}
        />
      </View>

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
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <AppointmentCard
              appointment={item}
              onDelete={() => handleDeletePress(item)}
              showDate={false}
            />
          )}
          stickySectionHeadersEnabled={false}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
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
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  segmentedButtons: {
    backgroundColor: COLORS.surface,
  },
  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
  },
  snackbar: {
    marginBottom: 80,
  },
});
