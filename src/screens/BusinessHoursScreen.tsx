// ============================================
// TELA DE HORÁRIOS POR DIA DA SEMANA
// Permite abrir/fechar cada dia (folga fixa) e definir início/fim.
// ============================================

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Switch, IconButton, Button, Divider, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, LoadingState } from '../components';
import { useSettings } from '../hooks';
import { buildWeeklyHours } from '../utils/helpers';
import type { RootStackParamList, WeeklyHours, DayHours } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'BusinessHours'>;

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const fmt = (h: number) => `${h.toString().padStart(2, '0')}:00`;

export const BusinessHoursScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { settings, loading, updateWeeklyHours } = useSettings();

  const [weekly, setWeekly] = useState<WeeklyHours | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    if (settings && !weekly) {
      setWeekly(settings.weeklyHours ?? buildWeeklyHours(settings.businessHours.start, settings.businessHours.end));
    }
  }, [settings, weekly]);

  if (loading || !weekly) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  const setDay = (day: number, patch: Partial<DayHours>) => {
    setWeekly(prev => (prev ? { ...prev, [day]: { ...prev[day], ...patch } } : prev));
  };

  const changeStart = (day: number, delta: number) => {
    const cfg = weekly[day];
    const next = Math.max(0, Math.min(cfg.end - 1, cfg.start + delta));
    setDay(day, { start: next });
  };

  const changeEnd = (day: number, delta: number) => {
    const cfg = weekly[day];
    const next = Math.max(cfg.start + 1, Math.min(23, cfg.end + delta));
    setDay(day, { end: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateWeeklyHours(weekly);
      setSnackbar(result.success ? 'Horários salvos!' : 'Erro ao salvar horários');
      if (result.success) setTimeout(() => navigation.goBack(), 900);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Defina o horário de cada dia. Dias desligados ficam fechados (folga fixa) e não
          aparecem para agendamento.
        </Text>

        {DAY_NAMES.map((dayName, day) => {
          const cfg = weekly[day];
          return (
            <View key={day}>
              <View style={styles.dayRow}>
                <Text style={[styles.dayName, { color: theme.colors.onBackground }]}>{dayName}</Text>
                <Switch value={cfg.open} onValueChange={v => setDay(day, { open: v })} />
              </View>

              {cfg.open && (
                <View style={styles.hoursRow}>
                  <View style={styles.stepper}>
                    <Text style={[styles.stepperLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Início
                    </Text>
                    <View style={styles.stepperControls}>
                      <IconButton icon="minus" size={18} onPress={() => changeStart(day, -1)} />
                      <Text style={[styles.hourText, { color: theme.colors.onSurface }]}>
                        {fmt(cfg.start)}
                      </Text>
                      <IconButton icon="plus" size={18} onPress={() => changeStart(day, 1)} />
                    </View>
                  </View>

                  <View style={styles.stepper}>
                    <Text style={[styles.stepperLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Fim
                    </Text>
                    <View style={styles.stepperControls}>
                      <IconButton icon="minus" size={18} onPress={() => changeEnd(day, -1)} />
                      <Text style={[styles.hourText, { color: theme.colors.onSurface }]}>
                        {fmt(cfg.end)}
                      </Text>
                      <IconButton icon="plus" size={18} onPress={() => changeEnd(day, 1)} />
                    </View>
                  </View>
                </View>
              )}

              <Divider />
            </View>
          );
        })}

        <Button
          mode="contained"
          icon="content-save"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Salvar horários
        </Button>
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={2500}>
        {snackbar}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dayName: { fontSize: 16, fontWeight: '600' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 8 },
  stepper: { alignItems: 'center' },
  stepperLabel: { fontSize: 12, marginBottom: 2 },
  stepperControls: { flexDirection: 'row', alignItems: 'center' },
  hourText: { fontSize: 16, fontWeight: '700', minWidth: 52, textAlign: 'center' },
  saveButton: { marginTop: 20, marginBottom: 20 },
});
