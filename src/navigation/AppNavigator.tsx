// ============================================
// NAVEGAÇÃO DO APLICATIVO
// ============================================

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';
import {
  HomeScreen,
  ServicesScreen,
  CreateServiceScreen,
  ScheduleScreen,
  CreateScheduleScreen,
} from '../screens';
import { COLORS } from '../utils/constants';
import type { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: COLORS.primary,
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

export const AppNavigator: React.FC = () => {
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
    </Stack.Navigator>
  );
};
