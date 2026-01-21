// ============================================
// TELA DE CONFIGURAÇÕES
// Permite configurar horários, slots, tema e feriados
// ============================================

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import {
  Text,
  List,
  Switch,
  Divider,
  Button,
  SegmentedButtons,
  Portal,
  Dialog,
  Chip,
} from 'react-native-paper';
import { ScreenContainer, LoadingState } from '../components';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../context/ThemeContext';
import type { TimeSlotInterval } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

export const SettingsScreen: React.FC = () => {
  const { settings, loading, updateBusinessHours, updateTimeSlotInterval, addHoliday, removeHoliday } = useSettings();
  const { themeMode, toggleTheme } = useTheme();

  // Estados locais para diálogos
  const [showStartTimeDialog, setShowStartTimeDialog] = useState(false);
  const [showEndTimeDialog, setShowEndTimeDialog] = useState(false);
  const [showHolidayPicker, setShowHolidayPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Estados para o time picker
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  if (loading || !settings) {
    return <LoadingState />;
  }

  // Inicializa os time pickers com os valores atuais
  const initStartTimePicker = () => {
    const date = new Date();
    date.setHours(settings.businessHours.start, 0, 0, 0);
    setTempStartTime(date);
    setShowStartTimeDialog(true);
  };

  const initEndTimePicker = () => {
    const date = new Date();
    date.setHours(settings.businessHours.end, 0, 0, 0);
    setTempEndTime(date);
    setShowEndTimeDialog(true);
  };

  const handleConfirmStartTime = async () => {
    const startHour = tempStartTime.getHours();
    const endHour = settings.businessHours.end;

    if (startHour >= endHour) {
      Alert.alert('Erro', 'Horário de início deve ser antes do horário de término');
      return;
    }

    const result = await updateBusinessHours(startHour, endHour);
    if (result.success) {
      setShowStartTimeDialog(false);
      Alert.alert('Sucesso', 'Horário de início atualizado!');
    } else {
      Alert.alert('Erro', result.error || 'Erro ao atualizar horário');
    }
  };

  const handleConfirmEndTime = async () => {
    const startHour = settings.businessHours.start;
    const endHour = tempEndTime.getHours();

    if (endHour <= startHour) {
      Alert.alert('Erro', 'Horário de término deve ser depois do horário de início');
      return;
    }

    const result = await updateBusinessHours(startHour, endHour);
    if (result.success) {
      setShowEndTimeDialog(false);
      Alert.alert('Sucesso', 'Horário de término atualizado!');
    } else {
      Alert.alert('Erro', result.error || 'Erro ao atualizar horário');
    }
  };

  const handleUpdateTimeSlot = async (interval: TimeSlotInterval) => {
    const result = await updateTimeSlotInterval(interval);
    if (result.success) {
      Alert.alert('Sucesso', 'Intervalo de slots atualizado!');
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowHolidayPicker(false);
    }

    if (date && event.type !== 'dismissed') {
      setSelectedDate(date);

      // No Android, adiciona o feriado automaticamente
      if (Platform.OS === 'android') {
        addHolidayDate(date);
      }
    }
  };

  const addHolidayDate = async (date: Date) => {
    const dateString = dayjs(date).format('YYYY-MM-DD');
    const result = await addHoliday(dateString);
    if (result.success) {
      Alert.alert('Sucesso', 'Feriado adicionado!');
    } else {
      Alert.alert('Erro', 'Erro ao adicionar feriado');
    }
  };

  const handleConfirmHoliday = () => {
    setShowHolidayPicker(false);
    addHolidayDate(selectedDate);
  };

  const handleRemoveHoliday = (date: string) => {
    Alert.alert(
      'Confirmar',
      'Deseja remover este feriado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const result = await removeHoliday(date);
            if (result.success) {
              Alert.alert('Sucesso', 'Feriado removido!');
            }
          },
        },
      ]
    );
  };

  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Configurações do Sistema
        </Text>

        {/* Horário de Funcionamento */}
        <List.Section>
          <List.Subheader>Horário de Funcionamento</List.Subheader>

          <List.Item
            title="Hora de Início"
            description={formatHour(settings.businessHours.start)}
            left={props => <List.Icon {...props} icon="clock-start" />}
            onPress={initStartTimePicker}
          />

          <List.Item
            title="Hora de Término"
            description={formatHour(settings.businessHours.end)}
            left={props => <List.Icon {...props} icon="clock-end" />}
            onPress={initEndTimePicker}
          />
        </List.Section>

        <Divider />

        {/* Intervalo de Slots */}
        <List.Section>
          <List.Subheader>Intervalo dos Slots de Tempo</List.Subheader>
          <View style={styles.segmentedContainer}>
            <SegmentedButtons
              value={settings.timeSlotInterval.toString()}
              onValueChange={(value) => handleUpdateTimeSlot(parseInt(value) as TimeSlotInterval)}
              buttons={[
                { value: '15', label: '15 min' },
                { value: '30', label: '30 min' },
                { value: '45', label: '45 min' },
                { value: '60', label: '1 hora' },
              ]}
            />
          </View>
        </List.Section>

        <Divider />

        {/* Tema */}
        <List.Section>
          <List.Subheader>Aparência</List.Subheader>
          <List.Item
            title="Modo Escuro"
            description={themeMode === 'dark' ? 'Ativado' : 'Desativado'}
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={themeMode === 'dark'}
                onValueChange={toggleTheme}
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* Feriados */}
        <List.Section>
          <List.Subheader>Feriados e Dias de Folga</List.Subheader>
          <View style={styles.holidaysContainer}>
            {settings.holidays.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum feriado cadastrado</Text>
            ) : (
              <View style={styles.chipsContainer}>
                {settings.holidays.map((holiday) => (
                  <Chip
                    key={holiday}
                    mode="outlined"
                    onClose={() => handleRemoveHoliday(holiday)}
                    style={styles.chip}
                  >
                    {dayjs(holiday).format('DD/MM/YYYY')}
                  </Chip>
                ))}
              </View>
            )}
            <Button
              mode="contained"
              icon="calendar-plus"
              onPress={() => setShowHolidayPicker(true)}
              style={styles.addButton}
            >
              Adicionar Feriado
            </Button>
          </View>
        </List.Section>
      </ScrollView>

      {/* Time Picker: Hora de Início */}
      {showStartTimeDialog && (
        <>
          <DateTimePicker
            value={tempStartTime}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (Platform.OS === 'android') {
                setShowStartTimeDialog(false);
                if (date && event.type !== 'dismissed') {
                  setTempStartTime(date);

                  // Validação e atualização para Android
                  const startHour = date.getHours();
                  const endHour = settings.businessHours.end;

                  if (startHour >= endHour) {
                    Alert.alert('Erro', 'Horário de início deve ser antes do horário de término');
                  } else {
                    updateBusinessHours(startHour, endHour).then((result) => {
                      if (result.success) {
                        Alert.alert('Sucesso', 'Horário de início atualizado!');
                      }
                    });
                  }
                }
              } else if (date) {
                setTempStartTime(date);
              }
            }}
          />

          {/* Dialog para iOS */}
          {Platform.OS === 'ios' && (
            <Portal>
              <Dialog visible={showStartTimeDialog} onDismiss={() => setShowStartTimeDialog(false)}>
                <Dialog.Title>Hora de Início</Dialog.Title>
                <Dialog.Content>
                  <Text style={styles.dialogText}>
                    Horário selecionado: {tempStartTime.getHours().toString().padStart(2, '0')}:00
                  </Text>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setShowStartTimeDialog(false)}>Cancelar</Button>
                  <Button onPress={handleConfirmStartTime}>Confirmar</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          )}
        </>
      )}

      {/* Time Picker: Hora de Término */}
      {showEndTimeDialog && (
        <>
          <DateTimePicker
            value={tempEndTime}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (Platform.OS === 'android') {
                setShowEndTimeDialog(false);
                if (date && event.type !== 'dismissed') {
                  setTempEndTime(date);

                  // Validação e atualização para Android
                  const startHour = settings.businessHours.start;
                  const endHour = date.getHours();

                  if (endHour <= startHour) {
                    Alert.alert('Erro', 'Horário de término deve ser depois do horário de início');
                  } else {
                    updateBusinessHours(startHour, endHour).then((result) => {
                      if (result.success) {
                        Alert.alert('Sucesso', 'Horário de término atualizado!');
                      }
                    });
                  }
                }
              } else if (date) {
                setTempEndTime(date);
              }
            }}
          />

          {/* Dialog para iOS */}
          {Platform.OS === 'ios' && (
            <Portal>
              <Dialog visible={showEndTimeDialog} onDismiss={() => setShowEndTimeDialog(false)}>
                <Dialog.Title>Hora de Término</Dialog.Title>
                <Dialog.Content>
                  <Text style={styles.dialogText}>
                    Horário selecionado: {tempEndTime.getHours().toString().padStart(2, '0')}:00
                  </Text>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setShowEndTimeDialog(false)}>Cancelar</Button>
                  <Button onPress={handleConfirmEndTime}>Confirmar</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          )}
        </>
      )}

      {/* Date Picker: Adicionar Feriado */}
      {showHolidayPicker && (
        <>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />

          {/* Dialog para iOS */}
          {Platform.OS === 'ios' && (
            <Portal>
              <Dialog visible={showHolidayPicker} onDismiss={() => setShowHolidayPicker(false)}>
                <Dialog.Title>Adicionar Feriado</Dialog.Title>
                <Dialog.Content>
                  <Text style={styles.dialogText}>
                    Data selecionada: {dayjs(selectedDate).format('DD/MM/YYYY')}
                  </Text>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setShowHolidayPicker(false)}>Cancelar</Button>
                  <Button onPress={handleConfirmHoliday}>Adicionar</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          )}
        </>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    fontWeight: '600',
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  holidaysContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
    marginBottom: 16,
  },
  addButton: {
    marginTop: 8,
  },
  dialogText: {
    marginBottom: 16,
    fontSize: 16,
  },
});
