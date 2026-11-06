# Pagamento online do aluguel — Design

**Data:** 2026-11-06
**Base:** pedido do cliente + decisões do dono do projeto (abaixo). Complementa `2026-11-05-aluguel-de-jogos-design.md`.

Legenda: **[decisão do dev]** = escolha de quem escreveu, revisável.

---

## 1. Intenção

O admin liga, nas configurações do aluguel, o **pagamento online**. Ligado, todo pedido precisa ser pago online (Pix ou cartão) para ser confirmado; desligado, tudo funciona como hoje (confirmação na hora, pagamento no balcão). O admin também escolhe o que acontece com o dinheiro quando um cliente cancela.

**Prioridade: UX.** O cliente sempre sabe em que pé está o pedido (aguardando pagamento, pago, expirado, reembolsado) e o que fazer a seguir; o admin vê o pagamento de cada pedido sem abrir o Mercado Pago.

**Decisões do dono do projeto:**
1. Com a opção ligada, pagamento online é **obrigatório** (não há "pagar no balcão").
2. Cancelamento antes da retirada segue uma **política configurável no admin**: reembolso automático integral, reembolso automático com taxa, ou análise manual.
3. As cópias ficam reservadas por **30 minutos** esperando o pagamento.
4. Provedor: **Mercado Pago** (Checkout Pro).

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Liga/desliga + política de cancelamento + tempo de espera nas configurações do aluguel.
- Pedido com pagamento pendente segura as cópias por 30 min; pagou → confirmado; não pagou → cópias voltam sozinhas.
- Página de status do pedido em tempo real (o cliente volta do Mercado Pago e vê o resultado sem recarregar).
- Reembolso integral ou parcial pelo site (automático ou pelo admin), com histórico.
- Pagamento visível no admin (status, forma, data, valor, reembolsos) e em "Minha conta".

**Não-objetivos (v1)**
- Parcelamento: só à vista. **[decisão do dev]** (aluguéis têm valor baixo; evita juros e confusão.)
- Boleto: fora — não compensa dentro de 30 minutos.
- Pagar no balcão quando o online está ligado (decisão 1).
- Assinaturas, cupons, carteira de crédito do cliente.
- Pagamento de multa por atraso pelo site.

**Anti-objetivos**
- Confirmar um pedido sem ter consultado o pagamento no Mercado Pago (nunca confiar só no que chega no aviso ou no navegador).
- Cliente pagar e ficar sem o jogo sem ninguém saber (pagamento que chega tarde precisa ser tratado — §6.4).
- Cobrar duas vezes o mesmo pedido.
- Dado de cartão passando pelo nosso site (o checkout é hospedado pelo Mercado Pago).

## 3. Visão geral do fluxo

```
Cliente confirma pedido ──► servidor cria o pedido "Aguardando pagamento"
                            e segura as cópias por 30 min
                            └► cria o checkout no Mercado Pago (expira junto)
        ◄── redireciona para o checkout (Pix ou cartão)
Cliente paga ──► Mercado Pago avisa o servidor (webhook assinado)
                 └► servidor consulta o pagamento, confere valor e pedido
                    └► pedido "Pago" · aluguéis "Reservado" · e-mail de confirmação
Cliente volta ao site ──► /aluguel/pedido/[código] mostra o status ao vivo
Não pagou em 30 min ──► cópias liberadas · pedido "Pagamento expirado"
```

Com o pagamento online **desligado**, nada disso acontece: o fluxo atual segue intacto.

## 4. Experiência do cliente

### 4.1 Checkout (`/aluguel/pedido`)
- Resumo mostra **"Pagamento online · Pix ou cartão"** no lugar de "Pagamento no balcão".
- Botão principal: **"Ir para o pagamento"**. Abaixo, em texto pequeno: "Suas cópias ficam reservadas por 30 minutos enquanto você paga."
- Ao confirmar: o carrinho é esvaziado (o pedido já guarda os jogos) e o cliente é levado ao Mercado Pago na mesma aba.

### 4.2 Página do pedido (`/aluguel/pedido/[código]`) — nova
Escuta o pedido em tempo real. Estados:

| Estado | O que o cliente vê | Ações |
|---|---|---|
| Aguardando pagamento | "Aguardando seu pagamento" + contagem regressiva "reserva válida por 24:13" + jogos e total | **Pagar agora** (reabre o checkout) · Cancelar pedido |
| Confirmando | (voltou do Mercado Pago, aviso ainda não chegou) "Confirmando seu pagamento…" com indicador de carregamento | — |
| Pago | "Pagamento aprovado!" + código do pedido + datas de retirada/devolução + "Pagamento online via Pix/cartão" | Ver meus aluguéis |
| Recusado | "Pagamento não aprovado" + motivo amigável (ex.: cartão recusado) | **Tentar novamente** (enquanto a reserva vale) |
| Expirado | "O tempo para pagar acabou e as cópias foram liberadas." | **Fazer o pedido de novo** (devolve os jogos ao carrinho) |
| Reembolsado | "Reembolso de R$ X enviado em dd/mm" + prazo típico | — |
| Cancelamento em análise | "Recebemos seu pedido de cancelamento; o Carcassonne Pub vai analisar o reembolso." | — |

"Confirmando" aparece quando o cliente volta com sucesso do Mercado Pago mas o aviso ainda não chegou; depois de ~20 s sem confirmação, a página consulta o servidor, que verifica o pagamento direto no Mercado Pago (cobre aviso atrasado).

### 4.3 Minha conta
- Cada pedido mostra um selo de pagamento: Pago online · Aguardando pagamento (expira em 12 min) · Pagamento expirado · Reembolsado R$ X · Cancelamento em análise.
- Pedido aguardando pagamento: botão **"Pagar agora"**.
- Cancelar um aluguel pago abre uma confirmação que **diz o resultado antes** de confirmar, conforme a política:
  - integral: "Você vai receber R$ 45,00 de volta."
  - com taxa: "Você vai receber R$ 40,50 de volta (taxa de cancelamento de 10%)."
  - manual: "Seu cancelamento vai para análise do Carcassonne Pub, que decide o reembolso."

### 4.4 E-mails
- **Confirmação do aluguel** passa a sair só depois do pagamento aprovado, com a linha "Pago online via Pix/cartão".
- **Reembolso**: novo e-mail curto "Reembolso de R$ X do pedido CÓDIGO", com o prazo típico (Pix: na hora; cartão: conforme a operadora).
- Não há e-mail para "pagamento expirado" **[decisão do dev]** (a página já informa; evita e-mail indesejado).

### 4.5 Regras
Ao ligar o pagamento online, o admin vê um aviso para revisar a seção "Formas de pagamento" das regras, com atalho para o editor. O texto não é trocado automaticamente.

## 5. Experiência do admin

### 5.1 Configurações do aluguel → seção "Pagamento online"
- **Situação da integração** (vem do servidor): "Não configurado" (sem credenciais) · "Modo de teste" (credencial de teste) · "Ativo — produção". Sem credenciais, o interruptor fica desabilitado com a explicação "Configure as credenciais do Mercado Pago no servidor".
- **Interruptor** "Exigir pagamento online nos pedidos".
- **Tempo para pagar**: padrão 30 min (15–60).
- **Política de cancelamento** em 3 cartões de escolha, cada um com uma frase simples:
  1. *Reembolso integral automático* — "O cliente recebe tudo de volta na hora."
  2. *Reembolso com taxa* — "O cliente recebe o valor menos a taxa." + campo **taxa (%)** (0–50, padrão 10).
  3. *Análise manual* — "O cancelamento fica pendente até você decidir quanto devolver."
- **Prévia** que traduz a configuração: "Ex.: num pedido de R$ 100,00, quem cancelar recebe R$ 90,00."
- Ao ligar: aviso para revisar as regras (§4.5).
- Desligar com pedidos aguardando pagamento: eles seguem até expirar; pedidos novos já usam o balcão.

### 5.2 Aba Aluguéis
- Selo de pagamento em cada aluguel (mesmos estados do cliente).
- Nova faixa **"Reembolsos a decidir"** (aparece só quando há pedidos na política manual).
- Filtro de pagamento: Todos · Pagos online · Aguardando · Expirados · Reembolsados.
- **Registrar retirada** fica desabilitado enquanto o pedido online não estiver pago ("Aguardando pagamento").
- Clicar no **código do pedido** abre o **detalhe do pedido**: jogos, cliente, pagamento (forma, data, valor, nº do pagamento no Mercado Pago), histórico de reembolsos e ações:
  - **Reembolsar** (valor editável, padrão = o que falta devolver).
  - Para cancelamentos em análise: **Aprovar reembolso** (com valor) ou **Recusar reembolso** (com motivo; o cancelamento segue, sem devolução).
- Cancelar pelo admin um aluguel pago pergunta quanto devolver (padrão: integral).
- O contador da sidebar soma também "Reembolsos a decidir".

## 6. Regras de negócio

### 6.1 Reserva temporária (hold)
- Booking ganha o status `held` com `holdUntil` (instante, ms). Enquanto `holdUntil > agora`, a cópia conta como ocupada para todos.
- Funções puras: `liveBookings(bookings, nowMs)` descarta holds vencidos **antes** de qualquer cálculo de disponibilidade (catálogo, checkout e servidor usam a mesma função).
- Limpeza preguiçosa: toda transação que grava um jogo remove dele os holds vencidos. Uma rota de varredura (`/api/rental/payments/sweep`) marca pedidos vencidos como expirados e pode ser chamada por um cron da Vercel a cada 15 min **[decisão do dev: recomendada, não obrigatória — a correção não depende dela]**.

### 6.2 Estados
- **Pedido** (`rentalOrders`, novo): `paymentMode: "counter" | "online"`; `payment.status`: `pending | approved | rejected | expired | refunded | partially_refunded`; `cancellationReview: "pending" | "approved" | "denied"` quando houver.
- **Aluguel**: novo status `awaiting_payment` (antes de `reserved`). Expirado → `canceled` com `canceledBy: "system"` e motivo "Pagamento não concluído".
- **Booking**: `held` → `reserved` → `picked_up`.

### 6.3 Cálculo do reembolso
Função pura `refundFor(policy, feePercent, amount)`:
- integral → `amount`; com taxa → `amount − round(amount × fee%)`; manual → `null` (decide o admin).
- Cancelar **um jogo** de um pedido com vários → reembolso proporcional ao preço daquele jogo (o Mercado Pago aceita reembolso parcial).
- Soma dos reembolsos nunca passa do valor pago.

### 6.4 Pagamento que chega depois de expirar
Na transação de confirmação: se todas as cópias do pedido ainda estiverem livres para as datas, confirma normalmente (refaz os bookings como `reserved`). Senão, **reembolsa integralmente na hora**, marca o pedido como reembolsado com motivo "Tempo esgotado" e avisa cliente (e-mail) e admin (selo no pedido). Com a expiração do checkout alinhada ao hold, isso é raro.

## 7. Arquitetura técnica

### 7.1 Adaptador de provedor
`src/services/server/payments/` — interface `PaymentProvider`:
- `createCheckout({ orderId, items, payerEmail, expiresAt, returnUrl, notificationUrl })` → `{ checkoutUrl, providerCheckoutId }`
- `getPayment(paymentId)` → `{ status, amount, currency, externalReference, method, approvedAt }`
- `findPaymentsByReference(orderId)` → para a verificação manual da §4.2
- `refund(paymentId, amount?)` → `{ refundId, amount }`
- `verifyWebhook(headers, body)` → `paymentId | null`

Implementação `mercadoPagoProvider` (SDK oficial `mercadopago` ou REST). Trocar de provedor = novo adaptador, sem mexer no fluxo.

### 7.2 Mercado Pago (Checkout Pro)
- Preferência com `external_reference = orderId`, itens (um por jogo), `payer.email`, `expires: true` + `expiration_date_to = holdUntil`, `date_of_expiration` (Pix) = holdUntil, `payment_methods`: excluir boleto, `installments: 1`, `back_urls` → `/aluguel/pedido/[código]`, `auto_return: "approved"`, `notification_url` → `/api/payments/mercadopago/webhook`, `statement_descriptor: "CARCASSONNE"`.
- **Webhook**: valida a assinatura `x-signature` (HMAC-SHA256 com a "assinatura secreta"), depois **consulta o pagamento** pela API e confere: pedido existe, `external_reference` bate, valor e moeda batem, status. Idempotente (pagamento já processado → ignora). Sempre responde rápido; falhas temporárias → 500 para o Mercado Pago tentar de novo.
- Credenciais só no servidor: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`. Modo teste × produção deduzido do token (`TEST-` × `APP_USR-`).
- `SITE_URL` precisa ser público (https) para o aviso chegar — localhost não recebe webhook (teste via deploy de prévia da Vercel ou túnel).

### 7.3 Rotas
| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/rental/orders` (alterada) | cliente | online ligado → cria pedido `pending` + holds + checkout; responde `{ orderId, code, checkoutUrl }` |
| `POST /api/rental/orders/:id/checkout` | dono | reabre/recria o checkout se a reserva ainda vale |
| `POST /api/rental/orders/:id/verify` | dono | consulta o Mercado Pago e aplica o resultado (aviso atrasado) |
| `POST /api/rental/orders/:id/cancel` | dono | cancela pedido pendente (libera cópias) |
| `POST /api/payments/mercadopago/webhook` | Mercado Pago | §7.2 |
| `POST /api/rental/orders/:id/refund` | admin | reembolso com valor |
| `POST /api/rental/orders/:id/review` | admin | aprova (valor) ou recusa cancelamento em análise |
| `GET /api/rental/payments/status` | admin | `{ configured, mode }` |
| `POST /api/rental/payments/sweep` | cron (segredo `CRON_SECRET`) ou admin | expira pedidos vencidos |
| `POST /api/rental/rentals/:id/cancel` (alterada) | dono/admin | aplica a política; admin informa o valor |

Toda mudança de estado em transação; pagamentos e reembolsos registrados no pedido com data e autor.

### 7.4 Dados
```
rentalOrders/{orderId}      privado (dono + admin), escrita só servidor
  code, customerUid, customer{name,email,phone}, rentalIds[], gameIds[], total
  paymentMode: "counter" | "online"
  payment?: { status, provider: "mercadopago", checkoutUrl, providerCheckoutId,
              providerPaymentId?, method?: "pix" | "card", paidAt?, holdUntil,
              refunds: [{ amount, at, by, providerRefundId, rentalId? }],
              refundedTotal }
  cancellationReview?: { status, requestedAt, rentalIds[], decidedBy?, amount?, reason? }
  createdAt

rental-config/settings  (+ campos)
  onlinePayment: { enabled, holdMinutes, cancellationPolicy: "full" | "fee" | "manual", feePercent }

RentalType.status  + "awaiting_payment"
RentalBooking.status + "held", holdUntil?: number
```
Regras do Firestore: `rentalOrders` com leitura do dono/admin e escrita bloqueada no navegador; entra na lista de exclusão do curinga.

### 7.5 Módulos puros (Vitest)
`liveBookings`, `refundFor`, `orderPaymentView(order, nowMs)` (o estado mostrado ao cliente/admin, incl. contagem regressiva e "expirado" derivado), `verifyMercadoPagoSignature` (função pura sobre headers/segredo), regras de transição de estado.

## 8. Etapas de entrega
1. Módulos puros + tipos + regras do Firestore.
2. Adaptador Mercado Pago + webhook + status da integração.
3. Pedido online (servidor) + reserva temporária + expiração.
4. Cliente: checkout, página do pedido, Minha conta, e-mails.
5. Cancelamento com política + reembolsos (cliente e admin).
6. Admin: configurações, selos, faixa/filtro, detalhe do pedido, contador.
7. Ajuda, README e guia de testes (contas de teste do Mercado Pago).

## 9. Fora daqui (dono do projeto / gerente)
Conta e credenciais do Mercado Pago, configuração do webhook, variáveis na Vercel, revisão da seção "Formas de pagamento" das regras — passo a passo no guia entregue à parte.
