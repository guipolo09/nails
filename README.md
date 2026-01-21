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

### Integrações
- **Expo Calendar** - Sincronização com calendários nativos
- **Expo Notifications** - Suporte a notificações push

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
│   │   └── CreateScheduleScreen.tsx # Formulário de novo agendamento
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
│   │   └── calendarService.ts      # Integração com calendários nativos
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useServices.ts          # Gerenciamento de estado de serviços
│   │   └── useAppointments.ts      # Gerenciamento de agendamentos e calendário
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
- **Horário:** 8:00 - 18:00
- **Intervalos:** Slots de 30 minutos
- **Cálculo automático:** Horário de término baseado na duração do serviço

### Agendamentos
- Detecção automática de conflitos (evita dupla marcação)
- Validação de data (apenas hoje ou datas futuras)
- Nome do cliente obrigatório
- Duração definida pelo serviço selecionado

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

### TypeScript-First
- Modo strict habilitado
- Definições completas de interfaces
- DTOs para operações de criação/atualização
- Parâmetros de navegação type-safe

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

1. **Tela Inicial** → Escolher "Serviços" ou "Agendamentos"

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

## Tema e Cores

- **Cor Primária:** #E91E63 (Rosa - típico para apps de salão de beleza)
- **Cor Secundária:** #9C27B0 (Roxo)
- **Tema:** Material Design 3 (light)

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
