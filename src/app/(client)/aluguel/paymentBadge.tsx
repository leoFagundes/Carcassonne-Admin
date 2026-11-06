import type { OrderPaymentView } from "@/rental/payments";
import { formatCountdown } from "@/rental/payments";
import { formatBRL } from "@/rental/money";

type Tone = "gold" | "green" | "orange" | "red" | "muted";

const TONE: Record<Tone, { text: string; dot: string }> = {
  gold: { text: "text-primary-gold border-primary-gold/60", dot: "bg-primary-gold" },
  green: { text: "text-emerald-300 border-emerald-400/60", dot: "bg-emerald-400" },
  orange: { text: "text-orange-300 border-orange-400/60", dot: "bg-orange-400" },
  red: { text: "text-red-300 border-red-400/60", dot: "bg-red-400" },
  muted: { text: "text-primary-gold/70 border-primary-gold/30", dot: "bg-primary-gold/50" },
};

export function paymentBadgeInfo(view: OrderPaymentView): { label: string; tone: Tone } {
  switch (view.state) {
    case "counter":
      return { label: "Pagamento no balcão", tone: "muted" };
    case "awaiting":
      return {
        label: `Aguardando pagamento · expira em ${formatCountdown(view.msLeft)}`,
        tone: "gold",
      };
    case "expired":
      return { label: "Pagamento expirado", tone: "red" };
    case "canceled":
      return { label: "Pedido cancelado", tone: "muted" };
    case "rejected":
      return { label: "Pagamento não aprovado", tone: "red" };
    case "paid": {
      const how = view.method === "pix" ? " (Pix)" : view.method === "card" ? " (cartão)" : "";
      return { label: `Pago online${how}`, tone: "green" };
    }
    case "refunded":
      return { label: `Reembolsado ${formatBRL(view.amount)}`, tone: "muted" };
    case "partially_refunded":
      return { label: `Reembolso parcial ${formatBRL(view.amount)}`, tone: "orange" };
    case "review":
      return { label: "Cancelamento em análise", tone: "orange" };
  }
}

/** Selo do pagamento do pedido (mesmo estilo sólido do selo de disponibilidade). */
export default function PaymentBadge({
  view,
  className = "",
}: {
  view: OrderPaymentView;
  className?: string;
}) {
  const { label, tone } = paymentBadgeInfo(view);
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-primary-black/90 text-[11px] font-semibold ${t.text} ${className}`}
    >
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} />
      <span className="min-w-0">{label}</span>
    </span>
  );
}
