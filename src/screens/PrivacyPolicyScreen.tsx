// ============================================
// TELA DE POLÍTICA DE PRIVACIDADE (LGPD)
// ============================================

import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ScreenContainer } from '../components';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Quem somos',
    body:
      'O Nails é um aplicativo de agenda usado pelo salão/profissional para gerenciar ' +
      'clientes, serviços e agendamentos. O(a) proprietário(a) do salão é o(a) controlador(a) ' +
      'dos dados; o aplicativo é a ferramenta utilizada para esse gerenciamento.',
  },
  {
    title: '2. Dados que tratamos',
    body:
      'Dados de clientes cadastrados por você: nome, telefone (opcional), anotações ' +
      '(opcional) e histórico de agendamentos e pacotes. Não coletamos dados sem que ' +
      'você os cadastre.',
  },
  {
    title: '3. Onde os dados ficam',
    body:
      'Todos os dados são armazenados localmente no seu aparelho, em um banco de dados ' +
      'criptografado (SQLCipher). A chave de criptografia fica no armazenamento seguro do ' +
      'sistema (Keychain/Keystore) e não sai do dispositivo. Nesta versão não há envio para ' +
      'servidores nem para terceiros.',
  },
  {
    title: '4. Finalidade',
    body:
      'Os dados são usados exclusivamente para operar a agenda: criar e lembrar ' +
      'agendamentos, organizar clientes e serviços. Integrações opcionais (calendário do ' +
      'aparelho e notificações) usam apenas o necessário para essas funções, com sua permissão.',
  },
  {
    title: '5. Seus direitos (LGPD)',
    body:
      'Você pode exportar todos os dados a qualquer momento (formato JSON) e pode excluir ' +
      'permanentemente uma cliente com todo o seu histórico. A exclusão é irreversível.',
  },
  {
    title: '6. Segurança',
    body:
      'Além da criptografia do banco, o app oferece bloqueio por PIN e biometria para ' +
      'impedir acesso não autorizado ao aparelho. Recomendamos manter o bloqueio ativado.',
  },
  {
    title: '7. Responsabilidade do controlador',
    body:
      'Ao cadastrar dados de terceiros (suas clientes), você é responsável por ter base ' +
      'legal para esse tratamento e por atender solicitações das titulares, conforme a LGPD ' +
      '(Lei nº 13.709/2018).',
  },
];

export const PrivacyPolicyScreen: React.FC = () => {
  const theme = useTheme();
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Política de Privacidade
        </Text>
        {SECTIONS.map(section => (
          <React.Fragment key={section.title}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              {section.title}
            </Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              {section.body}
            </Text>
          </React.Fragment>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 16 },
  sectionTitle: { fontWeight: '600', marginTop: 16, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
});
