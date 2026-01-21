# Nails App

Aplicativo mobile de agendamento para salão de unhas, desenvolvido com React Native + Expo para iOS, Android e Web.

## Sobre o Projeto

O **Nails App** é uma solução completa para gerenciamento de agendamentos em salões de manicure/pedicure. O aplicativo permite que proprietários e funcionários de salões gerenciem serviços, agendem clientes e sincronizem automaticamente com calendários do dispositivo (Google Calendar, iCloud).

### Principais Funcionalidades

- Gerenciamento completo de serviços (criar, editar, excluir)
- Agendamento de clientes com detecção automática de conflitos
- Integração com calendários nativos (Google Calendar e iCloud)
- Filtros de visualização (hoje, próximos, todos os agendamentos)
- Lembretes automáticos 30 minutos antes do compromisso
- **Sistema de configurações personalizáveis:**
  - Horário de funcionamento customizável
  - Intervalos de slots ajustáveis (15, 30, 45 ou 60 minutos)
  - Modo escuro/claro
  - Cadastro de feriados e dias de folga
- Interface moderna com Material Design 3
- Suporte multiplataforma (iOS, Android, Web)

## Tech Stack

### Core
- **React** 19.1.0
- **React Native** 0.81.5
- **TypeScript** 5.9.2
- **Expo** ~54.0.31

### UI & Navigation
- **React Navigation** (v7) - Navegação entre telas
- **React Native Paper** (v5) - Componentes Material Design 3
- **React Native Gesture Handler** - Gestos e interações

### Data & Storage
- **AsyncStorage** - Armazenamento local persistente
- **dayjs** - Manipulação de datas
- **UUID** - Geração de identificadores únicos

### Integrações & Utilities
- **Expo Calendar** - Sincronização com calendários nativos
- **Expo Notifications** - Suporte a notificações push
- **@react-native-community/datetimepicker** - Seleção nativa de datas e horários (iOS/Android)

## Estrutura do Projeto

```
nails/
├── App.tsx                          # Componente principal com navegação
├── src/
│   ├── screens/                     # Telas da aplicação
│   │   ├── HomeScreen.tsx          # Tela inicial com menu principal
│   │   ├── ServicesScreen.tsx       # Listagem e gerenciamento de serviços
│   │   ├── CreateServiceScreen.tsx  # Formulário de criação/edição de serviços
│   │   ├── ScheduleScreen.tsx       # Listagem de agendamentos com filtros
│   │   ├── CreateScheduleScreen.tsx # Formulário de novo agendamento
│   │   └── SettingsScreen.tsx       # Tela de configurações do sistema
│   │
│   ├── components/                  # Componentes reutilizáveis
│   │   ├── BigButton.tsx           # Botões grandes para ações principais
│   │   ├── ScreenContainer.tsx      # Container base para telas
│   │   ├── ServiceCard.tsx         # Card de exibição de serviço
│   │   ├── AppointmentCard.tsx     # Card de exibição de agendamento
│   │   ├── TimeSlotPicker.tsx      # Seletor de horários
│   │   ├── ConfirmDialog.tsx       # Modal de confirmação
│   │   ├── EmptyState.tsx          # Estado vazio
│   │   └── LoadingState.tsx        # Indicador de carregamento
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Configuração de navegação em pilha
│   │
│   ├── services/                    # Lógica de negócio e acesso a dados
│   │   ├── serviceRepository.ts    # CRUD de serviços (AsyncStorage)
│   │   ├── appointmentRepository.ts # CRUD de agendamentos + detecção de conflitos
│   │   ├── settingsRepository.ts   # Gerenciamento de configurações do sistema
│   │   └── calendarService.ts      # Integração com calendários nativos
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useServices.ts          # Gerenciamento de estado de serviços
│   │   ├── useAppointments.ts      # Gerenciamento de agendamentos e calendário
│   │   └── useSettings.ts          # Gerenciamento de configurações do sistema
│   │
│   ├── context/                     # Context API
│   │   └── ThemeContext.tsx        # Gerenciamento de tema claro/escuro
│   │
│   ├── storage/
│   │   └── asyncStorage.ts         # Utilitários de AsyncStorage
│   │
│   ├── types/
│   │   └── index.ts                # Interfaces e tipos TypeScript
│   │
│   └── utils/
│       ├── constants.ts            # Constantes da aplicação
│       ├── helpers.ts              # Funções utilitárias
│       ├── theme.ts                # Configuração de tema Material Design 3
│       └── index.ts                # Exports
│
├── app.json                         # Configuração do Expo
├── package.json                     # Dependências e scripts
└── tsconfig.json                    # Configuração TypeScript
```

## Como Começar

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Para iOS: macOS com Xcode instalado
- Para Android: Android Studio com emulador configurado

### Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd nails
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o projeto:
```bash
npm start
```

### Executar em Plataformas Específicas

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## Regras de Negócio

### Horário de Funcionamento
- **Horário padrão:** 8:00 - 18:00 (configurável)
- **Intervalos:** 15, 30, 45 ou 60 minutos (configurável)
- **Cálculo automático:** Horário de término baseado na duração do serviço
- **Feriados:** Dias marcados como feriado bloqueiam agendamentos automaticamente

### Agendamentos
- Detecção automática de conflitos (evita dupla marcação)
- Validação de data (apenas hoje ou datas futuras)
- Nome do cliente obrigatório
- Duração definida pelo serviço selecionado
- Horários respeitam as configurações personalizadas do sistema
- Feriados cadastrados bloqueiam completamente o dia

### Armazenamento
- Dados armazenados localmente no dispositivo
- Persistência via AsyncStorage
- Registros com timestamp (criação/atualização)
- Arquitetura preparada para integração com API REST

## Padrões Técnicos Utilizados

### Repository Pattern
- Abstração de acesso a dados para serviços e agendamentos
- Preparado para fácil integração com API
- Classes `LocalServiceRepository` e `LocalAppointmentRepository`

### Custom Hooks
- `useServices()` - Gerencia estado e operações de serviços
- `useAppointments()` - Gerencia agendamentos, conflitos e sincronização de calendário
- `useSettings()` - Gerencia configurações do sistema (horários, slots, tema, feriados)

### TypeScript-First
- Modo strict habilitado
- Definições completas de interfaces
- DTOs para operações de criação/atualização
- Parâmetros de navegação type-safe

## Módulo de Configurações

O aplicativo possui um sistema completo de configurações personalizáveis que permite adaptar o funcionamento do salão às necessidades específicas.

### Funcionalidades de Configuração

#### 1. Horário de Funcionamento Personalizável
- Interface com **time picker nativo** (estilo alarme)
- Configuração separada para:
  - **Hora de Início:** Define quando o salão abre
  - **Hora de Término:** Define quando o salão fecha
- **Validação inteligente:** Impede horário de início posterior ao de término
- **Plataforma específica:**
  - iOS: Picker estilo spinner com diálogo de confirmação
  - Android: Picker nativo com aplicação imediata
- Horários aplicam-se automaticamente a todos os agendamentos

#### 2. Intervalos de Slots Configuráveis
- **Opções disponíveis:**
  - 15 minutos
  - 30 minutos (padrão)
  - 45 minutos
  - 1 hora
- **Interface:** Botões segmentados para seleção rápida
- **Aplicação imediata:** Novos agendamentos usam o intervalo configurado
- **Preserva agendamentos existentes:** Mudanças não afetam agendamentos já marcados

#### 3. Tema Claro/Escuro
- **Switch simples** para alternar entre temas
- **Persistente:** Configuração salva e carregada automaticamente
- **Adaptação completa:**
  - Background, superfícies e textos
  - Cards e componentes
  - Headers de navegação
  - Ícones e bordas
- **Material Design 3:** Cores e elevações otimizadas para ambos os modos

#### 4. Cadastro de Feriados
- **Seleção via calendário nativo**
- **Diferenças por plataforma:**
  - **Android:** Seleção e cadastro automático ao escolher data
  - **iOS:** Diálogo com prévia da data e botão de confirmação
- **Visualização:** Chips organizados com data formatada (DD/MM/YYYY)
- **Remoção:** Toque no X do chip com confirmação
- **Bloqueio automático:**
  - Feriados não aparecem como opções de agendamento
  - Tela de seleção exibe aviso "(Feriado)" e desabilita o botão
  - Mensagem "Sem atendimento neste dia"
- **Validação:** Apenas datas futuras podem ser cadastradas

### Arquitetura das Configurações

#### Repository Pattern
```typescript
LocalSettingsRepository
├── getSettings() - Carrega configurações ou retorna padrões
├── updateSettings() - Atualiza configurações específicas
├── addHoliday() - Adiciona feriado com verificação de duplicatas
├── removeHoliday() - Remove feriado específico
├── isHoliday() - Verifica se data é feriado
└── resetToDefaults() - Restaura configurações de fábrica
```

#### Custom Hook
```typescript
useSettings()
├── settings - Estado atual das configurações
├── loading - Estado de carregamento
├── error - Mensagens de erro
├── updateBusinessHours() - Atualiza horários com validação
├── updateTimeSlotInterval() - Atualiza intervalo de slots
├── updateTheme() - Altera tema
├── addHoliday() - Adiciona feriado
├── removeHoliday() - Remove feriado
├── isHoliday() - Verifica feriado
└── resetToDefaults() - Reset completo
```

#### Theme Context
```typescript
ThemeContext
├── theme - Tema atual (light/dark)
├── themeMode - Modo atual ('light' | 'dark')
├── toggleTheme() - Alterna entre temas
└── setThemeMode() - Define tema específico
```

### Configurações Padrão

```typescript
{
  businessHours: {
    start: 8,  // 8:00
    end: 18    // 18:00
  },
  timeSlotInterval: 30,  // 30 minutos
  theme: 'light',
  holidays: []
}
```

### Persistência

- **Armazenamento:** AsyncStorage local
- **Chave:** `@nails/settings`
- **Formato:** JSON serializado
- **Timestamps:** `createdAt` e `updatedAt` para auditoria
- **Fallback:** Retorna configurações padrão em caso de erro

### Integração com Agendamentos

As configurações afetam diretamente o sistema de agendamentos:

1. **Geração de Slots:** Função `generateTimeSlotsWithSettings()` usa configurações dinâmicas
2. **Horários Disponíveis:** Baseados em `businessHours.start` e `businessHours.end`
3. **Intervalos:** Respeitam `timeSlotInterval` configurado
4. **Feriados:** Datas em `holidays[]` retornam slots vazios (bloqueio automático)
5. **Validação:** Impede agendamentos fora do horário ou em feriados

## Integrações

### Calendário Nativo
- Seleção automática de calendário por plataforma:
  - **iOS:** Calendário padrão/iCloud
  - **Android:** Google Calendar
- Gerenciamento de permissões
- Criação automática de eventos com lembretes de 30 minutos
- Exclusão de eventos ao cancelar agendamento

### Permissões Necessárias

**Android:**
- `READ_CALENDAR`
- `WRITE_CALENDAR`

**iOS:**
- Descrição de acesso ao calendário configurada no app.json

## Fluxo do Usuário

1. **Tela Inicial** → Escolher "Agendamentos", "Serviços" ou "Configurações"

2. **Fluxo de Serviços:**
   - Visualizar todos os serviços
   - Criar novo serviço
   - Editar serviço existente
   - Excluir serviço

3. **Fluxo de Agendamentos:**
   - Visualizar agendamentos (filtrado por: hoje/próximos/todos)
   - Criar novo agendamento:
     - Nome do cliente → Serviço → Data → Horário → Confirmar
   - Evento de calendário criado automaticamente
   - Excluir agendamento com confirmação
   - Sistema respeita horários configurados e bloqueia feriados

4. **Fluxo de Configurações:**
   - **Horário de Funcionamento:**
     - Ajustar hora de início (time picker nativo)
     - Ajustar hora de término (time picker nativo)
     - Validação automática (início < término)
   - **Intervalo dos Slots:**
     - Escolher entre 15, 30, 45 ou 60 minutos
     - Atualização imediata nos agendamentos
   - **Modo Escuro:**
     - Ativar/desativar tema escuro
     - Cores adaptadas automaticamente em toda a interface
   - **Feriados:**
     - Adicionar feriados via calendário nativo
     - Visualizar feriados cadastrados
     - Remover feriados com confirmação
     - Agendamentos bloqueados automaticamente em feriados

## Tema e Cores

- **Cor Primária:** #E91E63 (Rosa - típico para apps de salão de beleza)
- **Cor Secundária:** #9C27B0 (Roxo)
- **Temas:** Material Design 3 com suporte a modo claro e escuro

### Tema Claro
- Background: #FAFAFA
- Surface: #FFFFFF
- Text: #212121

### Tema Escuro
- Background: #121212
- Surface: #1E1E1E
- Text: #E0E0E0
- Elevações com diferentes níveis de cinza para profundidade visual

## Scripts Disponíveis

```bash
npm start      # Inicia o servidor de desenvolvimento Expo
npm run android # Executa no Android
npm run ios    # Executa no iOS
npm run web    # Executa no navegador
```

## Futuras Melhorias Planejadas

- [ ] Integração com API REST (backend)
- [ ] Autenticação de usuários
- [ ] Notificações push para lembretes
- [ ] Dashboard com estatísticas
- [ ] Gestão de múltiplos profissionais
- [ ] Sistema de pagamentos
- [ ] Histórico de clientes
- [ ] Exportação de relatórios

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.

## Contato

Para dúvidas ou sugestões sobre o projeto, abra uma issue no repositório.

---

Desenvolvido com React Native + Expo
