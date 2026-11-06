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
| `RESEND_API_KEY`                           | Chave de API do [Resend](https://resend.com/), usada no envio de e-mails |
| `FIREBASE_ADMIN_PROJECT_ID`                | `project_id` da conta de serviço (Admin SDK). Somente servidor           |
| `FIREBASE_ADMIN_CLIENT_EMAIL`              | `client_email` da conta de serviço. Somente servidor                     |
| `FIREBASE_ADMIN_PRIVATE_KEY`               | `private_key` da conta de serviço, entre aspas, com `\n`. Somente servidor |
| `SITE_URL`                                 | URL pública do site (ex.: `http://localhost:3000`). Somente servidor     |
| `MERCADOPAGO_ACCESS_TOKEN`                 | Token de acesso do Mercado Pago (`TEST-…` = teste, `APP_USR-…` = produção). Somente servidor |
| `MERCADOPAGO_WEBHOOK_SECRET`               | Assinatura secreta dos webhooks do Mercado Pago. Somente servidor        |
| `CRON_SECRET`                              | Segredo (opcional) que autoriza a rotina agendada de limpeza de reservas. Somente servidor |

> As variáveis `FIREBASE_ADMIN_*`, `SITE_URL`, `MERCADOPAGO_*` e `CRON_SECRET` são exclusivas do servidor: nunca use o prefixo `NEXT_PUBLIC_` nelas e nunca as commite.

## Scripts disponíveis

| Comando         | Descrição                                        |
| --------------- | ------------------------------------------------ |
| `npm run dev`   | Inicia o servidor de desenvolvimento (Turbopack) |
| `npm run build` | Gera a build de produção                         |
| `npm run start` | Inicia a aplicação já compilada                  |
| `npm run lint`  | Executa o ESLint                                 |
| `npm test`      | Executa os testes (Vitest)                       |

## Aluguel de jogos

Módulo de **aluguel de jogos de tabuleiro** para os clientes do pub: o cliente cria uma conta, escolhe jogos do acervo disponíveis para aluguel, monta o pedido, aceita as regras e acompanha tudo em "Minha conta". A equipe gerencia pedidos, retiradas, devoluções, prazos e bloqueio de clientes em `/aluguel-admin`. As operações sensíveis passam por rotas de API que usam o Firebase Admin SDK; o acervo público (`/clientCollection`) não é afetado.

### Rotas

| Área    | Rotas                                                                                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Cliente | `/aluguel`, `/aluguel/regras`, `/aluguel/entrar`, `/aluguel/cadastro`, `/aluguel/pedido`, `/aluguel/minha-conta`, `/conta/acao`        |
| Admin   | `/aluguel-admin` (aluguéis, clientes e regras), `/usuarios` (aprovação de administradores)                                             |
| API     | `/api/rental/*` (pedidos, perfil, cancelamento, retirada, devolução, prazo, bloqueio), `/api/auth/*` (e-mails de verificação e redefinição de senha) |

### Variáveis de ambiente

O módulo usa `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `SITE_URL` e `RESEND_API_KEY` (necessária para os e-mails de pedido e de conta), descritas na [tabela de variáveis](#variáveis-de-ambiente) acima. Todas são exclusivas do servidor.

### Testes

```bash
npm test
```

Executa a suíte do [Vitest](https://vitest.dev/) (regras de negócio do aluguel em `src/rental`).

### Regras de segurança

Os arquivos `firestore.rules` e `storage.rules`, na raiz do repositório, são a **fonte da verdade**. Para publicar, cole o conteúdo no console do Firebase (Firestore → Regras e Storage → Regras) e clique em **Publicar**.

> As regras **devem ser publicadas antes de existir qualquer dado de aluguel**. Elas impedem a leitura anônima de `rentals` e `rentalCustomers` e bloqueiam escrita direta do navegador nessas coleções.

### Primeira configuração

1. **Publique `firestore.rules` e `storage.rules` no console ANTES de fazer o deploy deste branch** (veja acima). Sem isso, `rentalCustomers` (CPF) e `rentals` ficam expostos pela regra antiga de leitura pública. As novas regras são compatíveis com o código atual de produção, então publicar primeiro é seguro.
2. Crie a chave da conta de serviço: Console do Firebase → Configurações do projeto → Contas de serviço → **Gerar nova chave privada**.
3. Copie `project_id`, `client_email` e `private_key` do JSON para `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY`, no `.env` local e no provedor de hospedagem (a chave privada entre aspas, com `\n`). Defina também `SITE_URL` e confirme que `RESEND_API_KEY` (já na [tabela de variáveis](#variáveis-de-ambiente)) está configurada, também no provedor de hospedagem. **Nunca** commite o JSON e apague-o depois de copiar os valores.
4. Em `/aluguel-admin` → **Regras**, configure e publique a página de regras e ative o serviço.

### Checklist de validação manual (dono)

- No Playground de regras do Firebase, confirme que a leitura anônima de `rentals/*` e `rentalCustomers/*` é **negada**.
- Entre com uma conta de cliente e confirme que ela não acessa as páginas do admin.
- Confirme que `/clientCollection` não exibe nada do aluguel.
- Faça um pedido de ponta a ponta: criar, retirar, alterar prazo, devolver e cancelar.

## Pagamento online (Mercado Pago)

Quando o admin liga **Pagamento online** em `/aluguel-admin` → **Regras**, todo pedido de aluguel passa a ser pago pelo site (Pix ou cartão, à vista; sem boleto) via Checkout Pro do [Mercado Pago](https://www.mercadopago.com.br/developers). As cópias ficam reservadas por 15–60 min (padrão 30) enquanto o cliente paga; o pedido só é confirmado depois que o servidor consulta o pagamento no Mercado Pago e confere pedido, valor e moeda. Desligado, tudo continua como antes (pagamento no balcão). O admin também escolhe a política de cancelamento (reembolso integral, com taxa ou análise manual); o passo a passo de uso está na Central de Ajuda (`/ajuda`, categoria Aluguel) e o desenho completo em `docs/superpowers/specs/2026-11-06-pagamento-online-design.md`.

### Variáveis de ambiente

`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SITE_URL` e `CRON_SECRET` (opcional) estão descritas na [tabela de variáveis](#variáveis-de-ambiente). O token `TEST-…` liga o **modo de teste**; `APP_USR-…` liga a **produção**. `SITE_URL` precisa ser uma URL pública (https) para o Mercado Pago conseguir avisar o servidor.

### Webhook (produção)

No painel de desenvolvedor do Mercado Pago → sua aplicação → **Webhooks**, cadastre:

- **URL:** `https://www.carcassonnepub.com.br/api/payments/mercadopago/webhook`
- **Evento:** `Pagamentos` (*Payments*, "legacy")
- Copie a **assinatura secreta** gerada para `MERCADOPAGO_WEBHOOK_SECRET`.

### Como testar no sandbox

1. **Credenciais de teste.** No painel do Mercado Pago, abra as credenciais de teste da aplicação e coloque no `.env` o `MERCADOPAGO_ACCESS_TOKEN` (começa com `TEST-`) e o `MERCADOPAGO_WEBHOOK_SECRET`.
2. **Túnel público.** O Mercado Pago não alcança o `localhost`. Em outro terminal, com o `npm run dev` rodando:
   Instale o [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) e rode:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   (o `ngrok http 3000` é uma alternativa). Ele imprime uma URL `https://….trycloudflare.com`.
3. **`SITE_URL`.** Coloque essa URL do túnel em `SITE_URL` no `.env` e **reinicie** o `npm run dev` (a variável só é lida na subida). A URL muda a cada vez que o túnel é reaberto.
4. **Webhook de teste.** No painel do Mercado Pago → Webhooks, em **URL de teste**, informe `<url-do-túnel>/api/payments/mercadopago/webhook`, evento `Pagamentos`, e use a assinatura secreta de teste no `.env`.
5. **Ligar.** Entre no admin → Aluguel → **Regras** → *Pagamento online*; a situação deve mostrar **Modo de teste**. Ligue **Exigir pagamento online nos pedidos** e escolha a política de cancelamento.
6. **Fazer um pedido** como cliente (acessando pela URL do túnel ou `localhost`), clicar em **Ir para o pagamento** e pagar com os cartões de teste abaixo. Entrar numa conta de comprador de teste é opcional; se o Mercado Pago reclamar que você está pagando para si mesmo ou pedir um e-mail do comprador, use o e-mail do usuário comprador de teste (crie o par vendedor/comprador no painel).
7. **Cartões de teste** (nome do titular define o resultado; use os números da página "Cartões de teste" na documentação do Checkout Pro, em Mercado Pago Developers, e qualquer CVV/validade futura):
   | Nome do titular | Resultado |
   | --------------- | --------- |
   | `APRO` | pagamento aprovado |
   | `OTHE` | recusado por erro geral |
   | `CONT` | pendente de pagamento |
8. **Expiração.** Deixe o pedido sem pagar até o fim da reserva (ou reduza *Tempo para pagar* para 15 min) e confira que o pedido vira *Pagamento expirado* e as cópias voltam ao catálogo. O cliente vê na hora *Pagamento expirado* na página do pedido (calculado a partir do prazo) e as cópias já ficam livres no catálogo. O que fica atrasado sem o cron abaixo é o status gravado: o pedido e o aluguel continuam como *Aguardando pagamento* no admin até a varredura rodar ou até o cliente tentar pagar de novo. Para forçar a varredura à mão, defina `CRON_SECRET` no `.env` (reinicie o `npm run dev`) e rode `curl -X POST <SITE_URL>/api/rental/payments/sweep -H "Authorization: Bearer <CRON_SECRET>"` (funciona também com `http://localhost:3000`). Abrir a rota no navegador não funciona: ele não envia o cabeçalho.
9. **Cancelamento e reembolso.** Com um pedido pago, teste o cancelamento em *Minha conta* com cada política (integral, com taxa, análise manual) e confira a mensagem mostrada antes de confirmar. No admin, abra o pedido (clique no código) e teste **Reembolsar** (valor parcial e total) e, na análise manual, **Aprovar reembolso** / **Recusar reembolso** na faixa *Reembolsos a decidir*.

### Rotina agendada (opcional)

`GET /api/rental/payments/sweep` marca como expirados os pedidos cujo prazo venceu. É opcional — a disponibilidade não depende dela —, mas deixa o admin e o histórico em dia. A rota aceita o cabeçalho `Authorization: Bearer $CRON_SECRET` (quando `CRON_SECRET` está definido; a Vercel o envia sozinha nos crons) ou o token de ID de um admin (usado pelo próprio app, não é algo que se faça pelo navegador). Exemplo de `vercel.json` (não incluído no repositório; decisão do dono):

```json
{
  "crons": [{ "path": "/api/rental/payments/sweep", "schedule": "*/15 * * * *" }]
}
```

## Licença

Projeto privado, de uso interno do Carcassonne Pub.
