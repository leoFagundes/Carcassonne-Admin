# Aluguel de Jogos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serviço de aluguel de jogos com acervo próprio: catálogo público com disponibilidade, contas de cliente, pedido com confirmação automática e área administrativa de estoque, aluguéis, clientes e regras.

**Architecture:** Regras de disponibilidade e de pedido ficam num módulo puro (`src/rental/`), testado com Vitest e usado igual no navegador (exibição) e no servidor (decisão). Toda escrita em `rentals` e em `rentalGames.bookings` passa por rotas `/api/rental/*` com Firebase Admin SDK dentro de transações; o navegador só lê. Jogos, regras e configurações são editados pelo admin com o SDK do cliente, protegidos por `isAdmin()` nas regras.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind, Firebase (Auth/Firestore/Storage, `firebase-admin` 13), Resend + `@react-email/components`, Vitest (novo, só para `src/rental/`).

**Spec:** `docs/superpowers/specs/2026-11-05-aluguel-de-jogos-design.md`

## Global Constraints

- Fuso **America/Sao_Paulo** para "hoje". Datas de retirada/devolução são strings `"YYYY-MM-DD"`; nunca `Date` para essas datas.
- Preços em **centavos** (`number`); exibição `R$ 45,00` (pt-BR).
- Ocupação de uma unidade é o intervalo **fechado** `[startDate, dueDate]`, `dueDate = startDate + rentalDays`; nova reserva da mesma unidade só começa no dia seguinte ao `dueDate`.
- Aluguel `picked_up` vencido ocupa a unidade até `hoje` (fim efetivo = max(dueDate, hoje)).
- Navegador **nunca** escreve em `rentals`, `rentalCustomers`, `rentalCpfIndex`, `authEmailThrottle` nem no campo `rentalGames.bookings`.
- Credenciais do Admin SDK só em variáveis sem `NEXT_PUBLIC_`: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`. URL do site em `SITE_URL` (padrão `https://www.carcassonnepub.com.br`).
- Admin = existe `admins/{uid}` (já implementado em `AdminRepository`).
- Textos de interface em português; visual segue os padrões existentes (`primary-gold`, `secondary-black`, `adminCatalog`, `showcase/*`, `AuthCard`).
- Repositórios do cliente seguem o padrão existente: classe com métodos `static`, `subscribe*` com `onSnapshot`, escritas retornam `boolean`/`string | null` sem lançar.
- Remetentes Resend: `Carcassonne Pub <aluguel@carcassonnepub.com.br>` (pedidos) e `Carcassonne Pub <conta@carcassonnepub.com.br>` (verificação/senha).
- Padrões de configuração: `isEnabled: false`, `pickupWeekdays: [0,1,2,3,4,5,6]`, `maxAdvanceDays: 30`, `maxGamesPerOrder: 3`, `maxActiveGamesPerCustomer: 3`, `requireCpf: true`.
- Queries com `where` não usam `orderBy` (evita índice composto); ordenar no cliente.

## Review Focus

1. **Virada do dia no fuso** — às 22h em Brasília já é amanhã em UTC; "hoje" tem que ser a data de Brasília. → teste em Task 1.
2. **Dois clientes pedindo a última unidade** — só um pedido pode passar; o segundo recebe "indisponível" com o nome do jogo e nada é reservado. → teste de `planOrder` com a reserva concorrente já presente (Task 4) + teste manual com duas abas (Task 13).
3. **Aluguel atrasado** — unidade retirada e vencida não pode aparecer como disponível nem aceitar reserva começando hoje. → testes em Task 3.
4. **Pedido parcial** — se um dos jogos do pedido não couber, nenhum é reservado. → teste em Task 4.
5. **Datas manipuladas no navegador** — data no passado, além de `maxAdvanceDays` ou em dia não permitido deve ser recusada pelo servidor. → testes em Task 4.

---

## File Structure

```
vitest.config.ts                                  novo — alias @ → src, só src/rental
firestore.rules, storage.rules                    novos — fonte da verdade das regras (colar no console)

src/rental/                                       módulo puro (sem Firebase/React)
  dates.ts        todaySP, addDays, diffDays, weekdayOf, formatDateBR
  money.ts        formatBRL, parseBRL
  cpf.ts          normalizeCpf, isValidCpf, formatCpf
  availability.ts bookingEnd, isUnitFree, earliestStartForUnit, gameAvailability, availabilityFor, pickUnit
  orders.ts       planOrder, canChangeDueDate, generateOrderCode, isProfileComplete, ORDER_ERROR_MESSAGES
  defaults.ts     DEFAULT_RENTAL_SETTINGS, DEFAULT_RENTAL_RULES
  __tests__/*.test.ts

src/types.ts                                      + tipos Rental*
src/services/server/firebaseAdmin.ts              adminDb, adminAuth
src/services/server/apiHelpers.ts                 ApiError, withApi, requireUser, requireAdmin
src/services/server/rentalService.ts              createOrder, cancelRental, pickupRental, returnRental, changeDueDate, saveCustomerProfile, setCustomerBlocked
src/services/server/accountEmails.tsx             sendVerificationEmail, sendPasswordResetEmail
src/services/server/rentalEmails.tsx              sendOrderConfirmation
src/components/react-email/accountActionEmail.tsx
src/components/react-email/rentalOrderEmail.tsx
src/services/rentalApi.ts                         cliente: chamadas às rotas com ID token
src/services/repositories/RentalGameRepository.ts
src/services/repositories/RentalConfigRepository.ts
src/services/repositories/RentalRepository.ts
src/services/repositories/RentalCustomerRepository.ts

src/app/api/rental/ping/route.ts
src/app/api/rental/orders/route.ts
src/app/api/rental/profile/route.ts
src/app/api/rental/rentals/[id]/{cancel,pickup,return,due-date}/route.ts
src/app/api/rental/customers/[uid]/block/route.ts
src/app/api/auth/send-verification/route.ts
src/app/api/auth/send-password-reset/route.ts

src/app/conta/acao/page.tsx                       verificação de e-mail / nova senha
src/app/(client)/aluguel/
  page.tsx, rentalShowcase.tsx, rentalGameCard.tsx, rentalGameDetail.tsx,
  availabilityBadge.tsx, useRentalCart.ts, useRentalCustomer.ts, rentalHeader.tsx
  regras/page.tsx, entrar/page.tsx, cadastro/page.tsx, pedido/page.tsx, minha-conta/page.tsx
src/app/(admin)/aluguel-admin/
  page.tsx, gamesTab.tsx, rentalGameForm.tsx, unitsEditor.tsx,
  rulesTab.tsx, settingsForm.tsx, rentalsTab.tsx, rentalActions.tsx, customersTab.tsx
src/app/(admin)/sidebar.tsx                       + item "Aluguel" e badge
```

---

### Task 1: Vitest + datas no fuso de Brasília

**Files:**
- Create: `vitest.config.ts`, `src/rental/dates.ts`, `src/rental/__tests__/dates.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `RENTAL_TZ = "America/Sao_Paulo"`
  - `todaySP(now?: Date): string` — `"YYYY-MM-DD"` em Brasília
  - `addDays(date: string, days: number): string`
  - `diffDays(from: string, to: string): number` — `to − from` em dias
  - `weekdayOf(date: string): number` — 0 = domingo
  - `formatDateBR(date: string, withYear?: boolean): string` — `"12/11"` / `"12/11/2026"`

- [ ] **Step 1:** `npm i -D vitest`; criar `vitest.config.ts` com `resolve.alias { "@": path.resolve(__dirname, "src") }` e `test.include: ["src/rental/**/*.test.ts"]`; script `"test": "vitest run"`.
- [ ] **Step 2: Write the failing test** `dates.test.ts`:

```ts
expect(todaySP(new Date("2026-11-06T01:30:00Z"))).toBe("2026-11-05"); // 22h30 em Brasília
expect(todaySP(new Date("2026-11-06T03:30:00Z"))).toBe("2026-11-06");
expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
expect(diffDays("2026-11-05", "2026-11-08")).toBe(3);
expect(diffDays("2026-11-08", "2026-11-05")).toBe(-3);
expect(weekdayOf("2026-11-08")).toBe(0); // domingo
expect(formatDateBR("2026-11-12")).toBe("12/11");
expect(formatDateBR("2026-11-12", true)).toBe("12/11/2026");
```

- [ ] **Step 3:** `npm test` → FAIL (módulo não existe).
- [ ] **Step 4: Implement** `dates.ts`. `todaySP` com `Intl.DateTimeFormat("en-CA", { timeZone: RENTAL_TZ })`; aritmética via `Date.UTC(y, m-1, d)` (nunca hora local).
- [ ] **Step 5:** `npm test` → PASS.
- [ ] **Step 6: Commit** `feat(aluguel): datas no fuso de Brasília + vitest`.

---

### Task 2: Dinheiro e CPF

**Files:**
- Create: `src/rental/money.ts`, `src/rental/cpf.ts`, `src/rental/__tests__/money.test.ts`, `src/rental/__tests__/cpf.test.ts`

**Interfaces:**
- Produces:
  - `formatBRL(cents: number): string` — usa `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`
  - `parseBRL(text: string): number | null` — centavos; aceita `"45"`, `"45,5"`, `"R$ 45,50"`, `"1.234,56"`; `null` para vazio, negativo ou inválido
  - `normalizeCpf(input: string): string` — só dígitos
  - `isValidCpf(input: string): boolean` — 11 dígitos, rejeita todos iguais, confere os 2 dígitos verificadores
  - `formatCpf(input: string): string` — `"123.456.789-09"`

- [ ] **Step 1: Write the failing tests:**

```ts
expect(formatBRL(4500).replace(/ /g, " ")).toBe("R$ 45,00");
expect(parseBRL("45")).toBe(4500);
expect(parseBRL("45,5")).toBe(4550);
expect(parseBRL("R$ 45,50")).toBe(4550);
expect(parseBRL("1.234,56")).toBe(123456);
expect(parseBRL("")).toBeNull();
expect(parseBRL("abc")).toBeNull();
expect(parseBRL("-10")).toBeNull();

expect(isValidCpf("529.982.247-25")).toBe(true);
expect(isValidCpf("52998224725")).toBe(true);
expect(isValidCpf("529.982.247-24")).toBe(false);
expect(isValidCpf("111.111.111-11")).toBe(false);
expect(isValidCpf("1234567890")).toBe(false);
expect(normalizeCpf(" 529.982.247-25 ")).toBe("52998224725");
expect(formatCpf("52998224725")).toBe("529.982.247-25");
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement** `money.ts` e `cpf.ts`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(aluguel): formatação de preço e validação de CPF`.

---

### Task 3: Tipos + disponibilidade

**Files:**
- Modify: `src/types.ts` (adicionar ao final)
- Create: `src/rental/availability.ts`, `src/rental/__tests__/availability.test.ts`, `src/rental/__tests__/fixtures.ts`

**Interfaces:**
- Produces (em `src/types.ts`):

```ts
export interface RentalUnit { id: string; label: string; status: "active" | "unavailable"; note?: string }
export interface RentalBooking { rentalId: string; unitId: string; startDate: string; dueDate: string; status: "reserved" | "picked_up" }
export interface RentalGameType {
  id?: string; name: string; description: string; image: string; difficulty: string;
  minPlayers: number; maxPlayers: number; playTime: number; types: string[];
  price: number; rentalDays: number; isActive: boolean;
  units: RentalUnit[]; bookings: RentalBooking[];
  sourceBoardgameId?: string; createdAt?: Timestamp; updatedAt?: Timestamp;
}
export type RentalStatus = "reserved" | "picked_up" | "returned" | "canceled";
export type RentalReturnCondition = "ok" | "damaged" | "missing_parts";
export interface RentalType {
  id?: string; orderId: string; code: string;
  customerUid: string; customer: { name: string; email: string; phone: string };
  gameId: string; gameName: string; unitId: string; unitLabel: string;
  price: number; rentalDays: number; startDate: string; dueDate: string;
  status: RentalStatus;
  pickedUpAt?: Timestamp; pickedUpBy?: string; returnedAt?: Timestamp; returnedBy?: string;
  returnCondition?: RentalReturnCondition; returnNote?: string;
  canceledAt?: Timestamp; canceledBy?: "customer" | "admin"; cancelReason?: string;
  rulesVersion: number; createdAt?: Timestamp;
}
export interface RentalCustomerType {
  id?: string; name: string; phone: string; cpf: string; email: string;
  isBlocked?: boolean; blockedReason?: string; acceptedTermsAt?: Timestamp; createdAt?: Timestamp;
}
export interface RentalSettingsType {
  isEnabled: boolean; pickupWeekdays: number[]; maxAdvanceDays: number;
  maxGamesPerOrder: number; maxActiveGamesPerCustomer: number; requireCpf: boolean; staffEmail?: string;
}
export interface RentalRuleSection { id: string; title: string; body: string }
export interface RentalRulesType { sections: RentalRuleSection[]; version: number; updatedAt?: Timestamp }
```

- Produces (em `availability.ts`):
  - `type GameLike = Pick<RentalGameType, "units" | "bookings" | "rentalDays">`
  - `bookingEnd(b: RentalBooking, today: string): string` — `picked_up` e `dueDate < today` → `today`; senão `dueDate`
  - `isUnitFree(unitId: string, bookings: RentalBooking[], start: string, end: string, today: string): boolean` — falso se algum booking da unidade cruza `[start, end]` (intervalos fechados, usando `bookingEnd`)
  - `earliestStartForUnit(unitId: string, bookings: RentalBooking[], rentalDays: number, today: string): { start: string; blocking: RentalBooking | null }` — candidatos: `today` e `bookingEnd(b)+1` de cada booking da unidade; menor candidato cuja janela `[c, c+rentalDays]` está livre; `blocking` = booking cujo fim gerou o candidato (null se for `today`)
  - `type GameAvailability = { state: "available" } | { state: "from"; start: string; returnDate?: string; daysUntilReturn?: number } | { state: "overdue" } | { state: "unavailable" }`
  - `gameAvailability(game: GameLike, today: string): GameAvailability`
    - sem unidade `active` → `unavailable`
    - alguma unidade com `earliestStart == today` → `available`
    - senão pega a unidade de menor `start`: se o `blocking` é `picked_up` com `dueDate < today` → `overdue`; se `blocking` é `picked_up` → `from` com `returnDate = blocking.dueDate`, `daysUntilReturn = diffDays(today, returnDate)`; senão `from` só com `start`
  - `availabilityFor(game: GameLike, start: string, today: string): { ok: true } | { ok: false; nextStart: string | null }` — `nextStart` = menor `earliestStartForUnit` ≥ `start` entre unidades ativas (null se nenhuma ativa)
  - `pickUnit(game: GameLike, start: string, today: string): string | null` — entre unidades ativas livres para `[start, start+rentalDays]`, a de menor folga antes de `start` (folga = `start − (maior bookingEnd < start)`; sem booking anterior = infinita); empate → ordem de `units`

- [ ] **Step 1: Write the failing tests** (`today = "2026-11-05"`, `rentalDays = 7`; helpers em `src/rental/__tests__/fixtures.ts`, reutilizados na Task 4: `unit(id, status = "active")`, `bk(unitId, start, due, status, rentalId = "r")`):

```ts
// sem reservas
expect(gameAvailability({ units: [unit("u1")], bookings: [], rentalDays: 7 }, today)).toEqual({ state: "available" });
// exemplo da especificação: retirado há 4 dias, prazo 7 → volta em 3 dias
const out = { units: [unit("u1")], bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up")], rentalDays: 7 };
expect(gameAvailability(out, today)).toEqual({ state: "from", start: "2026-11-09", returnDate: "2026-11-08", daysUntilReturn: 3 });
// atrasado: venceu ontem, não devolvido
const late = { units: [unit("u1")], bookings: [bk("u1", "2026-10-28", "2026-11-04", "picked_up")], rentalDays: 7 };
expect(gameAvailability(late, today)).toEqual({ state: "overdue" });
expect(availabilityFor(late, today, today)).toEqual({ ok: false, nextStart: "2026-11-06" });
// reserva futura curta impede começar hoje (janela de 7 dias não cabe)
const future = { units: [unit("u1")], bookings: [bk("u1", "2026-11-10", "2026-11-17", "reserved")], rentalDays: 7 };
expect(gameAvailability(future, today)).toEqual({ state: "from", start: "2026-11-18" });
// a outra unidade livre resolve
expect(gameAvailability({ ...future, units: [unit("u1"), unit("u2")] }, today)).toEqual({ state: "available" });
// unidade indisponível não conta
expect(gameAvailability({ units: [unit("u1", "unavailable")], bookings: [], rentalDays: 7 }, today)).toEqual({ state: "unavailable" });
// folga: devolução dia 8 → nova reserva só a partir do dia 9
expect(availabilityFor(out, "2026-11-08", today)).toEqual({ ok: false, nextStart: "2026-11-09" });
expect(availabilityFor(out, "2026-11-09", today)).toEqual({ ok: true });
// pickUnit escolhe o encaixe mais justo
const two = { units: [unit("u1"), unit("u2")], bookings: [bk("u2", "2026-11-01", "2026-11-08", "picked_up")], rentalDays: 7 };
expect(pickUnit(two, "2026-11-09", today)).toBe("u2");
expect(pickUnit(two, today, today)).toBe("u1");
expect(pickUnit(late, today, today)).toBeNull();
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement** tipos e `availability.ts` (importa só de `./dates` e `@/types`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(aluguel): tipos e cálculo de disponibilidade`.

---

### Task 4: Planejamento e validação do pedido + padrões

**Files:**
- Create: `src/rental/orders.ts`, `src/rental/defaults.ts`, `src/rental/__tests__/orders.test.ts`

**Interfaces:**
- Consumes: `availability.ts`, `dates.ts`, `cpf.ts`, tipos da Task 3.
- Produces:
  - `DEFAULT_RENTAL_SETTINGS: RentalSettingsType` (valores das Global Constraints)
  - `DEFAULT_RENTAL_RULES: RentalRulesType` — `version: 1`, 8 seções com ids estáveis e títulos: "Prazos e períodos de aluguel", "Retirada e devolução", "Atrasos", "Formas de pagamento", "Danos aos jogos", "Perda de peças ou componentes", "Furto ou extravio", "Demais condições"; corpo inicial `"A definir pelo Carcassonne Pub."`
  - `type OrderInput = { gameIds: string[]; startDate: string; rulesVersion: number }`
  - `type OrderErrorCode = "service_disabled" | "email_not_verified" | "profile_incomplete" | "customer_blocked" | "rules_outdated" | "empty_order" | "too_many_games" | "duplicate_game" | "date_out_of_range" | "weekday_not_allowed" | "active_limit" | "game_not_found" | "game_inactive" | "game_unavailable"`
  - `type OrderContext = { today: string; settings: RentalSettingsType; rulesVersion: number; customer: RentalCustomerType | null; emailVerified: boolean; activeGamesCount: number; games: Record<string, RentalGameType & { id: string }> }`
  - `type PlannedItem = { gameId: string; unitId: string; unitLabel: string; startDate: string; dueDate: string; price: number; rentalDays: number }`
  - `planOrder(input: OrderInput, ctx: OrderContext): { ok: true; items: PlannedItem[] } | { ok: false; code: OrderErrorCode; gameId?: string }` — checa na ordem do tipo `OrderErrorCode`; para cada jogo: existe → ativo → `pickUnit`; qualquer falha devolve erro sem itens
  - `isProfileComplete(customer: RentalCustomerType | null, requireCpf: boolean): boolean` — nome ≥ 3 chars, telefone ≥ 10 dígitos, CPF válido se exigido
  - `canChangeDueDate(game: GameLike, rentalId: string, newDue: string, today: string): boolean` — `newDue ≥ startDate` do booking e a janela nova não cruza outro booking da mesma unidade
  - `generateOrderCode(random?: () => number): string` — 6 caracteres de `"ABCDEFGHJKMNPQRSTUVWXYZ23456789"`
  - `ORDER_ERROR_MESSAGES: Record<OrderErrorCode, string>` — textos em português para a interface (ex.: `game_unavailable: "Este jogo não está mais disponível para a data escolhida."`)

- [ ] **Step 1: Write the failing tests** (`fixtures.ts` da Task 3 ganha `withBooking(ctx, gameId, booking)` e `withSettings(ctx, patch)`, que devolvem cópias; contexto base `ctx` válido: settings padrão com `isEnabled: true`, cliente completo com CPF `"52998224725"`, `emailVerified: true`, `activeGamesCount: 0`, `rulesVersion: 1`, jogos `g1`/`g2` ativos com 1 unidade e sem bookings, `price 4500`, `rentalDays 7`):

```ts
const ok = planOrder({ gameIds: ["g1", "g2"], startDate: "2026-11-05", rulesVersion: 1 }, ctx);
expect(ok).toEqual({ ok: true, items: [
  expect.objectContaining({ gameId: "g1", unitId: "u1", startDate: "2026-11-05", dueDate: "2026-11-12", price: 4500 }),
  expect.objectContaining({ gameId: "g2" }),
]});
// tudo ou nada: g2 ocupado → erro aponta g2, sem itens
const busy = withBooking(ctx, "g2", bk("u1", "2026-11-03", "2026-11-10", "reserved"));
expect(planOrder({ gameIds: ["g1", "g2"], startDate: "2026-11-05", rulesVersion: 1 }, busy)).toEqual({ ok: false, code: "game_unavailable", gameId: "g2" });
// concorrência: o pedido de outro cliente já gravou a única unidade
const taken = withBooking(ctx, "g1", bk("u1", "2026-11-05", "2026-11-12", "reserved"));
expect(planOrder({ gameIds: ["g1"], startDate: "2026-11-05", rulesVersion: 1 }, taken)).toMatchObject({ ok: false, code: "game_unavailable" });
// datas manipuladas
expect(planOrder({ gameIds: ["g1"], startDate: "2026-11-04", rulesVersion: 1 }, ctx)).toMatchObject({ code: "date_out_of_range" });
expect(planOrder({ gameIds: ["g1"], startDate: "2026-12-06", rulesVersion: 1 }, ctx)).toMatchObject({ code: "date_out_of_range" }); // > 30 dias
expect(planOrder({ gameIds: ["g1"], startDate: "2026-11-08", rulesVersion: 1 }, withSettings(ctx, { pickupWeekdays: [1,2,3,4,5,6] }))).toMatchObject({ code: "weekday_not_allowed" });
// limites e estado do cliente
expect(planOrder({ gameIds: ["g1", "g1"], startDate: "2026-11-05", rulesVersion: 1 }, ctx)).toMatchObject({ code: "duplicate_game" });
expect(planOrder({ gameIds: ["g1"], startDate: "2026-11-05", rulesVersion: 1 }, { ...ctx, activeGamesCount: 3 })).toMatchObject({ code: "active_limit" });
expect(planOrder({ gameIds: ["g1"], startDate: "2026-11-05", rulesVersion: 0 }, ctx)).toMatchObject({ code: "rules_outdated" });
expect(planOrder({ gameIds: ["g1"], startDate: "2026-11-05", rulesVersion: 1 }, { ...ctx, emailVerified: false })).toMatchObject({ code: "email_not_verified" });
expect(planOrder({ gameIds: ["g1"], startDate: "2026-11-05", rulesVersion: 1 }, withSettings(ctx, { isEnabled: false }))).toMatchObject({ code: "service_disabled" });
// CPF opcional por configuração
expect(isProfileComplete({ ...customer, cpf: "" }, false)).toBe(true);
expect(isProfileComplete({ ...customer, cpf: "" }, true)).toBe(false);
// prazo
const g = { units: [unit("u1")], bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up", "r1"), bk("u1", "2026-11-12", "2026-11-19", "reserved", "r2")], rentalDays: 7 };
expect(canChangeDueDate(g, "r1", "2026-11-11", today)).toBe(true);
expect(canChangeDueDate(g, "r1", "2026-11-12", today)).toBe(false);
expect(generateOrderCode(() => 0)).toBe("AAAAAA");
expect(generateOrderCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/); // sem I, L, O, 0, 1
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement** `orders.ts` e `defaults.ts`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(aluguel): planejamento e validação do pedido`.

---

### Task 5: Regras do Firestore e do Storage

**Files:**
- Create: `firestore.rules`, `storage.rules` (raiz do repositório — fonte da verdade; publicar colando no console)

- [ ] **Step 1:** Criar `firestore.rules` partindo das regras atuais (seção "Regras do Firestore (completas)" da conversa de 2026-11-05, com `isAdmin()`/`isSelf()`, `admins`, `adminRequests`) e acrescentar antes do curinga:

```
match /rentalGames/{gameId} {
  allow read: if true;
  allow create: if isAdmin() && request.resource.data.bookings == [];
  allow update: if isAdmin()
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['bookings']);
  allow delete: if isAdmin() && resource.data.bookings.size() == 0;
}
match /rental-config/{docId} {
  allow read: if true;
  allow write: if isAdmin();
}
match /rentals/{rentalId} {
  allow read: if isAdmin() || (request.auth != null && resource.data.customerUid == request.auth.uid);
  allow write: if false;
}
match /rentalCustomers/{uid} {
  allow read: if isSelf(uid) || isAdmin();
  allow write: if false;
}
match /rentalCpfIndex/{cpf} { allow read, write: if false; }
match /authEmailThrottle/{id} { allow read, write: if false; }
```

  e trocar a lista do curinga por `['admins', 'adminRequests', 'rentals', 'rentalCustomers', 'rentalCpfIndex', 'authEmailThrottle']`. **Atenção:** como as regras se somam, o curinga `allow write: if isAdmin()` também cobre essas coleções — trocar o curinga para `allow write: if isAdmin() && !(collection in ['rentalGames', 'rentals', 'rentalCustomers', 'rentalCpfIndex', 'authEmailThrottle']);` para que a proteção de `bookings` e a escrita só-servidor valham também para admin.
- [ ] **Step 2:** Criar `storage.rules` partindo das regras de Storage da mesma conversa e acrescentar `match /rental-games/{fileName} { allow read: if true; allow write: if isAdmin(); }`.
- [ ] **Step 3: Verify:** no console do Firebase, aba "Regras" → **Playground de regras**: (a) leitura anônima de `rentals/x` → negada; (b) leitura anônima de `rentalGames/x` → permitida; (c) update autenticado como admin em `rentalGames/x` alterando `bookings` → negado. Publicar.
- [ ] **Step 4: Commit** `chore(aluguel): regras do Firestore e Storage versionadas`.

---

### Task 6: Firebase Admin SDK e utilitários de rota

**Files:**
- Create: `src/services/server/firebaseAdmin.ts`, `src/services/server/apiHelpers.ts`, `src/app/api/rental/ping/route.ts`
- Modify: `README.md` (variáveis novas)

**Interfaces:**
- Produces:
  - `adminDb: Firestore`, `adminAuth: Auth` — `initializeApp` uma vez (`getApps().length`), `cert({ projectId, clientEmail, privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n") })`; arquivo começa com `import "server-only"` (instalar `server-only` se ausente)
  - `class ApiError extends Error { constructor(status: number, code: string, message: string, extra?: Record<string, unknown>) }`
  - `withApi(handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<unknown>)` — retorna `Response.json({ ok: true, data })`; `ApiError` → `{ ok: false, code, message, ...extra }` com o status; erro inesperado → 500 `{ ok: false, code: "internal" }` e `console.error`
  - `requireUser(req: Request): Promise<DecodedIdToken>` — header `Authorization: Bearer <token>`, `adminAuth.verifyIdToken`; falha → `ApiError(401, "unauthenticated", ...)`
  - `requireAdmin(req: Request): Promise<DecodedIdToken>` — `requireUser` + existe `admins/{uid}`; senão `ApiError(403, "forbidden", ...)`
  - `GET /api/rental/ping` (admin) → `{ ok: true, data: { project: <projectId> } }`

- [ ] **Step 1: PARAR e entregar ao usuário o passo a passo da conta de serviço** (ele pediu para receber nessa hora): Console Firebase → ⚙️ Configurações do projeto → Contas de serviço → "Gerar nova chave privada" → do JSON baixado copiar `project_id`, `client_email`, `private_key` para `.env` (local) e para as variáveis de ambiente da hospedagem, como `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (a chave entre aspas, com `\n`); `SITE_URL=http://localhost:3000` no `.env` local. Avisar: nunca commitar o JSON; apagar o arquivo baixado depois de copiar.
- [ ] **Step 2: Implement** os três arquivos; documentar as variáveis no README.
- [ ] **Step 3: Verify:** `npm run dev`; `curl http://localhost:3000/api/rental/ping` sem header → 401 `{ ok: false, code: "unauthenticated" }`. Com admin: botão temporário (só em desenvolvimento) que chama a rota com `auth.currentUser.getIdToken()` → `{ ok: true, data: { project: "carcassonne-admin" } }`; remover o botão antes do commit.
- [ ] **Step 4: Commit** `feat(aluguel): Firebase Admin SDK e utilitários de rota`.

---

### Task 7: Repositórios do cliente e cliente HTTP

**Files:**
- Create: `src/services/repositories/RentalGameRepository.ts`, `RentalConfigRepository.ts`, `RentalRepository.ts`, `RentalCustomerRepository.ts`, `src/services/rentalApi.ts`

**Interfaces:**
- Consumes: tipos (Task 3), defaults (Task 4).
- Produces:
  - `RentalGameRepository.subscribeToAll(cb: (games: (RentalGameType & { id: string })[]) => void): () => void` (ordenado por nome)
  - `RentalGameRepository.create(data: Omit<RentalGameType, "id" | "bookings" | "createdAt" | "updatedAt">): Promise<string | null>` — grava `bookings: []`, `createdAt`/`updatedAt` = `serverTimestamp()`
  - `RentalGameRepository.update(id: string, patch: Partial<Omit<RentalGameType, "id" | "bookings" | "createdAt">>): Promise<boolean>` — sempre grava `updatedAt`
  - `RentalGameRepository.delete(id: string): Promise<boolean>`
  - `RentalConfigRepository.subscribeSettings(cb: (s: RentalSettingsType) => void)` — doc `rental-config/settings`, mescla com `DEFAULT_RENTAL_SETTINGS`
  - `RentalConfigRepository.subscribeRules(cb: (r: RentalRulesType) => void)` — doc `rental-config/rules`, ausente → `DEFAULT_RENTAL_RULES`
  - `RentalConfigRepository.saveSettings(s: RentalSettingsType): Promise<boolean>`
  - `RentalConfigRepository.publishRules(sections: RentalRuleSection[]): Promise<boolean>` — `setDoc(..., { sections, version: increment(1), updatedAt }, { merge: true })`; se o doc não existia, gravar `version: DEFAULT_RENTAL_RULES.version + 1`
  - `RentalRepository.subscribeToCustomer(uid: string, cb)` — `where("customerUid", "==", uid)`, ordena por `createdAt` desc no cliente
  - `RentalRepository.subscribeToAll(cb)` — admin
  - `RentalCustomerRepository.subscribeToOwn(uid: string, cb: (c: (RentalCustomerType & { id: string }) | null) => void)`
  - `RentalCustomerRepository.subscribeToAll(cb)` — admin
  - `type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; gameId?: string }`
  - `rentalApi`: `createOrder(input: OrderInput): Promise<ApiResult<{ orderId: string; code: string }>>`, `cancel(id: string, reason?: string)`, `pickup(id: string)`, `returnRental(id: string, body: { condition: RentalReturnCondition; note?: string; markUnitUnavailable: boolean })`, `changeDueDate(id: string, dueDate: string)`, `saveProfile(body: { name: string; phone: string; cpf: string; acceptTerms: boolean })`, `setBlocked(uid: string, blocked: boolean, reason?: string)`
  - `accountApi`: `sendVerification(from: "admin" | "aluguel"): Promise<ApiResult<null>>`, `sendPasswordReset(email: string, from: "admin" | "aluguel"): Promise<ApiResult<null>>`
  - Um `call<T>(path, body?, { auth?: boolean })` interno: `POST`, `Authorization` com `auth.currentUser.getIdToken()` quando `auth !== false`; falha de rede → `{ ok: false, code: "network", message: "Sem conexão. Tente novamente." }`

- [ ] **Step 1: Implement** os cinco arquivos seguindo `AdminRepository.ts`/`VotingEntryRepository.ts`.
- [ ] **Step 2: Verify:** `npx tsc --noEmit` → sem erros.
- [ ] **Step 3: Commit** `feat(aluguel): repositórios e cliente das rotas`.

---

### Task 8: Admin — página do aluguel e aba Jogos

**Files:**
- Create: `src/app/(admin)/aluguel-admin/page.tsx`, `gamesTab.tsx`, `rentalGameForm.tsx`, `unitsEditor.tsx`
- Modify: `src/app/(admin)/sidebar.tsx` (item `{ path: "/aluguel-admin", message: "Aluguel", icon: <LuPackage size={18} /> }` depois de "Coleção")

**Interfaces:**
- Consumes: `RentalGameRepository`, `gameAvailability`/`bookingEnd`, `formatBRL`/`parseBRL`, `BoardgameRepository.getAll()`, `uploadImageToFirebase(file, "rental-games")`, componentes `adminCatalog` (`CatalogSearch`, `CatalogItems`, `CatalogEmpty`, `CatalogSkeleton`, `FilterPills`, `ViewToggle`, `useCatalogView`), `Modal`, `Input`, `Dropdown`, `Checkbox`, `OptionsInput`, `FormCard`, `difficultiesOptions`.
- Produces:
  - `page.tsx`: abas via `?tab=` — `alugueis` (padrão; placeholder até a Task 17), `jogos`, `clientes` (placeholder até a Task 17), `regras` (placeholder até a Task 9)
  - `unitStatus(game, unit, today): "free" | "reserved" | "rented" | "overdue" | "unavailable"` exportado de `unitsEditor.tsx` (usado também na Task 17)

- [ ] **Step 1: Implement** `gamesTab.tsx`: lista em tempo real, busca, filtros `Todos | Ativos | Inativos | Esgotados` (esgotado = `gameAvailability().state !== "available"`), totais no topo (unidades totais / livres / alugadas / indisponíveis), toggle ativo com atualização otimista como `collection/page.tsx`.
- [ ] **Step 2: Implement** `rentalGameForm.tsx` (criar/editar): campos do acervo + preço (texto → `parseBRL`, obrigatório > 0), prazo em dias (inteiro 1–60), ativo, imagem (upload para `rental-games/`); seletor "Importar do acervo do pub" que copia `name, description, image, difficulty, minPlayers, maxPlayers, playTime, types` e grava `sourceBoardgameId`. Excluir jogo só se `bookings.length === 0` (senão alerta "Há aluguéis em aberto para este jogo.").
- [ ] **Step 3: Implement** `unitsEditor.tsx`: adicionar ("Cópia N"), renomear, alternar `active/unavailable`, observação, remover; mostrar `unitStatus` com data (ex.: "Alugada até 12/11"); remover bloqueado se a unidade tem booking (alerta). `id` novo = `crypto.randomUUID()`.
- [ ] **Step 4: Verify (manual):** `npm run dev` → `/aluguel-admin?tab=jogos`: criar jogo com 2 cópias, importar outro do acervo, inativar/ativar, editar preço; conferir no console do Firestore que `bookings` é `[]` e `price` em centavos. Tentar excluir uma unidade (sem bookings) → funciona.
- [ ] **Step 5:** `npx tsc --noEmit && npx eslint "src/app/(admin)/aluguel-admin"` → sem erros.
- [ ] **Step 6: Commit** `feat(aluguel): admin — cadastro de jogos e unidades`.

---

### Task 9: Admin — regras e configurações

**Files:**
- Create: `src/app/(admin)/aluguel-admin/rulesTab.tsx`, `settingsForm.tsx`
- Modify: `src/app/(admin)/aluguel-admin/page.tsx` (aba `regras`)

**Interfaces:**
- Consumes: `RentalConfigRepository`, `DEFAULT_RENTAL_RULES`.
- Produces: `RichText({ text }: { text: string })` exportado de `rulesTab.tsx` — `**negrito**` e quebras de linha, mesmo comportamento de `richText` em `clientResponseTemplate.tsx` (texto escapado pelo React; nenhuma injeção de HTML). Usado na Task 10.

- [ ] **Step 1: Implement** `rulesTab.tsx`: lista de seções (título + textarea), adicionar, remover, mover ↑/↓, prévia com `RichText`, botão "Publicar regras" (`publishRules`) mostrando a versão atual; aviso "Publicar exige que clientes aceitem a nova versão no próximo pedido."
- [ ] **Step 2: Implement** `settingsForm.tsx`: serviço ativo, dias de retirada (7 checkboxes Dom–Sáb, pelo menos 1), `maxAdvanceDays` (0–90), `maxGamesPerOrder` (1–10), `maxActiveGamesPerCustomer` (1–10), exigir CPF, e-mail da equipe (opcional, validado).
- [ ] **Step 3: Verify (manual):** editar e publicar regras → `rental-config/rules.version` sobe 1; salvar configurações → doc atualizado.
- [ ] **Step 4:** `npx tsc --noEmit` → OK.
- [ ] **Step 5: Commit** `feat(aluguel): admin — regras e configurações`.

---

### Task 10: Cliente — catálogo e página de regras

**Files:**
- Create: `src/app/(client)/aluguel/page.tsx`, `rentalShowcase.tsx`, `rentalGameCard.tsx`, `rentalGameDetail.tsx`, `availabilityBadge.tsx`, `useRentalCart.ts`, `rentalHeader.tsx`, `regras/page.tsx`

**Interfaces:**
- Consumes: `RentalGameRepository.subscribeToAll`, `RentalConfigRepository`, `gameAvailability`, `todaySP`, `formatBRL`, `formatDateBR`, `RichText`, `DetailSheet`, `ShowcaseImage`, `DifficultyMeter`, `playersLabel`, `playTimeLabel`, `search` de `showcase/search`.
- Produces:
  - `useRentalCart(): { gameIds: string[]; add(id: string): void; remove(id: string): void; clear(): void; has(id: string): boolean }` — `localStorage` chave `carcassonne-rental-cart`, leitura/escrita em `try/catch`, sincroniza entre abas via evento `storage`
  - `AvailabilityBadge({ availability }: { availability: GameAvailability })` — textos: `available` → "Disponível"; `from` com `daysUntilReturn` → "Volta em N dia(s)" (0 → "Volta hoje"); `from` sem retorno → "Disponível a partir de dd/mm"; `overdue` → "Retorno atrasado"; `unavailable` → "Indisponível"
  - `RentalHeader` — título, links "Regras", "Minha conta"/"Entrar" e contador do carrinho → `/aluguel/pedido`

- [ ] **Step 1: Implement** catálogo: mostra só `isActive`; quando `settings.isEnabled === false`, tela "Aluguel de jogos em breve" (admin logado vê o catálogo com aviso "Serviço desativado — só você está vendo"). "Hoje" recalculado a cada minuto para os selos.
- [ ] **Step 2: Implement** detalhe: igual ao `GameDetail` do acervo + preço, prazo ("7 dias"), nº de cópias, selo, botão "Adicionar ao pedido"/"No pedido ✓" (desabilitado se `unavailable`).
- [ ] **Step 3: Implement** `regras/page.tsx`: seções com `RichText`, versão e data de atualização.
- [ ] **Step 4: Verify (manual):** com a Task 8, criar jogo com 1 cópia e, no console do Firestore, adicionar à mão em `bookings` `{ rentalId:"t", unitId:<id>, startDate:<hoje−4>, dueDate:<hoje+3>, status:"picked_up" }` → card mostra "Volta em 3 dias"; mudar `dueDate` para ontem → "Retorno atrasado"; remover → "Disponível". Inativar o jogo → some do catálogo. Testar em largura de celular (375px).
- [ ] **Step 5:** `npx tsc --noEmit` → OK.
- [ ] **Step 6: Commit** `feat(aluguel): catálogo público e página de regras`.

---

### Task 11: E-mails de conta próprios (verificação e nova senha)

**Files:**
- Create: `src/components/react-email/accountActionEmail.tsx`, `src/services/server/accountEmails.tsx`, `src/app/api/auth/send-verification/route.ts`, `src/app/api/auth/send-password-reset/route.ts`, `src/app/conta/acao/page.tsx`
- Modify: `src/app/signup/page.tsx` (trocar `sendEmailVerification(user)` por `accountApi.sendVerification("admin")` antes do `signOut`), `src/app/page.tsx` (`handleForgotPassword` → `accountApi.sendPasswordReset(user.email, "admin")`), `src/components/siteTheme/SiteThemeProvider.tsx` (`UNTHEMED_PATHS` + `"/conta/acao"`)

**Interfaces:**
- Consumes: `adminAuth`, `adminDb`, `withApi`, `requireUser`, `Resend`.
- Produces:
  - `AccountActionEmail({ kind, link }: { kind: "verify" | "reset"; link: string })` — mesmo visual claro de `ClientReservationEmail` (cores `color.*` de lá); textos: verify → título "Confirme seu e-mail ✉️", botão "Confirmar e-mail"; reset → "Redefinir sua senha 🔑", botão "Criar nova senha", aviso "Este link vale por 1 hora e só pode ser usado uma vez."
  - `buildActionLink(firebaseLink: string, mode: "verifyEmail" | "resetPassword", from: "admin" | "aluguel"): string` — extrai `oobCode` e devolve `${SITE_URL}/conta/acao?mode=…&oobCode=…&from=…`
  - `sendVerificationEmail(uid: string, from): Promise<void>` — `adminAuth.getUser(uid)`; já verificado → `ApiError(409, "already_verified", …)`
  - `sendPasswordResetEmail(email: string, from): Promise<void>` — throttle 60 s em `authEmailThrottle/{sha256(email minúsculo)}`; e-mail inexistente ou throttled → **não** lança (resposta idêntica)
  - `POST /api/auth/send-verification` body `{ from }` (usuário logado); `POST /api/auth/send-password-reset` body `{ email, from }` (público, sempre `{ ok: true }` salvo erro interno)
  - `/conta/acao`: `mode=verifyEmail` → `applyActionCode` → "E-mail confirmado!" + botão para `/` (admin) ou `/aluguel/entrar` (aluguel); `mode=resetPassword` → `verifyPasswordResetCode` mostra o e-mail → nova senha + confirmação (mín. 6) → `confirmPasswordReset` → sucesso + botão para o login certo; link inválido/expirado → mensagem e botão "Pedir novo link" (volta ao login)

- [ ] **Step 1: Implement** os arquivos.
- [ ] **Step 2: Verify (manual):** criar conta de teste em `/signup` → chega o e-mail novo (visual do pub) → link abre `/conta/acao` → "E-mail confirmado!". No login do admin, "Esqueci minha senha" → e-mail novo → trocar a senha → entrar com a nova. Clicar de novo em menos de 60 s → nenhum e-mail novo, mesma mensagem na tela. E-mail inexistente → mesma mensagem.
- [ ] **Step 3:** `npx tsc --noEmit` → OK.
- [ ] **Step 4: Commit** `feat(conta): e-mails próprios de verificação e redefinição de senha`.

---

### Task 12: Contas de cliente do aluguel

**Files:**
- Create: `src/app/(client)/aluguel/entrar/page.tsx`, `cadastro/page.tsx`, `useRentalCustomer.ts`, `src/app/api/rental/profile/route.ts`
- Modify: `src/services/server/rentalService.ts` (criar arquivo com `saveCustomerProfile`)

**Interfaces:**
- Consumes: `accountApi`, `rentalApi.saveProfile`, `RentalCustomerRepository.subscribeToOwn`, `isValidCpf`/`normalizeCpf`/`formatCpf`, `AuthCard`, `AuthBackground`.
- Produces:
  - `saveCustomerProfile(uid: string, email: string, body: { name: string; phone: string; cpf: string; acceptTerms: boolean }): Promise<void>` — valida (nome ≥ 3, telefone 10–11 dígitos, CPF válido quando `requireCpf`, `acceptTerms` obrigatório na criação); transação: se o CPF mudou, `rentalCpfIndex/{cpf}` não pode existir para outro uid (`ApiError(409, "cpf_in_use", "Este CPF já está cadastrado em outra conta.")`), cria o novo índice e apaga o antigo; grava `rentalCustomers/{uid}` (`email` do token, `acceptedTermsAt` e `createdAt` só na criação)
  - `POST /api/rental/profile` (usuário logado)
  - `useRentalCustomer(): { user: FirebaseUser | null; customer: (RentalCustomerType & { id: string }) | null; loading: boolean; emailVerified: boolean; reloadUser(): Promise<void> }` — `reloadUser` chama `user.reload()` e `getIdToken(true)` (para o servidor ver `email_verified` novo)

- [ ] **Step 1: Implement** cadastro: nome, WhatsApp (máscara), CPF (máscara, se `requireCpf`), e-mail, senha, confirmação, checkbox "Li e aceito as regras do aluguel" (link para `/aluguel/regras`). Fluxo: `createUserWithEmailAndPassword` → `saveProfile` → `accountApi.sendVerification("aluguel")` → vai para `/aluguel/minha-conta` com banner "Confirme seu e-mail" (botões "Reenviar" e "Já confirmei" → `reloadUser`). Se `saveProfile` falhar (ex.: CPF em uso), mostra o erro e permite corrigir sem recriar a conta (quem está logado e sem perfil vê o formulário de perfil em `/aluguel/minha-conta`).
- [ ] **Step 2: Implement** entrar: e-mail/senha, "Esqueci minha senha" → `accountApi.sendPasswordReset(email, "aluguel")`, link para cadastro; após login → volta para `?next=` ou `/aluguel`.
- [ ] **Step 3: Verify (manual):** cadastrar cliente → doc em `rentalCustomers/{uid}` e `rentalCpfIndex/{cpf}`; segundo cadastro com o mesmo CPF → "Este CPF já está cadastrado em outra conta."; login dessa conta em `/` (admin) → "Esta conta não tem acesso à área do administrador."
- [ ] **Step 4:** `npx tsc --noEmit` → OK.
- [ ] **Step 5: Commit** `feat(aluguel): cadastro e login de clientes`.

---

### Task 13: Rota de pedido (transação) + e-mail de confirmação

**Files:**
- Modify: `src/services/server/rentalService.ts` (+ `createOrder`)
- Create: `src/app/api/rental/orders/route.ts`, `src/components/react-email/rentalOrderEmail.tsx`, `src/services/server/rentalEmails.tsx`

**Interfaces:**
- Consumes: `planOrder`, `generateOrderCode`, `todaySP`, `adminDb`, `requireUser`, `DEFAULT_RENTAL_SETTINGS`/`DEFAULT_RENTAL_RULES`.
- Produces:
  - `createOrder(token: DecodedIdToken, input: OrderInput): Promise<{ orderId: string; code: string }>` — `adminDb.runTransaction`: lê settings, rules (versão), `rentalCustomers/{uid}`, jogos do pedido e conta os `rentals` do cliente com status `reserved|picked_up` (query dentro da transação); monta `OrderContext` (`emailVerified = token.email_verified === true`); `planOrder`; erro → `ApiError(409, code, ORDER_ERROR_MESSAGES[code], { gameId })`; sucesso → cria um `rentals/{id}` por item (mesmo `orderId` = id gerado, mesmo `code`), e `update` de cada jogo com `bookings` + novo booking `reserved`. Depois da transação, `sendOrderConfirmation` (falha no e-mail só gera `console.error`, não desfaz o pedido)
  - `POST /api/rental/orders` body `OrderInput`
  - `RentalOrderEmail({ customerName, code, items: { gameName; startDate; dueDate; price }[], total, rulesUrl })` — visual de `ClientReservationEmail`: código em destaque, tabela de jogos com retirada/devolução, total, "Pagamento no balcão, na retirada", endereço `📍 CLN 407 Bloco E Loja 37 — Asa Norte, Brasília/DF`, link para as regras
  - `sendOrderConfirmation(to: string, props, staffEmail?: string)` — assunto `🎲 Aluguel confirmado — código {code} · Carcassonne Pub`; cópia para `staffEmail` se configurado

- [ ] **Step 1: Implement**.
- [ ] **Step 2: Verify (manual, com Task 14 ou via `fetch` no console logado como cliente verificado):** pedido de 2 jogos → 2 docs em `rentals` com o mesmo `code`, `bookings` atualizados, e-mail recebido. **Concorrência:** jogo com 1 cópia, dois navegadores (duas contas) confirmando a mesma data ao mesmo tempo → um recebe sucesso, o outro `game_unavailable` com `gameId`; só 1 booking no jogo. Pedido com `startDate` de ontem via `fetch` → `date_out_of_range`.
- [ ] **Step 3:** `npx tsc --noEmit` → OK.
- [ ] **Step 4: Commit** `feat(aluguel): criação de pedido com transação e e-mail`.

---

### Task 14: Página do pedido (checkout)

**Files:**
- Create: `src/app/(client)/aluguel/pedido/page.tsx`

**Interfaces:**
- Consumes: `useRentalCart`, `useRentalCustomer`, `RentalGameRepository`, `RentalConfigRepository`, `availabilityFor`, `addDays`, `todaySP`, `weekdayOf`, `formatBRL`, `formatDateBR`, `isProfileComplete`, `rentalApi.createOrder`, `ORDER_ERROR_MESSAGES`.

- [ ] **Step 1: Implement:** lista do carrinho (remover item; itens inativos/removidos aparecem riscados com "não está mais disponível" e bloqueiam o envio até remover); seletor de data com os próximos `maxAdvanceDays + 1` dias, desabilitando dias fora de `pickupWeekdays`; por jogo: "Disponível" ou "Disponível a partir de dd/mm" (botão "Usar esta data") via `availabilityFor`; resumo com devolução por jogo (`startDate + rentalDays`), total, "Pagamento no balcão, na retirada"; checkbox de aceite das regras (versão atual). Botão "Confirmar aluguel": sem login → `/aluguel/entrar?next=/aluguel/pedido`; perfil incompleto → `/aluguel/minha-conta`; e-mail não verificado → banner com "Reenviar"/"Já confirmei". Erro do servidor → mensagem de `ORDER_ERROR_MESSAGES` e, com `gameId`, destaca o jogo. Sucesso → limpa o carrinho e mostra o código + "Ver meus aluguéis".
- [ ] **Step 2: Verify (manual):** fluxo completo como cliente novo (cadastro → verificar e-mail → pedido); data num dia desabilitado não é selecionável; limite de 3 jogos mostra o aviso antes de enviar.
- [ ] **Step 3:** `npx tsc --noEmit` → OK.
- [ ] **Step 4: Commit** `feat(aluguel): página do pedido`.

---

### Task 15: Minha conta + cancelamento pelo cliente

**Files:**
- Create: `src/app/(client)/aluguel/minha-conta/page.tsx`, `src/app/api/rental/rentals/[id]/cancel/route.ts`
- Modify: `src/services/server/rentalService.ts` (+ `cancelRental`)

**Interfaces:**
- Produces:
  - `cancelRental(rentalId: string, actor: { uid: string; isAdmin: boolean }, reason?: string): Promise<void>` — transação: cliente só cancela o próprio e só se `reserved` (`ApiError(409, "not_cancelable", "Este aluguel não pode mais ser cancelado.")`); admin cancela `reserved` ou `picked_up`; marca `canceled`, `canceledAt`, `canceledBy`, `cancelReason`, remove o booking do jogo
  - `POST /api/rental/rentals/:id/cancel` body `{ reason? }` — admin detectado por `admins/{uid}`

- [ ] **Step 1: Implement** página: dados do perfil (editar nome/WhatsApp; CPF exibido mascarado `***.***.789-25`) via `saveProfile`; banner de e-mail não verificado; pedidos agrupados por `code`, cada jogo com status — Reservado "Retirar em dd/mm", Retirado "Devolver até dd/mm · faltam N dias", Atrasado "N dias de atraso" (vermelho), Devolvido, Cancelado; botão "Cancelar" (confirmação) nos `reserved`; botão "Sair".
- [ ] **Step 2: Verify (manual):** cancelar um reservado → status muda, booking sai do jogo, catálogo volta a "Disponível". `fetch` cancelando aluguel de outra conta → 409/403.
- [ ] **Step 3:** `npx tsc --noEmit` → OK.
- [ ] **Step 4: Commit** `feat(aluguel): minha conta e cancelamento`.

---

### Task 16: Rotas de operação do admin

**Files:**
- Modify: `src/services/server/rentalService.ts` (+ `pickupRental`, `returnRental`, `changeDueDate`, `setCustomerBlocked`)
- Create: `src/app/api/rental/rentals/[id]/pickup/route.ts`, `return/route.ts`, `due-date/route.ts`, `src/app/api/rental/customers/[uid]/block/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `canChangeDueDate`.
- Produces (todas em transação, todas exigem admin):
  - `pickupRental(rentalId, adminUid)` — só de `reserved`; grava `picked_up`, `pickedUpAt`, `pickedUpBy`; booking → `picked_up`
  - `returnRental(rentalId, adminUid, { condition, note?, markUnitUnavailable })` — só de `picked_up`; grava `returned`, `returnedAt`, `returnedBy`, `returnCondition`, `returnNote`; remove booking; se `markUnitUnavailable`, unidade → `unavailable` com `note` = observação
  - `changeDueDate(rentalId, adminUid, dueDate)` — `reserved|picked_up`; `canChangeDueDate` falso → `ApiError(409, "due_date_conflict", "A nova data cruza com outra reserva desta cópia.")`; atualiza rental e booking
  - `setCustomerBlocked(uid, blocked, reason?)` — grava `isBlocked`, `blockedReason`
  - Transições inválidas → `ApiError(409, "invalid_status", "Este aluguel está em outro status. Atualize a página.")`

- [ ] **Step 1: Implement**.
- [ ] **Step 2: Verify (manual via `fetch` logado como admin):** pickup → return com `damaged` + `markUnitUnavailable` → unidade indisponível no admin e catálogo atualizado; pickup duas vezes → `invalid_status`; due-date cruzando reserva seguinte → `due_date_conflict`. Mesmas chamadas logado como cliente → 403.
- [ ] **Step 3:** `npx tsc --noEmit` → OK.
- [ ] **Step 4: Commit** `feat(aluguel): rotas de retirada, devolução, prazo e bloqueio`.

---

### Task 17: Admin — abas Aluguéis e Clientes + badge

**Files:**
- Create: `src/app/(admin)/aluguel-admin/rentalsTab.tsx`, `rentalActions.tsx`, `customersTab.tsx`
- Modify: `src/app/(admin)/aluguel-admin/page.tsx`, `src/app/(admin)/sidebar.tsx`

**Interfaces:**
- Consumes: `RentalRepository.subscribeToAll`, `RentalCustomerRepository.subscribeToAll`, `rentalApi`, `todaySP`, `diffDays`, `formatDateBR`, `formatBRL`, `formatCpf`.
- Produces: `rentalAttention(rentals: RentalType[], today: string): { pickupsToday: number; returnsToday: number; overdue: number; notPickedUp: number }` exportado de `rentalsTab.tsx` (sidebar usa `pickupsToday + returnsToday + overdue`).

- [ ] **Step 1: Implement** `rentalsTab.tsx`: faixas **Retiradas de hoje** (`reserved`, `startDate == hoje`), **Devoluções de hoje** (`picked_up`, `dueDate == hoje`), **Atrasados** (`picked_up`, `dueDate < hoje`, com "N dias"), **Não retirados** (`reserved`, `startDate < hoje`); abaixo, lista com busca (cliente, código, jogo) e filtro por status. Cada linha: código, jogo + cópia, cliente (link `https://wa.me/55<telefone>`), datas, preço, status, ações.
- [ ] **Step 2: Implement** `rentalActions.tsx`: botões/modais "Registrar retirada", "Registrar devolução" (estado OK/Com avaria/Peça faltando, observação, checkbox "Marcar cópia como indisponível", pré-marcado quando não for OK), "Alterar devolução" (data ≥ retirada), "Cancelar" (motivo obrigatório). Erros da API viram alerta com a `message`.
- [ ] **Step 3: Implement** `customersTab.tsx`: lista (nome, e-mail, WhatsApp, CPF formatado, nº de aluguéis, em aberto, atrasos, bloqueado), busca, detalhe com histórico, bloquear/desbloquear com motivo.
- [ ] **Step 4: Implement** badge na sidebar para `/aluguel-admin` com tooltip "N retiradas, N devoluções, N atrasados", no mesmo padrão do badge de `/usuarios`.
- [ ] **Step 5: Verify (manual):** ciclo completo — cliente reserva para hoje → aparece em "Retiradas de hoje" e badge → registrar retirada → registrar devolução com avaria → cópia indisponível; mudar à mão no Firestore o `dueDate` de um retirado para ontem → aparece em "Atrasados"; bloquear cliente → novo pedido dele recebe "customer_blocked".
- [ ] **Step 6:** `npx tsc --noEmit && npx eslint "src/app/(admin)/aluguel-admin"` → OK.
- [ ] **Step 7: Commit** `feat(aluguel): admin — aluguéis, clientes e badge`.

---

### Task 18: Verificação final

- [ ] **Step 1:** `npm test` → todos PASS.
- [ ] **Step 2:** `npx tsc --noEmit` e `npm run lint` → sem erros novos.
- [ ] **Step 3:** `npm run build` → sucesso, rotas `/aluguel*`, `/aluguel-admin`, `/conta/acao`, `/api/rental/*`, `/api/auth/*` listadas.
- [ ] **Step 4:** Percorrer o checklist da spec, seção 2 (objetivos) e anti-objetivos: leitura anônima de `rentals`/`rentalCustomers` negada (Playground de regras), conta de cliente sem acesso ao admin, nada do aluguel em `/clientCollection`.
- [ ] **Step 5:** Atualizar o README (seção do aluguel: rotas, variáveis, `npm test`, onde publicar `firestore.rules`/`storage.rules`).
- [ ] **Step 6: Commit** `docs(aluguel): README e verificação final`.
