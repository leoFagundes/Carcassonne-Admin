import { Timestamp } from "firebase/firestore";

export interface User {
  id?: string;
  email: string;
  password: string;
}

/** Documento em /admins/{uid} — quem tem esse documento é administrador. */
export interface AdminType {
  id?: string; // = UID da conta no Firebase Auth
  /** "master": não pode ter o acesso removido nem a conta excluída por um admin normal (definido no banco). */
  role: "admin" | "master";
  email?: string;
  createdAt?: Timestamp;
}

/** Documento em /adminRequests/{uid} — conta criada no /signup aguardando aprovação. */
export interface AdminRequestType {
  id?: string; // = UID da conta no Firebase Auth
  email: string;
  createdAt?: Timestamp;
}

/** admin = acesso liberado · pending = pediu acesso e aguarda · none = conta comum */
export type AdminAccessStatus = "admin" | "pending" | "none";

export interface BoardgameType {
  id?: string;
  name: string;
  description: string;
  difficulty: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  featured: boolean;
  isVisible: boolean;
  image: string;
  types: string[];
  isForSale: boolean;
  value?: string;
}

export interface MenuItemType {
  id?: string;
  name: string;
  description: string;
  value: string;
  type: string;
  subtype?: string;
  observation?: string[];
  sideDish?: string[];
  image?: string;
  isVegan: boolean;
  isFocus: boolean;
  isVisible: boolean;
}

export interface ComboType {
  id?: string;
  name: string;
  description: string;
  value: string;
}

export interface InfoType {
  id?: string;
  name: string;
  description: string;
  values: string[];
  orderPriority?: number;
}

export interface DescriptionTypeProps {
  id?: string;
  type: string;
  description: string;
}

export interface GeneralConfigsType {
  _id?: string;
  clickEffect: boolean;
  followCursor: boolean;
  canvasCursor: boolean;
  maxCapacityInDay: number;
  maxCapacityInReserve: number;
  enabledTimes: string[];
  disabledDays: number[];
  maxMonthsInAdvance: number;
  hoursToCloseReserve: number;
  isMusicRecommendationEnable: boolean;
  isPersonCheckEnabled: boolean;
  blockedDates: { date: string; reason?: string }[]; // date as "YYYY-MM-DD"
  specialDates: { date: string; description?: string }[]; // date as "YYYY-MM-DD"
  /** Mostra no calendário de reservas quantos lugares cada dia já tem (ex: 45/75). */
  showDayOccupancy?: boolean;
  /** Tema visual do site (todas as páginas). Ausente = "default". */
  siteTheme?: SiteThemeId;
  /** Avisos por tema: lembram de ativar o tema dentro de um período. */
  siteThemeReminders?: Partial<Record<SiteThemeId, SiteThemeReminder>>;
  /** Versão de cada tema (completa ou minimalista). Ausente = "full". */
  siteThemeStyles?: Partial<Record<SiteThemeId, SiteThemeStyle>>;

  // ---------- Configurações → Geral ----------
  /** Endereço, contatos e horário de funcionamento (usados no site e nos e-mails). */
  pubInfo?: Partial<PubInfo>;
  /** Mostra o selo "Aberto agora / Fechado" (precisa do horário de funcionamento). */
  showOpenNow?: boolean;
  /** Faixa de aviso no topo das páginas do site. */
  siteNotice?: SiteNotice;
  /** Áreas do site desligadas (true = desligada; o cliente vê uma mensagem). */
  disabledAreas?: Partial<Record<SiteArea, boolean>>;
  /** Mensagem mostrada nas áreas desligadas (vazia = texto padrão). */
  disabledAreaMessage?: string;
  /** Título, descrição e imagem da prévia ao compartilhar o link do site. */
  shareMeta?: Partial<ShareMeta>;
  /** Por quanto tempo sem uso o login do admin continua valendo (horas). */
  adminSessionHours?: number;
  /** Como os efeitos de mouse se comportam. */
  effectsPrefs?: Partial<EffectsPrefs>;
  /** E-mails que recebem o aviso de nova reserva. */
  staffReserveEmails?: string[];
}

/** Horário de um dia ("HH:MM"); `close` menor ou igual a `open` = fecha depois da meia-noite. */
export interface OpeningHours {
  open: string;
  close: string;
}

export interface PubInfo {
  address: string;
  mapsUrl: string;
  /** Só dígitos, com DDI e DDD (ex.: 5561999684186). */
  whatsapp: string;
  /** Usuário do Instagram, sem @. */
  instagram: string;
  /** Página do Facebook, sem a URL (ex.: CARCASSONNEPUB). */
  facebook: string;
  email: string;
  website: string;
  /** Domingo (0) a sábado (6); null = fechado. */
  hours: (OpeningHours | null)[];
}

export type SiteNoticeTone = "info" | "warning" | "celebration";

export interface SiteNotice {
  enabled: boolean;
  text: string;
  tone: SiteNoticeTone;
  /** "YYYY-MM-DD", inclusive. Vazio = desde já / sem fim. */
  from?: string;
  to?: string;
  linkUrl?: string;
  linkLabel?: string;
}

export type SiteArea = "reservas" | "ludoteca" | "cardapio" | "eventos";

export interface ShareMeta {
  title: string;
  description: string;
  image: string;
}

export type EffectsIntensity = "soft" | "normal" | "strong";

export interface EffectsPrefs {
  /** Desliga os efeitos para quem pediu "reduzir movimento" no sistema. */
  respectReducedMotion: boolean;
  /** Desliga os efeitos em telas de toque (celular e tablet). */
  disableOnTouch: boolean;
  intensity: EffectsIntensity;
}

/**
 * "full": todas as decorações (como sempre foi). "minimal": só a decoração do
 * topo, poucas partículas, o enfeite do logo e a cor de destaque — sem a
 * muralha no rodapé nem coisas passando pela tela.
 */
export type SiteThemeStyle = "full" | "minimal";

export type SiteThemeId =
  | "default"
  | "carnaval"
  | "stpatricks"
  | "pascoa"
  | "aniversario"
  | "namorados"
  | "junina"
  | "oktoberfest"
  | "halloween"
  | "natal"
  | "reveillon"
  | "torneio";

/**
 * Aviso de um tema: entre `start` e `end` (inclusive), se o tema não estiver no
 * ar, aparece uma notificação no admin. Datas "MM-DD" repetem todo ano (o
 * padrão); "YYYY-MM-DD" valem só para aquele período.
 */
export interface SiteThemeReminder {
  start: string;
  end: string;
  /** Notificações ligadas — dá para silenciar sem apagar o período. */
  enabled: boolean;
}

export interface PopupScheduleType {
  id: string;
  days: number[]; // 0 = domingo ... 6 = sábado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm" — se <= startTime, entende-se que atravessa a meia-noite
}

export interface PopupType {
  id?: string;
  src: string;
  /** Nome interno — só aparece aqui no admin, pra identificar o popup na galeria. Opcional. */
  label?: string;
  /** Título exibido ao cliente, abaixo da imagem. Opcional. */
  title?: string;
  /** Descrição exibida ao cliente, abaixo do título. Opcional. */
  description?: string;
  isActive: boolean;
  /** Vazio = sempre ativo (respeitando isActive), sem restrição de dia/horário. */
  schedules: PopupScheduleType[];
  createdAt?: Timestamp;
}

export interface CarcaImageType {
  id?: string;
  src: string;
  description: string;
  top: string;
  left: string;
  width: string;
  height: string;
  rotate: string;
}

export type SnakeMode = "normal" | "obstacles";

export interface SnakeScoreType {
  id?: string;
  name: string;
  score: number;
  /** Ausente em registros antigos, de antes dos modos existirem — tratado como "normal". */
  mode?: SnakeMode;
  createdAt?: Date | Timestamp;
}

export interface TypeOrderType {
  id?: string;
  type: {
    name: string;
    order: number;
    subtypes: {
      name: string;
      order: number;
    }[];
  };
}

export interface ReserveType {
  id?: string;
  code: string;
  bookingDate: {
    day: string;
    month: string;
    year: string;
  };
  time: string;
  name: string;
  phone: string;
  email: string;
  observation?: string;
  adults: number;
  childs: number;
  status: "confirmed" | "canceled";
  table?: string;
  createdAt?: Timestamp;
  canceledAt?: string;
  canceledReason?: string;
  canceledBy?: "user" | "admin";
  isArrived?: boolean;
  arrivedPeople?: boolean[];
}

/** Conteúdo editável do e-mail que o cliente recebe ao reservar (aba Adicionar). */
export interface ReservationEmailConfigType {
  subject: string;
  previewText: string;
  bannerUrl: string; // "" = sem imagem
  heading: string;
  intro: string;
  codeLabel: string;
  codeHint: string;
  showWarning: boolean;
  warningText: string;
  showAddress: boolean;
  addressText: string;
  cancelTitle: string;
  cancelText: string;
  cancelButtonLabel: string;
  signOff: string;
  footerImageUrl: string; // "" = sem imagem
}

export interface DayNoteType {
  id?: string;
  date: string; // "YYYY-MM-DD"
  text: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TableType {
  id?: string;
  code: string;
  capacity: number;
  combinableWith?: string[];
  priority: number;
}

export interface MusicRecommendationType {
  id?: string;
  name: string;
  createdAt?: Date | Timestamp;
}

export type FreelancerBookingStatus = "confirmed" | "standby";

export interface FreelancerType {
  id?: string;
  name: string;
  phone?: string;
  notes?: string;
  photoUrl?: string;
  // "upload" = arquivo exclusivo do perfil (apagar do Storage ao trocar/remover/excluir).
  // "mural" = referência a uma imagem do mural do Carcassonne (nunca apagar o arquivo por aqui).
  photoSource?: "upload" | "mural" | "";
  createdAt?: Date | Timestamp;
}

export interface FreelancerBookingType {
  id?: string;
  freelancerId: string;
  freelancerName: string;
  status: FreelancerBookingStatus;
  isPayed: boolean;
  bookingDate: {
    day: string;
    month: string;
    year: string;
  };
  createdAt?: Date | Timestamp;
}

export interface LinkType {
  id?: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  order?: number;
  clicks?: number;
  clicksByDay?: Record<string, number>;
  isVisible?: boolean;
}

export interface EventItemType {
  id?: string;
  name: string;
  description: string;
  icon: string;
  subtype: "bolao" | "quiz" | "votacao";
  isActive: boolean;
  createdAt?: Timestamp;
  // Quiz-specific
  quizStatus?: "waiting" | "running" | "finished";
  quizDuration?: number; // seconds (legacy)
  quizStartedAt?: Timestamp;
  quizPrize?: string;
  quizResultsVisible?: boolean;
  quizChampionId?: string; // participantId of the crowned champion
  // Votação-specific
  votacaoStatus?: "cadastro" | "aberta" | "encerrada";
  votacaoResultsVisible?: boolean;
  /** Se o cliente pode cadastrar a própria fantasia (foto + nome) durante o cadastro. Padrão: false. */
  votacaoAllowClientSubmissions?: boolean;
  /** Só tem efeito com votacaoAllowClientSubmissions ligado. Padrão (false): 1 fantasia por dispositivo. */
  votacaoAllowMultipleClientSubmissions?: boolean;
  /** entryId escolhido pelo admin pra desempatar o 1º lugar. Sem isso, empate no topo é dividido. */
  votacaoChampionId?: string;
}

export interface QuizQuestionType {
  id?: string;
  eventId: string;
  text: string;
  type: "multiple_choice" | "text";
  options?: string[];
  correctOption?: number; // index (0-based)
  points: number;
  timeSeconds: number; // seconds the participant has to answer this question
  order?: number;
}

export interface QuizParticipantType {
  id?: string;
  eventId: string;
  participantId: string;
  name: string;
  mesa?: string;
  answers: Record<
    string,
    {
      answer: string | number;
      isCorrect?: boolean;
      pointsEarned?: number;
    }
  >;
  totalScore: number;
  timeTakenSeconds?: number; // sum of per-correct-question times in seconds (float, ms precision)
  questionTimes?: Record<string, number>; // ms spent per question, keyed by questionId
  submittedAt?: Timestamp;
}

export interface BolaoTeamType {
  id?: string;
  name: string;
  image: string;
  eventId: string;
}

export interface BolaoMatchType {
  id?: string;
  eventId: string;
  teamAId: string;
  teamBId: string;
  date?: string;
  order?: number;
}

export interface BolaoParticipantType {
  id?: string;
  eventId: string;
  participantId: string;
  name: string;
  predictions: Record<string, { scoreA: number; scoreB: number }>;
  createdAt?: Timestamp;
}

export interface VotingEntryType {
  id?: string;
  eventId: string;
  name: string; // nome da fantasia / opção de voto
  images: string[]; // URLs do Firebase Storage — vários ângulos da mesma fantasia
  order?: number;
  /** true quando a própria fantasia foi cadastrada pelo cliente (não pelo admin). */
  submittedByClient?: boolean;
  createdAt?: Timestamp;
}

export interface VotingVoteType {
  id?: string;
  eventId: string;
  participantId: string; // cada participante tem até 2 documentos (2 votos) por evento
  entryId: string;
  createdAt?: Timestamp;
}

// ---------- Aluguel de jogos ----------

export interface RentalUnit {
  id: string;
  label: string;
  status: "active" | "unavailable";
  note?: string;
}

export interface RentalBooking {
  rentalId: string;
  unitId: string;
  startDate: string;
  dueDate: string;
  status: "held" | "reserved" | "picked_up";
  /** Fim da reserva temporária (ms); só em status "held". */
  holdUntil?: number;
}

export interface RentalGameType {
  id?: string;
  name: string;
  description: string;
  image: string;
  difficulty: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  types: string[];
  price: number;
  rentalDays: number;
  isActive: boolean;
  units: RentalUnit[];
  bookings: RentalBooking[];
  sourceBoardgameId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type RentalStatus = "awaiting_payment" | "reserved" | "picked_up" | "returned" | "canceled";
export type RentalReturnCondition = "ok" | "damaged" | "missing_parts";

export interface RentalType {
  id?: string;
  orderId: string;
  code: string;
  customerUid: string;
  customer: { name: string; email: string; phone: string };
  gameId: string;
  gameName: string;
  unitId: string;
  unitLabel: string;
  price: number;
  rentalDays: number;
  startDate: string;
  dueDate: string;
  status: RentalStatus;
  pickedUpAt?: Timestamp;
  pickedUpBy?: string;
  returnedAt?: Timestamp;
  returnedBy?: string;
  returnCondition?: RentalReturnCondition;
  returnNote?: string;
  canceledAt?: Timestamp;
  canceledBy?: "customer" | "admin" | "system";
  cancelReason?: string;
  rulesVersion: number;
  createdAt?: Timestamp;
}

export interface RentalCustomerType {
  id?: string;
  name: string;
  phone: string;
  cpf: string;
  email: string;
  isBlocked?: boolean;
  blockedReason?: string;
  acceptedTermsAt?: Timestamp;
  createdAt?: Timestamp;
  /**
   * Cliente sem conta, cadastrado pelo admin no balcão (id `guest_…`). Quando a
   * pessoa cria conta com o mesmo CPF e WhatsApp, o histórico passa para a conta.
   */
  guest?: boolean;
  /** Admin que cadastrou o cliente sem conta. */
  createdBy?: string;
}

export type CancellationPolicy = "full" | "fee" | "manual";

export interface OnlinePaymentSettings {
  enabled: boolean;
  /**
   * Oferece no site o "Pix aqui na tela" (QR gerado na hora, sem sair do site)
   * além do Mercado Pago. Ausente = ligado. Se o Pix falhar, o cliente segue
   * para o Mercado Pago.
   */
  pixDirect?: boolean;
  holdMinutes: number;
  cancellationPolicy: CancellationPolicy;
  feePercent: number;
}

export interface RentalSettingsType {
  isEnabled: boolean;
  pickupWeekdays: number[];
  maxAdvanceDays: number;
  maxGamesPerOrder: number;
  maxActiveGamesPerCustomer: number;
  requireCpf: boolean;
  staffEmail?: string;
  onlinePayment: OnlinePaymentSettings;
  /**
   * Deixa reservar uma cópia que está com outro cliente (ou que alguém vai
   * retirar antes), para quando ela voltar. Desligado: só cópias sem ninguém
   * na frente. Ausente = ligado.
   */
  allowQueue?: boolean;
  /**
   * Com a fila ligada: "before" = só antes de quem já reservou (devolvendo
   * antes), "after" = só depois de quem está com a cópia ou já reservou,
   * "both" = os dois. Ausente = "both".
   */
  queueMode?: "before" | "after" | "both";
  /**
   * Folga mínima, em dias, entre a devolução de um aluguel e a retirada do
   * próximo na mesma cópia (1 = no dia seguinte). Ausente = 1.
   */
  queueGapDays?: number;
}

export interface RentalRuleSection {
  id: string;
  title: string;
  body: string;
}

export interface RentalRulesType {
  sections: RentalRuleSection[];
  version: number;
  updatedAt?: Timestamp;
}

// ---------- Pagamento online do aluguel ----------

export type OrderPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "refunded"
  | "partially_refunded";

export interface RentalRefund {
  amount: number;
  at: number;
  by: string;
  providerRefundId: string;
  rentalId?: string;
  /** Aluguéis cobertos (aprovação de um cancelamento em análise). */
  rentalIds?: string[];
  /** Chave de idempotência do reembolso (uma por operação lógica). */
  key?: string;
  reason?: string;
}

/** Reembolso gravado antes da chamada ao provedor; ao concluir vira um `RentalRefund`. */
export interface RentalPendingRefund {
  key: string;
  amount: number;
  at: number;
  by: string;
  rentalId?: string;
  rentalIds?: string[];
  reason?: string;
  /**
   * A última chamada ao provedor falhou sem resposta definitiva (5xx, rede):
   * o reembolso pode ter saído. Continua contando no limite; repetir a mesma
   * operação (mesma chave) retoma.
   */
  failed?: boolean;
}

/** Pagamento a mais no mesmo pedido (cliente pagou duas vezes), devolvido integralmente. */
export interface RentalDuplicatePayment {
  paymentId: string;
  amount: number;
  at: number;
  providerRefundId?: string;
  refundFailed?: boolean;
}

export interface RentalOrderPayment {
  status: OrderPaymentStatus;
  provider: "mercadopago";
  checkoutUrl: string;
  providerCheckoutId: string;
  providerPaymentId?: string;
  /** "other": saldo da conta Mercado Pago. */
  method?: "pix" | "card" | "other";
  paidAt?: number;
  /** Tarifa do Mercado Pago sobre o pagamento (centavos), quando informada. */
  fee?: number;
  /** Líquido recebido pelo pub (centavos), quando informado. */
  netAmount?: number;
  holdUntil: number;
  refunds: RentalRefund[];
  refundedTotal: number;
  /** Reembolsos em andamento: já contam no limite do que ainda pode ser devolvido. */
  pendingRefunds?: RentalPendingRefund[];
  lateApprovalRefunded?: boolean;
  /** Pago depois de o pedido fechar; o reembolso integral ainda não foi concluído. */
  lateApprovalRefundPending?: boolean;
  /** A última tentativa do reembolso tardio falhou no provedor (precisa de atenção). */
  lateApprovalRefundFailed?: boolean;
  duplicatePayments?: RentalDuplicatePayment[];
  /** Quem encerrou o pedido não pago (status "expired"): cliente cancelou × sistema expirou. */
  closedBy?: "customer" | "system";
  /** Como o cliente paga: página do Mercado Pago (padrão) ou Pix direto (QR gerado no balcão). */
  channel?: "checkout" | "pix";
  /** Pix direto: código "copia e cola" (o QR é gerado a partir dele) e o pagamento criado. */
  pix?: { qrCode: string; paymentId: string };
}

/** Pagamento registrado pelo admin num pedido de balcão. */
export type CounterPaymentMethod = "cash" | "card" | "pix";

export interface RentalCounterPayment {
  /** "paid": recebido no balcão; "courtesy": saiu de graça. */
  kind: "paid" | "courtesy";
  method?: CounterPaymentMethod;
  /** Recebido (centavos); 0 na cortesia. */
  amount: number;
  /** Cortesia: quanto o pedido custaria (centavos). */
  waived?: number;
  reason?: string;
  at: number;
  by: string;
  byName: string;
}

export interface RentalCancellationReview {
  status: "pending" | "approved" | "denied";
  requestedAt: number;
  rentalIds: string[];
  decidedBy?: string;
  decidedAt?: number;
  amount?: number;
  reason?: string;
}

export interface RentalOrderType {
  id?: string;
  code: string;
  customerUid: string;
  customer: { name: string; email: string; phone: string };
  rentalIds: string[];
  gameIds: string[];
  items: { rentalId: string; gameId: string; gameName: string; price: number }[];
  total: number;
  startDate: string;
  paymentMode: "counter" | "online";
  payment?: RentalOrderPayment;
  /** Ausente = pedido feito pelo cliente no site; "admin" = criado no balcão. */
  origin?: "customer" | "admin";
  createdBy?: { uid: string; name: string };
  /** Balcão: pago na hora ou cortesia (ausente = paga na retirada). */
  counterPayment?: RentalCounterPayment;
  cancellationReview?: RentalCancellationReview;
  /** Análises já decididas que deram lugar a uma nova (mais antiga primeiro). */
  cancellationReviewHistory?: RentalCancellationReview[];
  createdAt?: Timestamp;
}
