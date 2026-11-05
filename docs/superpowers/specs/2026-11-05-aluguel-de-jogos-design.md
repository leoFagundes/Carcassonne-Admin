# Aluguel de jogos — Design

**Data:** 2026-11-05
**Base:** especificação do cliente ("Requisitos para o desenvolvimento do sistema de aluguel de jogos – Carcassonne Pub").

Legenda: itens marcados **[decisão do dev]** foram escolhas de quem escreveu este documento, não do cliente. Itens marcados **[confirmar]** ainda dependem do cliente.

---

## 1. Intenção

O Carcassonne Pub passa a alugar jogos de tabuleiro de um **acervo próprio para aluguel**, separado do acervo usado no pub. O cliente se cadastra, escolhe os jogos e a data de retirada, e o aluguel é **confirmado na hora, sem aprovação manual**, desde que haja unidade livre para o período. A administração controla o estoque por unidade, registra retiradas e devoluções e mantém uma página de regras.

**Sucesso:**
- Nenhum jogo é alugado duas vezes para o mesmo período (nem com dois clientes clicando ao mesmo tempo).
- O cliente sabe, sem perguntar, se o jogo está disponível e, se não estiver, quando volta.
- Retiradas e devoluções do dia são visíveis e registradas com dois toques.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos (v1):**
- Catálogo público de aluguel com preço, disponibilidade e previsão de retorno.
- Cadastro e login de clientes do aluguel, separados dos admins.
- Pedido com vários jogos, data de retirada escolhida, confirmação automática.
- Área "Meus aluguéis" do cliente.
- Admin: jogos (cadastro, unidades, ativar/inativar), aluguéis (retirada, devolução, cancelamento, atrasos), clientes e regras.
- Página de regras editável, com aceite registrado em cada pedido.
- E-mails próprios (Resend): confirmação do pedido, verificação de e-mail e redefinição de senha no visual do pub.

**Não-objetivos (v1):**
- Pagamento online. O pagamento é feito no balcão, na retirada (seção 9).
- Renovação/extensão de prazo pelo site (o admin pode ajustar a data de devolução manualmente).
- Cálculo automático de multa por atraso (o sistema mostra os dias de atraso; o valor segue as regras).
- Lembretes automáticos por e-mail antes do vencimento (precisam de tarefa agendada — fica para depois).
- Entrega em domicílio.

**Anti-objetivos (seria fracasso mesmo "funcionando"):**
- Dados pessoais dos clientes (nome, telefone, e-mail) legíveis publicamente — hoje o curinga das regras libera leitura de tudo.
- Conta de cliente com qualquer poder de admin.
- Disponibilidade decidida no navegador do cliente (dá para burlar e gerar reserva dupla).
- Misturar com o acervo do pub: nada do aluguel aparece em `/clientCollection` e vice-versa.

## 3. Restrições e contexto do projeto

- Next.js 16 (App Router), Firebase (Auth, Firestore, Storage), Tailwind, Resend + react-email, `firebase-admin` já instalado (sem uso até agora).
- Admin = conta com documento em `admins/{uid}` (feito em 2026-11-05). Regras usam `isAdmin()`.
- Fuso: **America/Sao_Paulo**. Datas de retirada/devolução são **datas sem hora**, guardadas como `"YYYY-MM-DD"` para evitar erro de fuso.
- O servidor precisa de uma **conta de serviço do Firebase** (variáveis de ambiente só no servidor). Sem isso, não há como garantir a não-duplicidade das reservas. O dono do projeto cria a conta de serviço na etapa 1 (passo a passo entregue na hora).

## 4. Como funciona para o cliente

### 4.1 Catálogo — `/aluguel`
- Mesmo modelo visual do acervo (`GameCard`/`GameDetail` e componentes `showcase/*`): grade/lista, busca, filtros por tipo e jogadores.
- Cada card mostra **preço** e **selo de disponibilidade**:
  - `Disponível` (verde) — há unidade livre a partir de hoje.
  - `Volta em 3 dias` / `Volta em 12/11` (âmbar) — todas as unidades ocupadas; mostra a data mais próxima em que uma unidade fica livre.
  - `Retorno atrasado` (vermelho discreto) — todas ocupadas e a mais próxima já passou do prazo; sem previsão.
  - `Indisponível` — nenhuma unidade ativa (todas em manutenção).
- Detalhe do jogo: descrição completa como no acervo + preço, prazo ("7 dias"), quantidade de unidades e botão **Adicionar ao pedido**.
- Jogos **inativos não aparecem** no catálogo. **[decisão do dev]** (a especificação diz que não devem aparecer como disponíveis; esconder evita confusão.)
- A disponibilidade atualiza em tempo real (onSnapshot), sem recarregar.

### 4.2 Cálculo da disponibilidade
- Cada jogo tem `rentalDays` (prazo) e N unidades.
- Um aluguel ocupa uma unidade de `startDate` (retirada) até `dueDate = startDate + rentalDays`.
- Exemplo da especificação: prazo 7 dias, retirado há 4 → `dueDate − hoje = 3` → "volta em 3 dias".
- Aluguel `retirado` e já vencido continua ocupando a unidade até a devolução ser registrada (fim efetivo = max(dueDate, hoje)).
- **Folga de um dia entre aluguéis:** uma nova reserva da mesma unidade só pode começar **no dia seguinte** ao `dueDate` da anterior (a devolução pode acontecer no fim do dia; o jogo precisa ser conferido). O selo do catálogo continua mostrando a data de devolução ("volta em 3 dias"), e o seletor de data do pedido mostra "disponível a partir de dd/mm" já com a folga. **[decisão do dev]**
- Quando a devolução é registrada, a reserva sai de `bookings` e a unidade fica livre na hora (inclusive para retirada no mesmo dia, se o admin quiser).
- Retirada no próprio dia é permitida.
- Unidade marcada `indisponível` (manutenção/perdida) não conta.
- Toda essa lógica fica num módulo puro (sem Firebase/React), usado igual no navegador (exibição) e no servidor (decisão), com testes automatizados. O projeto não tem framework de testes; adicionar **Vitest** só para esse módulo. **[decisão do dev]**

### 4.3 Cadastro e login — `/aluguel/cadastro`, `/aluguel/entrar`
- Firebase Auth com e-mail e senha, **mesmo projeto**, mas sem documento em `admins` → sem nenhum acesso ao admin.
- Campos do cadastro: nome completo, WhatsApp, CPF, e-mail, senha — ver seção 9.
- O perfil (nome, WhatsApp, CPF) é salvo por uma rota do servidor (`POST /api/rental/profile`), que valida os dados e garante um CPF por conta.
- Precisa confirmar o e-mail antes de fazer o primeiro pedido.
- Aceite dos termos de uso/privacidade no cadastro (texto curto + link para as regras).
- "Esqueci minha senha" na tela de login.
- Perfil em `rentalCustomers/{uid}`; o cliente pode editar nome e WhatsApp em "Minha conta".

### 4.4 Pedido — carrinho → `/aluguel/pedido`
1. Cliente adiciona jogos ao pedido (carrinho guardado no navegador).
2. Escolhe a **data de retirada**: de hoje até `maxAdvanceDays` (padrão 30) à frente, só nos dias de retirada configurados (seção 9).
3. Para a data escolhida, cada jogo mostra "disponível" ou "disponível a partir de dd/mm" (com atalho para trocar a data).
4. Resumo: jogos, preço de cada um, data de devolução de cada um (prazos podem ser diferentes), total, forma de pagamento "no balcão, na retirada".
5. Checkbox obrigatório: "Li e aceito as regras do aluguel" (link abre a página de regras).
6. Confirmar → servidor valida e reserva tudo **ou nada** (se um jogo ficou indisponível nesse meio-tempo, nada é reservado e o cliente vê qual jogo falhou).
7. Tela de sucesso + e-mail de confirmação com código do pedido, jogos, datas, endereço e horários de retirada.

Limites **[decisão do dev]**: no máximo `maxGamesPerOrder` (padrão 3) jogos por pedido e `maxActiveGamesPerCustomer` (padrão 3) jogos ativos (reservados + retirados) por cliente. Configuráveis no admin.

### 4.5 Meus aluguéis — `/aluguel/minha-conta`
- Pedidos com status por jogo: Reservado (retirar em dd/mm), Retirado (devolver até dd/mm · faltam X dias), Atrasado (X dias de atraso), Devolvido, Cancelado.
- Cancelar: permitido pelo cliente enquanto o jogo está `reservado` (antes da retirada). **[decisão do dev]**

### 4.6 Regras — `/aluguel/regras`
- Página pública, com seções editáveis pelo admin (título + texto; texto aceita `**negrito**` e quebras de linha, como o editor de e-mail de reserva).
- Vem pré-preenchida com as seções da especificação: prazos e períodos; retirada e devolução (datas e horários); atraso; pagamento; danos; perda de peças; furto ou extravio; demais condições.
- Cada pedido guarda a **versão** das regras aceita (`rulesVersion`, incrementada a cada publicação).

## 5. Como funciona para o admin — item "Aluguel" na sidebar (`/aluguel-admin`)

Abas:

**Aluguéis (padrão)**
- Faixas no topo: **Retiradas de hoje**, **Devoluções de hoje**, **Atrasados**, **Não retirados** (data de retirada passou e continua `reservado`).
- Lista filtrável por status/cliente/jogo/data.
- Ações por aluguel:
  - **Registrar retirada** → `retirado` (grava data/hora e quem registrou).
  - **Registrar devolução** → `devolvido`, com estado: OK / Com avaria / Peça faltando + observação. Se não for OK, oferece marcar a unidade como indisponível.
  - **Alterar data de devolução** (extensão negociada no balcão).
  - **Cancelar** (com motivo).
- Badge na sidebar com retiradas + devoluções de hoje + atrasados.

**Jogos (estoque)**
- Mesmo padrão da página Coleção (`adminCatalog`): busca, filtros (ativos/inativos/esgotados), grade/lista.
- Cadastro/edição: nome, descrição, imagem, dificuldade, jogadores, duração, tipos (mesmos campos do acervo), **preço** (R$), **prazo em dias**, **ativo**.
- **Importar do acervo do pub** (opcional no formulário): copia nome/descrição/imagem/etc. de um jogo existente para não redigitar; depois disso são independentes. **[decisão do dev]**
- Unidades: lista de cópias (rótulo ex. "Cópia 1", status `ativa`/`indisponível`, observação). Cada unidade mostra: livre / reservada / alugada (até dd/mm) / atrasada / indisponível.
- Totais no topo: unidades totais, livres, alugadas, indisponíveis.
- Não deixa excluir unidade ou jogo com aluguel em aberto.

**Clientes**
- Lista com nome, e-mail, WhatsApp (link wa.me), nº de aluguéis, aluguéis em aberto, atrasos.
- Detalhe com histórico.
- Bloquear cliente (não consegue fazer novos pedidos), com motivo. **[decisão do dev]**

**Regras e configurações**
- Editor das seções de regras (adicionar, reordenar, editar, remover) + publicar.
- Configurações: serviço ativo/desativado (quando desativado, `/aluguel` mostra "em breve"), dias da semana de retirada, `maxAdvanceDays`, `maxGamesPerOrder`, `maxActiveGamesPerCustomer`, exigir CPF, e-mail da equipe para receber cópia dos pedidos (opcional).

## 6. Modelo de dados (Firestore)

```
rentalGames/{gameId}                    público p/ leitura
  name, description, image, difficulty, minPlayers, maxPlayers, playTime, types[]
  price: number            // centavos
  rentalDays: number
  isActive: boolean
  units: [{ id, label, status: "active" | "unavailable", note? }]
  bookings: [{ rentalId, unitId, startDate, dueDate, status: "reserved" | "picked_up" }]
      // só aluguéis em aberto, SEM dados do cliente — é daqui que o catálogo
      // calcula disponibilidade. Mantido apenas pelo servidor.
  createdAt, updatedAt

rentals/{rentalId}                      privado (dono + admin)
  orderId, code               // code = código curto mostrado ao cliente/balcão
  customerUid, customer: { name, email, phone }   // cópia no momento do pedido
  gameId, gameName, unitId, unitLabel
  price, rentalDays
  startDate, dueDate          // "YYYY-MM-DD"
  status: "reserved" | "picked_up" | "returned" | "canceled"
  pickedUpAt?, pickedUpBy?, returnedAt?, returnedBy?
  returnCondition?: "ok" | "damaged" | "missing_parts", returnNote?
  canceledAt?, canceledBy?: "customer" | "admin", cancelReason?
  rulesVersion, createdAt

rentalCustomers/{uid}                   privado (dono + admin)
  name, phone, cpf, email, isBlocked?, blockedReason?, acceptedTermsAt, createdAt

rentalCpfIndex/{cpf}                    privado (só servidor/admin)
  uid

rental-config/settings                  público p/ leitura
  isEnabled, pickupWeekdays[], maxAdvanceDays, maxGamesPerOrder,
  maxActiveGamesPerCustomer, requireCpf, staffEmail?

rental-config/rules                     público p/ leitura
  sections: [{ id, title, body }], version, updatedAt
```

Um documento em `rentals` por **jogo** (unidade); jogos do mesmo checkout compartilham `orderId`. Assim cada jogo tem seu próprio prazo, retirada e devolução. **[decisão do dev]**

## 7. Servidor (rotas `/api/rental/*`, Firebase Admin SDK)

Toda mudança em `rentals` e em `rentalGames.bookings` passa pelo servidor, dentro de **transação** do Firestore. O navegador nunca escreve nessas coleções.

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/rental/orders` | cliente logado, e-mail verificado, não bloqueado | valida limites, data e regras; na transação lê os jogos, escolhe unidade livre para cada um, cria os `rentals`, atualiza `bookings`; envia e-mail de confirmação |
| `POST /api/rental/profile` | conta logada | cria/atualiza nome, WhatsApp e CPF (valida CPF e unicidade via `rentalCpfIndex`) |
| `POST /api/rental/customers/:uid/block` | admin | bloqueia/desbloqueia cliente, com motivo |
| `POST /api/rental/rentals/:id/cancel` | dono (se `reserved`) ou admin | cancela e libera a unidade |
| `POST /api/rental/rentals/:id/pickup` | admin | marca retirado |
| `POST /api/rental/rentals/:id/return` | admin | marca devolvido + estado; opcionalmente marca unidade indisponível |
| `POST /api/rental/rentals/:id/due-date` | admin | altera `dueDate` (verifica conflito com a próxima reserva da mesma unidade) |
| `POST /api/auth/send-verification` | conta logada | gera link (Admin SDK) e envia e-mail próprio |
| `POST /api/auth/send-password-reset` | público | gera link e envia e-mail próprio; resposta sempre igual (não revela se o e-mail existe) |

- Autenticação: `Authorization: Bearer <ID token>` verificado com `verifyIdToken`; admin = existe `admins/{uid}`.
- Escolha de unidade: a unidade livre que fica ociosa por menos tempo (encaixe mais justo), para preservar janelas longas. **[decisão do dev]**
- Credenciais: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (sem `NEXT_PUBLIC_`).
- E-mails pelo Resend a partir de `@carcassonnepub.com.br` (domínio já verificado), templates react-email no estilo do e-mail de reserva.
- Links dos e-mails de verificação/redefinição: o servidor gera o link com o Admin SDK, extrai o `oobCode` e monta um link para uma página do próprio site, `/conta/acao?mode=...&oobCode=...`, que conclui a ação com o SDK do cliente (`applyActionCode` / `verifyPasswordResetCode` + `confirmPasswordReset`). Não exige mudar a "URL de ação" no console do Firebase. O `/signup` e o "Esqueci minha senha" do admin passam a usar as mesmas rotas, e a página de ação devolve cada um para o login certo (admin ou aluguel) via parâmetro `from`. **[decisão do dev]**
- `send-password-reset` tem limite simples por e-mail (ex.: 1 envio a cada 60 s, registrado em Firestore pelo servidor) para não virar disparador de spam. **[decisão do dev]**

## 8. Regras de segurança (resumo)

- `rentalGames`, `rental-config/*`: leitura pública; escrita só admin. `bookings` só é alterado pelo servidor (Admin SDK ignora as regras); a regra de escrita do admin **bloqueia** mudança no campo `bookings` vinda do navegador (no `create`, `bookings` tem que ser `[]`). Remover unidade com reserva em aberto é barrado na interface (a regra não consegue cruzar `units` com `bookings`).
- `rentals`: leitura pelo dono (`customerUid == auth.uid`) ou admin; nenhuma escrita pelo navegador.
- `rentalCustomers/{uid}`: o dono e o admin leem; nenhuma escrita pelo navegador (perfil salvo por `POST /api/rental/profile`; bloqueio pelo admin via servidor também).
- `rentalCpfIndex`: sem acesso pelo navegador.
- O curinga de leitura pública passa a excluir `admins`, `adminRequests`, `rentals`, `rentalCustomers`, `rentalCpfIndex`.
- Storage: imagens dos jogos em `rental-games/`, escrita só admin.

## 9. Decisões provisórias (revisar com o cliente após a apresentação)

O dev foi autorizado a decidir; o cliente pode mudar depois. Tudo aqui foi pensado para mudar com pouco esforço (configuração ou ajuste pequeno).

1. **Modelo de reserva:** data de retirada futura, de hoje até `maxAdvanceDays` (padrão **30**, configurável). Para "só hoje", basta configurar 0.
2. **Dados do cadastro:** nome completo, WhatsApp, e-mail e **CPF** (validação dos dígitos verificadores; um CPF por conta). CPF só é visível para o dono e para o admin. Sem endereço. Uma configuração `requireCpf` (padrão `true`) permite tirar a exigência sem mexer em código.
3. **Pagamento:** só no balcão, na retirada. **Sem caução no sistema**; se o pub usar caução, ela é descrita na página de regras.
4. **Dias de retirada:** todos os dias habilitados por padrão; o admin marca os dias da semana nas configurações. Horários vão como texto nas regras.

Com isso, `rentalCustomers/{uid}` ganha o campo `cpf` (só dígitos), e o servidor verifica no pedido se o perfil está completo. Unicidade do CPF: índice `rentalCpfIndex/{cpf} → { uid }`, criado pelo servidor ao salvar o perfil.

## 10. Etapas de entrega

Cada etapa termina em algo testável no site. **[decisão do dev]**

1. **Fundação:** conta de serviço + Admin SDK, tipos, módulo de disponibilidade com testes, regras do Firestore/Storage.
2. **Admin — jogos e regras:** cadastro de jogos e unidades, ativar/inativar, editor de regras e configurações.
3. **Cliente — vitrine:** `/aluguel` (catálogo com disponibilidade) e `/aluguel/regras`.
4. **Contas:** cadastro/login do cliente, "Minha conta", e-mails próprios de verificação e redefinição (também para o admin).
5. **Pedido:** carrinho, escolha de data, rota de pedido com transação, e-mail de confirmação, "Meus aluguéis" e cancelamento.
6. **Admin — operação:** aba Aluguéis (retirada, devolução, atrasos, alterar prazo), aba Clientes, badges na sidebar.

## 11. Deixado para quem implementar

- Layout fino das telas, textos de interface, animações — seguir o padrão visual existente (acervo do cliente, `adminCatalog`, sidebar).
- Formato do código do pedido (curto, legível no balcão).
- Paginação/arquivamento do histórico de aluguéis.
- Ordem das abas e detalhes de filtros.

## 12. Riscos encontrados durante a análise (fora do escopo, registrar)

- `POST /api/send-email` aceita `to`, `subject` e `props` de qualquer pessoa, sem autenticação — pode ser usado para enviar e-mails em nome do domínio do pub.
- Cancelamento de reserva do pub pelo cliente (`/cancelreserve`) é bloqueado pelas regras (faz `update` sem login).
