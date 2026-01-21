// ============================================
// TELA PRINCIPAL (HOME)
// ============================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, BigButton } from '../components';
import { COLORS } from '../utils/constants';
import type { RootStackParamList } from '../types';

type HomeNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.logo}>Nails</Text>
        <Text style={styles.subtitle}>Agendamento Simples</Text>
      </View>

      <View style={styles.content}>
        <BigButton
          label="Agendamentos"
          icon="calendar-clock"
          onPress={() => navigation.navigate('Schedule')}
        />

        <BigButton
          label="Serviços"
          icon="nail"
          onPress={() => navigation.navigate('Services')}
          mode="outlined"
        />

        <BigButton
          label="Configurações"
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          mode="outlined"
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Toque em um botão para começar
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
