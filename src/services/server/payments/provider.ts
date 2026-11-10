/** Valores em centavos em toda a interface. */
export interface CheckoutItem {
  id: string;
  title: string;
  unitPrice: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  items: CheckoutItem[];
  payerEmail: string;
  expiresAt: number;
  returnUrl: string;
  notificationUrl: string;
}

export interface ProviderPayment {
  id: string;
  status:
    | "approved"
    | "pending"
    | "in_process"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back";
  amount: number;
  currency: string;
  externalReference: string | null;
  method: "pix" | "card" | "other";
  approvedAt?: number;
  /** Tarifa cobrada do pub pelo Mercado Pago (centavos), quando informada. */
  fee?: number;
  /** Valor líquido que cai na conta do pub (centavos), quando informado. */
  net?: number;
}

export interface PaymentProvider {
  createCheckout(
    input: CreateCheckoutInput,
  ): Promise<{ checkoutUrl: string; providerCheckoutId: string }>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  findPaymentsByReference(orderId: string): Promise<ProviderPayment[]>;
  /** idempotencyKey estável por operação: repetir a chamada não reembolsa duas vezes. */
  refund(
    paymentId: string,
    amount: number | undefined,
    idempotencyKey: string,
  ): Promise<{ refundId: string; amount: number }>;
}
