export type CheckoutReturn = "approved" | "rejected" | null;

/**
 * Resultado informado na URL de retorno do Mercado Pago (`status` ou
 * `collection_status`). Só serve para a tela; quem confirma é o servidor.
 */
export function checkoutReturnFlag(params: { get(name: string): string | null }): CheckoutReturn {
  const values = [params.get("status"), params.get("collection_status")].map((v) =>
    (v ?? "").toLowerCase(),
  );
  if (values.includes("approved")) return "approved";
  if (values.some((v) => v === "rejected" || v === "failure")) return "rejected";
  return null;
}
