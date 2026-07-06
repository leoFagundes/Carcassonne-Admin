<p align="center">
  <img src="public/images/logo-gold-2.png" alt="Carcassonne Pub" width="140" />
</p>

<h1 align="center">Carcassonne Admin</h1>

<p align="center">
  Painel administrativo do <strong>Carcassonne Pub</strong> — gestão de reservas, cardápio, acervo de jogos e eventos, com uma área para os clientes.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
</p>

---

## Sobre o projeto

O **Carcassonne Admin** é o sistema de gestão usado no dia a dia do Carcassonne Pub, uma casa temática de jogos de tabuleiro. A aplicação é dividida em duas frentes:

- **Área administrativa** (`/myreserves`, `/collection`, `/menu`, `/eventos`, `/links`, `/carcassonne`...) — usada pela equipe para controlar reservas, o acervo de jogos, o cardápio, eventos (Quiz e Bolão), links do linktree e as configurações gerais do estabelecimento.
- **Área do cliente** (`/reserve`, `/clientMenu`, `/clientCollection`, `/linktree`, `/clientEventos`...) — usada pelos clientes para fazer reservas, consultar o cardápio e o acervo de jogos, sugerir músicas e participar dos eventos.

O próprio sistema conta com uma **Central de Ajuda** (`/ajuda`) com a documentação de todas as funcionalidades, pensada para orientar novos usuários da equipe.

## Funcionalidades

- 📅 **Reservas** — calendário de reservas (Carcarlendário), confirmação/cancelamento, atribuição de mesas, gestão de freelancers, impressão da lista do dia.
- 🎲 **Acervo de jogos** — cadastro de jogos com dificuldade, número de jogadores, destaque e disponibilidade para venda.
- 🍕 **Cardápio** — itens, combos, avisos, categorias reordenáveis e exportação em PDF.
- 🎵 **Recomendação de músicas** — sugestões enviadas pelos clientes em tempo real, com notificações.
- 🔗 **Linktree** — gerenciamento dos links exibidos aos clientes, com contagem de cliques.
- 🏆 **Eventos** — Quiz com pontuação e cronômetro, e Bolão de palpites, com placar e resultados ao vivo.
- ⚙️ **Configurações** — estatísticas de reservas, capacidade, horários, efeitos visuais do site e editor do mural decorativo.
- 🥚 **Easter egg** — uma curiosidade escondida na tela de login sobre a história do Carcassonne.

## Tecnologias

| Categoria      | Tecnologias                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | [Next.js](https://nextjs.org/) (App Router) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)                                                                                  |
| Estilo         | [Tailwind CSS](https://tailwindcss.com/), [HeroUI](https://www.heroui.com/), [Radix UI](https://www.radix-ui.com/)                                                                                         |
| Animações / UI | [Framer Motion](https://www.framer.com/motion/), [Lucide](https://lucide.dev/) / [react-icons](https://react-icons.github.io/react-icons/), [react-confetti](https://www.npmjs.com/package/react-confetti) |
| Dados          | [Firebase](https://firebase.google.com/) (Firestore + Auth + Storage) e [Firebase Admin](https://firebase.google.com/docs/admin/setup)                                                                     |
| Calendário     | [FullCalendar](https://fullcalendar.io/), [react-calendar](https://www.npmjs.com/package/react-calendar)                                                                                                   |
| Gráficos       | [Recharts](https://recharts.org/)                                                                                                                                                                          |
| E-mail         | [Resend](https://resend.com/) + [React Email](https://react.email/)                                                                                                                                        |
| PDF / imagem   | [html2pdf.js](https://www.npmjs.com/package/html2pdf.js), [html2canvas](https://html2canvas.hertzen.com/), [browser-image-compression](https://www.npmjs.com/package/browser-image-compression)            |

## Estrutura do projeto

```
src/
├── app/
│   ├── (admin)/        # Páginas protegidas da equipe (reservas, acervo, cardápio, eventos...)
│   ├── (client)/        # Páginas públicas para os clientes
│   ├── api/             # Rotas de API (envio de e-mail, proxy de imagem...)
│   └── ...              # Login, cadastro, regulamento
├── components/          # Componentes de UI e formulários compartilhados
├── contexts/            # Contextos React (alertas, PDF...)
├── services/
│   ├── firebaseConfig.js
│   └── repositories/    # Acesso aos dados do Firestore (um repositório por coleção)
├── utils/               # Funções utilitárias e valores padrão
└── types.ts             # Tipos TypeScript compartilhados
```

## Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- Um projeto no [Firebase](https://console.firebase.google.com/) com Firestore, Auth e Storage habilitados

### Passo a passo

```bash
# clone o repositório
git clone https://github.com/leoFagundes/Carcassonne-Admin.git
cd Carcassonne-Admin

# instale as dependências
npm install

# configure as variáveis de ambiente (veja a seção abaixo)
cp .env.example .env

# inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

| Variável                                   | Descrição                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Chave de API do Firebase                                                 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Domínio de autenticação do Firebase                                      |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | ID do projeto Firebase                                                   |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Bucket de storage do Firebase                                            |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Firebase Cloud Messaging                                    |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | ID do app no Firebase                                                    |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | ID do Google Analytics do Firebase                                       |
| `NEXT_PUBLIC_CREATION_TOKEN`               | Token exigido para criar novas contas de admin                           |
| `RESEND_API_KEY`                           | Chave de API do [Resend](https://resend.com/), usada no envio de e-mails |

## Scripts disponíveis

| Comando         | Descrição                                        |
| --------------- | ------------------------------------------------ |
| `npm run dev`   | Inicia o servidor de desenvolvimento (Turbopack) |
| `npm run build` | Gera a build de produção                         |
| `npm run start` | Inicia a aplicação já compilada                  |
| `npm run lint`  | Executa o ESLint                                 |

## Licença

Projeto privado, de uso interno do Carcassonne Pub.
