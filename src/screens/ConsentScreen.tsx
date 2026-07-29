// ============================================
// TELA DE CONSENTIMENTO (LGPD) — primeira execução
// Exibida antes do app até que o usuário aceite os termos.
// ============================================

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Checkbox, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recordConsent } from '../services/consentService';

interface ConsentScreenProps {
  onAccept: () => void;
}

const POINTS = [
  'Os dados das suas clientes ficam apenas neste aparelho, em banco de dados criptografado.',
  'Você pode exportar todos os dados a qualquer momento (LGPD).',
  'Você pode excluir permanentemente uma cliente e todo o seu histórico.',
  'Ao cadastrar dados de clientes, você é o(a) responsável (controlador) por esse tratamento.',
];

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onAccept }) => {
  const theme = useTheme();
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    recordConsent();
    onAccept();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>💅</Text>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Bem-vinda ao Nails
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Antes de começar, veja como cuidamos dos dados:
        </Text>

        {POINTS.map(point => (
          <View key={point} style={styles.pointRow}>
            <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.pointText, { color: theme.colors.onBackground }]}>{point}</Text>
          </View>
        ))}

        <View style={styles.checkboxRow}>
          <Checkbox
            status={checked ? 'checked' : 'unchecked'}
            onPress={() => setChecked(c => !c)}
          />
          <Text
            style={[styles.checkboxLabel, { color: theme.colors.onBackground }]}
            onPress={() => setChecked(c => !c)}
          >
            Li e concordo com a Política de Privacidade
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="contained" onPress={handleAccept} disabled={!checked}>
          Começar
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 16 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', marginBottom: 24 },
  pointRow: { flexDirection: 'row', marginBottom: 14, paddingRight: 8 },
  bullet: { fontSize: 18, marginRight: 8, lineHeight: 22 },
  pointText: { flex: 1, fontSize: 14, lineHeight: 21 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkboxLabel: { flex: 1, fontSize: 14 },
  footer: { padding: 24, paddingTop: 8 },
});
