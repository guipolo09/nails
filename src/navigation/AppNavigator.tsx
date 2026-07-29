// ============================================
// NAVEGAÇÃO DO APLICATIVO
// ============================================

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme as usePaperTheme } from 'react-native-paper';
import {
  HomeScreen,
  ServicesScreen,
  CreateServiceScreen,
  ScheduleScreen,
  CreateScheduleScreen,
  SettingsScreen,
  ClientsScreen,
  CreateClientScreen,
  PackagesScreen,
  CreatePackageScreen,
  PackageDetailScreen,
  SchedulePackageSlotScreen,
  SecurityScreen,
  PrivacyPolicyScreen,
  RescheduleScreen,
  AccountScreen,
  DashboardScreen,
  ProfessionalsScreen,
  BusinessHoursScreen,
  PaywallScreen,
} from '../screens';
import type { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const theme = usePaperTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.colors.primary,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontWeight: '600' as const,
      fontSize: 18,
    },
    headerBackTitleVisible: false,
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          title: 'Serviços',
        }}
      />

      <Stack.Screen
        name="CreateService"
        component={CreateServiceScreen}
        options={({ route }) => ({
          title: route.params?.serviceId ? 'Editar Serviço' : 'Novo Serviço',
        })}
      />

      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Agendamentos',
        }}
      />

      <Stack.Screen
        name="CreateSchedule"
        component={CreateScheduleScreen}
        options={{
          title: 'Novo Agendamento',
        }}
      />

      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Configurações',
        }}
      />

      <Stack.Screen
        name="Clients"
        component={ClientsScreen}
        options={{
          title: 'Clientes',
        }}
      />

      <Stack.Screen
        name="CreateClient"
        component={CreateClientScreen}
        options={({ route }) => ({
          title: route.params?.clientId ? 'Editar Cliente' : 'Nova Cliente',
        })}
      />

      <Stack.Screen
        name="Packages"
        component={PackagesScreen}
        options={{ title: 'Pacotes' }}
      />

      <Stack.Screen
        name="CreatePackage"
        component={CreatePackageScreen}
        options={{ title: 'Novo Pacote' }}
      />

      <Stack.Screen
        name="PackageDetail"
        component={PackageDetailScreen}
        options={{ title: 'Detalhes do Pacote' }}
      />

      <Stack.Screen
        name="SchedulePackageSlot"
        component={SchedulePackageSlotScreen}
        options={{ title: 'Agendar Horário' }}
      />

      <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ title: 'Segurança e Privacidade' }}
      />

      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Política de Privacidade' }}
      />

      <Stack.Screen
        name="Reschedule"
        component={RescheduleScreen}
        options={{ title: 'Remarcar Agendamento' }}
      />

      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Conta e Sincronização' }}
      />

      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Relatórios' }}
      />

      <Stack.Screen
        name="Professionals"
        component={ProfessionalsScreen}
        options={{ title: 'Profissionais' }}
      />

      <Stack.Screen
        name="BusinessHours"
        component={BusinessHoursScreen}
        options={{ title: 'Horários de Funcionamento' }}
      />

      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ title: 'Nails PRO' }}
      />
    </Stack.Navigator>
  );
};
