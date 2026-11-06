# Pagamento online do aluguel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pagamento online obrigatório (quando ligado nas configurações) via Mercado Pago Checkout Pro, com reserva temporária de cópias, confirmação por webhook, política de cancelamento configurável e reembolsos.

**Architecture:** Lógica de estado e dinheiro em módulos puros (`src/rental/payments.ts`) testados com Vitest. Integração com o provedor atrás da interface `PaymentProvider` (`src/services/server/payments/`), implementação Mercado Pago. Toda mudança de pedido/aluguel/booking em transação no servidor. Pedido ganha documento próprio `rentalOrders/{orderId}`.

**Tech Stack:** Next.js 16, TypeScript, Firebase Admin SDK, Firestore, Resend + react-email, Vitest, Mercado Pago (REST via `fetch`, sem SDK — menos dependência, chamadas simples).

**Spec:** `docs/superpowers/specs/2026-11-06-pagamento-online-design.md` (base: `docs/superpowers/specs/2026-11-05-aluguel-de-jogos-design.md`)

## Global Constraints

- Desligado (`onlinePayment.enabled === false`): comportamento atual inalterado (pedido `reserved` na hora, pagamento no balcão, e-mail de confirmação na criação). Testes existentes continuam passando.
- Ligado: pagamento online obrigatório; só Pix e cartão, à vista (`installments: 1`), boleto excluído.
- Reserva temporária: padrão 30 min (`holdMinutes` 15–60). Checkout do Mercado Pago expira no mesmo instante (`expiration_date_to` e `date_of_expiration` = `holdUntil`).
- Nunca confirmar sem `getPayment` no Mercado Pago conferindo `external_reference === orderId`, `transaction_amount === total/100` e `currency_id === "BRL"`.
- Webhook: validar `x-signature` (HMAC-SHA256, manifest `id:{data.id};request-id:{x-request-id};ts:{ts};`) com `MERCADOPAGO_WEBHOOK_SECRET`; idempotente.
- Env (só servidor): `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SITE_URL`, `CRON_SECRET` (opcional). Modo: token começa com `TEST-` → teste; `APP_USR-` → produção.
- Dinheiro em centavos em todo o código; conversão para reais só no adaptador do Mercado Pago.
- `rentalOrders` só escrito pelo servidor; leitura pelo dono (`customerUid == auth.uid`) e admin.
- UX/textos em português, no tom do site; estados sempre explicam o que fazer a seguir.
- Datas de aluguel continuam "YYYY-MM-DD" (America/Sao_Paulo); instantes de pagamento/hold em ms (`number`) ou `Timestamp`.
- Não tocar em arquivos com edições não commitadas do dono: `src/app/(admin)/aluguel-admin/rulesTab.tsx`, `src/app/(client)/aluguel/regras/page.tsx`, `src/components/input.tsx`.

## Review Focus

1. **Pagamento aprovado depois que a reserva venceu e a cópia foi pega por outro** → reembolso integral automático, pedido "Reembolsado · tempo esgotado"; nunca dois clientes com a mesma cópia. (Task 4)
2. **Webhook repetido / fora de ordem** (o Mercado Pago reenvia) → processar duas vezes não confirma em dobro nem manda dois e-mails. (Task 4)
3. **Cancelar um jogo de um pedido pago com vários** → reembolso só do valor daquele jogo, conforme a política; soma de reembolsos nunca passa do pago. (Tasks 1 e 6)
4. **Hold vencido ainda gravado no jogo** → catálogo, checkout e servidor tratam a cópia como livre (mesma função `liveBookings`). (Tasks 1, 3, 5, 7)
5. **Cliente volta do Mercado Pago antes do aviso chegar** → página mostra "Confirmando…" e, após ~20 s, consulta `verify`; nunca fica presa em "aguardando". (Tasks 4 e 5)

---

## File Structure

```
src/types.ts                                     + RentalOrderType, OnlinePaymentSettings, statuses
src/rental/payments.ts                           liveBookings, withLiveBookings, refundFor, orderPaymentView, toCents/fromCents helpers
src/rental/defaults.ts                           + onlinePayment defaults
src/rental/__tests__/payments.test.ts
src/services/server/payments/provider.ts         interface PaymentProvider + tipos
src/services/server/payments/mercadoPago.ts      implementação REST
src/services/server/payments/signature.ts        verifyMercadoPagoSignature (puro)
src/services/server/payments/index.ts            getPaymentProvider(), paymentsStatus()
src/rental/__tests__/signature.test.ts           (importa a função pura; ver Task 2)
src/services/server/rentalOrderService.ts        criação online, expiração, confirmação, reembolsos, revisão
src/services/server/rentalEmails.tsx             + sendRefundEmail; confirmação aceita linha de pagamento
src/components/react-email/rentalRefundEmail.tsx
src/app/api/rental/orders/route.ts               (alterada)
src/app/api/rental/orders/[id]/{checkout,verify,cancel,refund,review}/route.ts
src/app/api/rental/payments/{status,sweep}/route.ts
src/app/api/payments/mercadopago/webhook/route.ts
src/services/repositories/RentalOrderRepository.ts
src/services/rentalApi.ts                        + chamadas novas
src/app/(client)/aluguel/pedido/page.tsx         (alterada: modo online)
src/app/(client)/aluguel/pedido/[orderId]/page.tsx   página de status
src/app/(client)/aluguel/paymentBadge.tsx        selo compartilhado cliente/admin? (cliente)
src/app/(client)/aluguel/minha-conta/page.tsx    (alterada)
src/app/(admin)/aluguel-admin/onlinePaymentSettings.tsx
src/app/(admin)/aluguel-admin/orderDetail.tsx
src/app/(admin)/aluguel-admin/rentalsTab.tsx, rentalActions.tsx, settingsForm.tsx (alterados)
src/app/(admin)/sidebar.tsx                      (contador + reembolsos a decidir)
firestore.rules                                  + rentalOrders
```

---

### Task 1: Tipos e lógica pura de pagamento

**Files:** Modify `src/types.ts`, `src/rental/defaults.ts`; Create `src/rental/payments.ts`, `src/rental/__tests__/payments.test.ts`

**Interfaces (Produces):**
```ts
// types.ts
export type RentalStatus = "awaiting_payment" | "reserved" | "picked_up" | "returned" | "canceled";
// RentalBooking: status: "held" | "reserved" | "picked_up"; holdUntil?: number   (ms)
// RentalType: canceledBy?: "customer" | "admin" | "system"
export type CancellationPolicy = "full" | "fee" | "manual";
export interface OnlinePaymentSettings { enabled: boolean; holdMinutes: number; cancellationPolicy: CancellationPolicy; feePercent: number }
// RentalSettingsType: + onlinePayment: OnlinePaymentSettings
export type OrderPaymentStatus = "pending" | "approved" | "rejected" | "expired" | "refunded" | "partially_refunded";
export interface RentalRefund { amount: number; at: number; by: string; providerRefundId: string; rentalId?: string; reason?: string }
export interface RentalOrderPayment {
  status: OrderPaymentStatus; provider: "mercadopago"; checkoutUrl: string; providerCheckoutId: string;
  providerPaymentId?: string; method?: "pix" | "card"; paidAt?: number; holdUntil: number;
  refunds: RentalRefund[]; refundedTotal: number; lateApprovalRefunded?: boolean;
}
export interface RentalCancellationReview { status: "pending" | "approved" | "denied"; requestedAt: number; rentalIds: string[]; decidedBy?: string; amount?: number; reason?: string }
export interface RentalOrderType {
  id?: string; code: string; customerUid: string; customer: { name: string; email: string; phone: string };
  rentalIds: string[]; gameIds: string[]; items: { rentalId: string; gameId: string; gameName: string; price: number }[];
  total: number; startDate: string; paymentMode: "counter" | "online";
  payment?: RentalOrderPayment; cancellationReview?: RentalCancellationReview; createdAt?: Timestamp;
}
```
```ts
// payments.ts
export function liveBookings(bookings: RentalBooking[], nowMs: number): RentalBooking[]   // remove held com holdUntil <= nowMs
export function withLiveBookings<T extends { bookings: RentalBooking[] }>(game: T, nowMs: number): T
export function refundFor(policy: CancellationPolicy, feePercent: number, amount: number): number | null // full→amount; fee→amount-round(amount*fee/100); manual→null
export function refundableLeft(order: Pick<RentalOrderType,"total"> & { payment?: Pick<RentalOrderPayment,"refundedTotal"> }): number
export type OrderPaymentView =
  | { state: "counter" } | { state: "awaiting"; msLeft: number } | { state: "expired" } | { state: "rejected"; msLeft: number }
  | { state: "paid"; method?: "pix" | "card" } | { state: "refunded"; amount: number } | { state: "partially_refunded"; amount: number }
  | { state: "review" };
export function orderPaymentView(order: RentalOrderType, nowMs: number): OrderPaymentView
// regras: paymentMode counter → counter; cancellationReview.status pending → review; status approved → paid;
// refunded/partially_refunded → com refundedTotal; pending|rejected com holdUntil <= now → expired; pending → awaiting; rejected → rejected
export function formatCountdown(ms: number): string // "24:05", nunca negativo
```
Defaults: `onlinePayment: { enabled: false, holdMinutes: 30, cancellationPolicy: "full", feePercent: 10 }`.

- [ ] **Step 1: Tests** (`payments.test.ts`): `liveBookings` remove só held vencido (held com holdUntil = now também removido; reserved/picked_up mantidos); `refundFor("full",10,4500)=4500`, `("fee",10,4500)=4050`, `("fee",10,999)=899` (round), `("manual",…)=null`; `refundableLeft` = total − refundedTotal (nunca < 0); `orderPaymentView` cobre os 8 estados; `formatCountdown(65000)="01:05"`, `(-5)="00:00"`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementar. **Step 4:** `npm test` + `npx tsc --noEmit` → OK (ajustar usos de `RentalStatus`/`canceledBy` que o tsc apontar com o menor ajuste possível, ex.: `STATUS_LABEL` ganha `awaiting_payment: "Aguardando pagamento"`).
- [ ] **Step 5: Commit** `feat(pagamento): tipos e lógica pura de pagamento`.

---

### Task 2: Adaptador Mercado Pago, assinatura do webhook e status da integração

**Files:** Create `src/services/server/payments/{provider,mercadoPago,signature,index}.ts`, `src/app/api/rental/payments/status/route.ts`, `src/rental/__tests__/signature.test.ts`; Modify `firestore.rules`, `README.md`

**Interfaces:**
```ts
// provider.ts
export interface CheckoutItem { id: string; title: string; unitPrice: number /*centavos*/ }
export interface CreateCheckoutInput { orderId: string; items: CheckoutItem[]; payerEmail: string; expiresAt: number; returnUrl: string; notificationUrl: string }
export interface ProviderPayment { id: string; status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back"; amount: number /*centavos*/; currency: string; externalReference: string | null; method: "pix" | "card" | "other"; approvedAt?: number }
export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<{ checkoutUrl: string; providerCheckoutId: string }>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  findPaymentsByReference(orderId: string): Promise<ProviderPayment[]>;
  refund(paymentId: string, amount?: number /*centavos*/): Promise<{ refundId: string; amount: number }>;
}
// signature.ts (puro, sem "server-only", para teste)
export function verifyMercadoPagoSignature(args: { xSignature: string | null; xRequestId: string | null; dataId: string | null; secret: string }): boolean
// index.ts
export function getPaymentProvider(): PaymentProvider   // lança se MERCADOPAGO_ACCESS_TOKEN ausente
export function paymentsStatus(): { configured: boolean; mode: "test" | "production" | null }
```
Mercado Pago REST (`Authorization: Bearer <token>`, base `https://api.mercadopago.com`): `POST /checkout/preferences` (items com `unit_price` em reais, `currency_id: "BRL"`, `quantity: 1`; `external_reference`; `payer.email`; `back_urls` success/failure/pending = returnUrl; `auto_return: "approved"` só quando returnUrl é https; `notification_url`; `expires: true`; `expiration_date_to` e `date_of_expiration` ISO com offset -03:00; `payment_methods: { excluded_payment_types: [{id:"ticket"}], installments: 1 }`; `statement_descriptor: "CARCASSONNE"`) → `init_point` (produção) ou `sandbox_init_point` quando modo teste; `GET /v1/payments/{id}`; `GET /v1/payments/search?external_reference={orderId}`; `POST /v1/payments/{id}/refunds` (body `{ amount }` em reais quando parcial; header `X-Idempotency-Key`). `method`: `payment_type_id` `bank_transfer`/`payment_method_id` `pix` → pix; `credit_card`/`debit_card` → card. Erros HTTP → `Error` com status e mensagem do provedor (logados no servidor, nunca enviados ao cliente).

- [ ] **Step 1: Tests** (`signature.test.ts`): monta `x-signature` `ts=...,v1=<hmac>` com segredo conhecido → true; v1 errado → false; header ausente/malformado → false; `dataId` em maiúsculas é normalizado para minúsculas (regra do Mercado Pago para ids alfanuméricos).
- [ ] **Step 2:** FAIL → implementar `signature.ts` (node `crypto` `createHmac`, `timingSafeEqual`) → PASS.
- [ ] **Step 3:** Implementar provider + index + `GET /api/rental/payments/status` (admin; `withApi` + `requireAdmin`) → `{ configured, mode }`.
- [ ] **Step 4:** `firestore.rules`: `match /rentalOrders/{orderId} { allow read: if isAdmin() || (request.auth != null && resource.data.customerUid == request.auth.uid); allow write: if false; }` e `rentalOrders` nas duas listas de exclusão do curinga. README: variáveis `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `CRON_SECRET`.
- [ ] **Step 5:** `npm test`, `tsc`, `eslint src/services/server src/app/api`, `npm run build` (sem as variáveis MP também). Commit `feat(pagamento): adaptador Mercado Pago e verificação de assinatura`.

---

### Task 3: Pedido online no servidor (reserva temporária, expiração, checkout)

**Files:** Create `src/services/server/rentalOrderService.ts`, `src/app/api/rental/orders/[id]/{checkout,cancel}/route.ts`, `src/app/api/rental/payments/sweep/route.ts`; Modify `src/services/server/rentalService.ts` (createOrder), `src/rental/orders.ts` (buildOrderRecords aceita status inicial), `src/app/api/rental/orders/route.ts`

**Interfaces:**
- `createOrder` (alterada): lê `settings.onlinePayment`; usa `withLiveBookings(game, Date.now())` nos jogos antes do `planOrder`; ao gravar um jogo, persiste `liveBookings` (limpa holds vencidos). Sempre cria `rentalOrders/{orderId}`. **Desligado:** idêntico a hoje + doc do pedido com `paymentMode: "counter"`. **Ligado:** rentals `awaiting_payment`, bookings `held` com `holdUntil = now + holdMinutes*60000`, pedido `paymentMode: "online"`, `payment.status: "pending"`; **depois** da transação cria o checkout (`getPaymentProvider().createCheckout`, returnUrl = `${siteUrl()}/aluguel/pedido/${orderId}`, notificationUrl = `${siteUrl()}/api/payments/mercadopago/webhook`) e grava `checkoutUrl`/`providerCheckoutId`; se o checkout falhar, expira o pedido na hora (libera cópias) e lança `ApiError(502, "payment_unavailable", "Não foi possível iniciar o pagamento. Tente novamente em instantes.")`. Sem e-mail no modo online (vai na confirmação, Task 4). Retorno: `{ orderId, code, checkoutUrl?: string }`.
- `expireOrder(orderId: string, reason?: string): Promise<boolean>` — transação: se `payment.status` é `pending|rejected` e `holdUntil <= now`: pedido `expired`, rentals → `canceled` (`canceledBy: "system"`, `cancelReason: "Pagamento não concluído"`), remove os bookings `held` desses rentals. Idempotente.
- `reopenCheckout(orderId, uid): Promise<{ checkoutUrl: string }>` — dono; se vencido → `expireOrder` + `ApiError(409, "order_expired", "O tempo para pagar acabou e as cópias foram liberadas.")`; se não pago → devolve `checkoutUrl` existente.
- `cancelPendingOrder(orderId, uid)` — dono; só `pending|rejected` → mesmo efeito de expirar, `cancelReason: "Cancelado pelo cliente antes do pagamento"`, `canceledBy: "customer"`.
- `sweepExpiredOrders(): Promise<number>` — query `paymentMode == "online"` e `payment.status in [pending, rejected]` (filtrar `holdUntil` no código) → `expireOrder` em cada.
- Rotas: `POST /api/rental/orders/[id]/checkout` (dono), `POST /api/rental/orders/[id]/cancel` (dono), `POST /api/rental/payments/sweep` (header `Authorization: Bearer ${CRON_SECRET}` **ou** admin).
- `pickupRental`: recusa `awaiting_payment` com `ApiError(409, "awaiting_payment", "Este pedido ainda não foi pago.")` (já cai em invalid_status; mensagem específica melhora a UX).

- [ ] **Step 1:** Estender `buildOrderRecords` com `initialStatus: "reserved" | "awaiting_payment"` e `holdUntil?: number` (bookings `held` quando `awaiting_payment`) + testes em `orderRecords.test.ts` (modo online gera rentals `awaiting_payment` e bookings `held` com `holdUntil`; modo balcão inalterado).
- [ ] **Step 2:** Implementar serviço + rotas. `tsc`, `eslint`, `npm test`, `build`.
- [ ] **Step 3: Commit** `feat(pagamento): pedido online com reserva temporária e expiração`.

---

### Task 4: Webhook, verificação e confirmação do pagamento

**Files:** Create `src/app/api/payments/mercadopago/webhook/route.ts`, `src/app/api/rental/orders/[id]/verify/route.ts`; Modify `rentalOrderService.ts`, `rentalEmails.tsx`, `src/components/react-email/rentalOrderEmail.tsx` (linha "Pago online via Pix/cartão")

**Interfaces:**
- `applyPayment(orderId: string, payment: ProviderPayment): Promise<"confirmed" | "already" | "rejected" | "late_refunded" | "ignored">` — confere `externalReference`, `amount === order.total`, `currency === "BRL"` (diferente → log + `"ignored"`). Transação:
  - `approved` e pedido `pending|rejected|expired`: se os bookings `held` ainda existem ou as cópias continuam livres para as datas (`isUnitFree` com `liveBookings`), confirma: pedido `approved` (`providerPaymentId`, `method`, `paidAt`), rentals `reserved`, bookings `held` → `reserved` (sem `holdUntil`; recria se foram limpos). Senão → marca para reembolso tardio.
  - `approved` e pedido já `approved` com o mesmo `providerPaymentId` → `"already"` (idempotente, sem e-mail).
  - `rejected|cancelled` → `payment.status = "rejected"` (mantém hold até vencer, para tentar de novo).
  - `pending|in_process` → nada.
  - Depois da transação: `"confirmed"` → `sendOrderConfirmation` (com método); reembolso tardio → `provider.refund(id)` integral, pedido `refunded` com `lateApprovalRefunded: true`, rentals `canceled` (`canceledBy: "system"`, motivo "Tempo para pagamento esgotado"), `sendRefundEmail`.
- Webhook `POST /api/payments/mercadopago/webhook`: lê `type`/`topic` e `data.id` (body ou query `data.id`/`id`); só `payment`; `verifyMercadoPagoSignature` (falha → 401); `getPayment` → `applyPayment(payment.externalReference, payment)`; responde 200 `{ ok: true }`; erro inesperado → 500 (Mercado Pago reenvia). Sem `requireUser`.
- `POST /api/rental/orders/[id]/verify` (dono ou admin): `findPaymentsByReference(orderId)` → aplica o mais relevante (approved > pending > rejected) → devolve `orderPaymentView`-compatível `{ status }`.

- [ ] **Step 1:** Extrair a decisão "confirmar × reembolso tardio" para uma função pura em `payments.ts` (`decideApproval(order, rentalsBookingsByGame, nowMs)`) com testes: hold válido → confirm; hold vencido e cópia livre → confirm; hold vencido e cópia ocupada por outro → late_refund; já aprovado mesmo id → already.
- [ ] **Step 2:** Implementar serviço, webhook e verify; e-mail de confirmação com linha de pagamento.
- [ ] **Step 3:** `npm test`, `tsc`, `eslint`, `build`; `curl -X POST localhost:3000/api/payments/mercadopago/webhook -d '{}'` → 401/400 (sem assinatura) e não 500. Commit `feat(pagamento): confirmação por webhook com verificação no Mercado Pago`.

---

### Task 5: Cliente — checkout online, página do pedido, Minha conta

**Files:** Create `src/services/repositories/RentalOrderRepository.ts`, `src/app/(client)/aluguel/pedido/[orderId]/page.tsx`, `src/app/(client)/aluguel/paymentBadge.tsx`; Modify `src/services/rentalApi.ts`, `pedido/page.tsx`, `minha-conta/page.tsx`, `rentalShowcase.tsx`/`rentalGameDetail.tsx` (usar `withLiveBookings` antes de `gameAvailability`), `pedido/page.tsx` (idem para `availabilityFor`)

**Interfaces:**
- `RentalOrderRepository.subscribe(orderId, cb)`, `.subscribeToCustomer(uid, cb)` (`where customerUid ==`, ordenar no cliente).
- `rentalApi.reopenCheckout(id)`, `.verifyOrder(id)`, `.cancelPendingOrder(id)`; `createOrder` passa a devolver `checkoutUrl?`.
- `PaymentBadge({ view }: { view: OrderPaymentView })` — textos: counter → "Pagamento no balcão"; awaiting → "Aguardando pagamento · expira em mm:ss"; expired → "Pagamento expirado"; rejected → "Pagamento não aprovado"; paid → "Pago online (Pix|cartão)"; refunded → "Reembolsado R$ X"; partially_refunded → "Reembolso parcial R$ X"; review → "Cancelamento em análise". Cores sólidas legíveis (mesmo padrão do selo de disponibilidade).

**UX (spec §4):**
- `/aluguel/pedido`: com `settings.onlinePayment.enabled` → resumo "Pagamento online · Pix ou cartão", botão "Ir para o pagamento", texto "Suas cópias ficam reservadas por N minutos enquanto você paga."; sucesso → `cart.clear()` e `window.location.assign(checkoutUrl)`.
- `/aluguel/pedido/[orderId]`: estados da tabela da spec §4.2, contagem regressiva ao vivo (1 s), "Confirmando seu pagamento…" quando a URL tem `status=approved|collection_status=approved` (retorno do Mercado Pago) e o pedido ainda está pendente; após 20 s chama `verifyOrder` uma vez; "Fazer o pedido de novo" põe os `gameIds` de volta no carrinho e vai para `/aluguel/pedido`. Sem login → `/aluguel/entrar?next=…`. Pedido de outra pessoa → "Pedido não encontrado".
- Minha conta: selo por pedido; "Pagar agora" nos pendentes; link para a página do pedido.

- [ ] **Step 1:** Implementar; `tsc`, `eslint "src/app/(client)/aluguel" src/services`, `build`, `npm test`.
- [ ] **Step 2: Commit** `feat(pagamento): checkout online e página de status do pedido`.

---

### Task 6: Cancelamento com política e reembolsos

**Files:** Modify `rentalOrderService.ts`, `rentalService.ts` (`cancelRental`), `src/app/api/rental/rentals/[id]/cancel/route.ts`; Create `src/app/api/rental/orders/[id]/{refund,review}/route.ts`, `src/components/react-email/rentalRefundEmail.tsx`, `sendRefundEmail` em `rentalEmails.tsx`; Modify `rentalApi.ts`, `minha-conta/page.tsx`

**Interfaces:**
- `cancelRental(rentalId, actor, reason?, refundAmount?)`: se o pedido é online e `approved`:
  - cliente: `full|fee` → cancela + `provider.refund(paymentId, refundFor(...))` (valor do jogo; parcial quando o pedido tem mais jogos ou há taxa) + registra em `payment.refunds`, `refundedTotal`, status `refunded` (quando tudo devolvido) ou `partially_refunded`; `manual` → cancela o aluguel (libera a cópia) e abre `cancellationReview` `pending` com o rentalId (sem reembolso agora).
  - admin: `refundAmount` (centavos, 0 permitido) obrigatório para pedido pago; reembolsa esse valor.
  - Reembolso falhou no provedor → **não** cancela; `ApiError(502, "refund_failed", "Não foi possível processar o reembolso agora. Tente novamente.")`.
  - Nunca reembolsar acima de `refundableLeft`.
- `refundOrder(orderId, adminUid, amount, reason?)` → `POST /api/rental/orders/[id]/refund` (admin).
- `reviewCancellation(orderId, adminUid, decision: "approve" | "deny", amount?, reason?)` → `POST /api/rental/orders/[id]/review` (admin).
- `GET`-less: o cliente vê o valor antes de confirmar calculando `refundFor` no navegador com as configurações públicas (`rental-config/settings`).
- Minha conta: diálogo de confirmação do cancelamento mostra o resultado (spec §4.3); e-mail de reembolso.

- [ ] **Step 1:** Testes puros extras em `payments.test.ts` para o cálculo por jogo (`refundForRental(order, rentalId, policy, fee)` respeitando `refundableLeft`).
- [ ] **Step 2:** Implementar; `npm test`, `tsc`, `eslint`, `build`. Commit `feat(pagamento): política de cancelamento e reembolsos`.

---

### Task 7: Admin — configurações, selos, detalhe do pedido, contador

**Files:** Create `src/app/(admin)/aluguel-admin/onlinePaymentSettings.tsx`, `orderDetail.tsx`; Modify `settingsForm.tsx` (renderiza a seção), `rentalsTab.tsx`, `rentalActions.tsx`, `unitsEditor.tsx`/`gamesTab.tsx` (usar `withLiveBookings`), `src/app/(admin)/sidebar.tsx`, `src/rental/attention.ts` (+ `refundReviews`)

**UX (spec §5):** seção "Pagamento online" com situação da integração (chama `GET /api/rental/payments/status`), interruptor (desabilitado sem credenciais, com explicação), tempo para pagar (15–60), política em 3 cartões de escolha + campo de taxa, prévia "Ex.: num pedido de R$ 100,00, quem cancelar recebe R$ 90,00", aviso para revisar as regras ao ligar (link para a aba Regras; **não** editar `rulesTab.tsx`). Aba Aluguéis: selo de pagamento, faixa "Reembolsos a decidir", filtro de pagamento, código do pedido abre `orderDetail` (itens, cliente, pagamento, reembolsos, ações Reembolsar / Aprovar reembolso / Recusar), cancelar pedido pago pede o valor (padrão integral), "Registrar retirada" desabilitado com "Aguardando pagamento". Sidebar: contador inclui reembolsos a decidir.

- [ ] **Step 1:** Teste de `rentalAttention` com `refundReviews` (conta pedidos com `cancellationReview.status === "pending"`) — ajustar assinatura para receber também os pedidos: `rentalAttention(rentals, today, orders?)`.
- [ ] **Step 2:** Implementar; `npm test`, `tsc`, `eslint`, `build`. Commit `feat(pagamento): admin de pagamentos e reembolsos`.

---

### Task 8: Ajuda, README e guia de testes

**Files:** Modify `src/app/(admin)/ajuda/page.tsx` (categoria Aluguel: ligar pagamento online, política de cancelamento, reembolsos, o que o cliente vê), `README.md` (seção "Pagamento online": variáveis, como testar com túnel/prévia, cartões de teste `APRO`/`OTHE`/`CONT`, cron opcional `vercel.json` para `/api/rental/payments/sweep` a cada 15 min com `CRON_SECRET`)

- [ ] **Step 1:** Escrever; `tsc`, `eslint` no arquivo de ajuda. Commit `docs(pagamento): ajuda e README`.
- [ ] **Step 2:** Verificação final: `npm test`, `tsc`, `npm run build`.
