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
}

export interface PaymentProvider {
  createCheckout(
    input: CreateCheckoutInput,
  ): Promise<{ checkoutUrl: string; providerCheckoutId: string }>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  findPaymentsByReference(orderId: string): Promise<ProviderPayment[]>;
  refund(
    paymentId: string,
    amount?: number,
  ): Promise<{ refundId: string; amount: number }>;
}
