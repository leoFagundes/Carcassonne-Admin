"use client";

import type { RentalOrderType } from "@/types";
import { orderFlags } from "@/rental/attention";

type Order = RentalOrderType & { id: string };

function reasons(order: Order): string[] {
  const f = orderFlags(order);
  const list: string[] = [];
  if (f.review) list.push("Cancelamento em análise: decida quanto devolver");
  if (f.lateRefundFailed) list.push("Pagamento tardio sem devolução");
  if (f.duplicateFailed > 0) list.push("Pagamento em duplicidade sem devolução");
  if (f.failedRefunds.length > 0) list.push("Reembolso sem confirmação");
  return list;
}

/** Faixa "Reembolsos a decidir": só aparece quando há algo para o admin resolver. */
export default function RefundBand({ orders, onOpen }: { orders: Order[]; onOpen: (order: Order) => void }) {
  if (orders.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Reembolsos a decidir"
      className="flex flex-col gap-2 rounded-2xl border border-orange-400/50 bg-orange-400/5 p-3 text-orange-200"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest">Reembolsos a decidir</span>
        <span className="text-lg font-semibold">{orders.length}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <button
              type="button"
              onClick={() => onOpen(order)}
              className="font-semibold underline underline-offset-2 cursor-pointer"
            >
              {order.code}
            </button>
            <span className="opacity-80">{order.customer.name}</span>
            <span className="font-semibold min-w-0">{reasons(order).join(" · ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
