import { timingSafeEqual } from "node:crypto";
import { requireAdmin, withApi } from "@/services/server/apiHelpers";
import { sweepExpiredOrders } from "@/services/server/rentalOrderService";

/** `Authorization: Bearer ${CRON_SECRET}` (só quando o segredo está configurado). */
function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const sweep = withApi(async (req) => {
  if (!hasCronSecret(req)) await requireAdmin(req);
  return await sweepExpiredOrders();
});

export const POST = sweep;
// O cron da Vercel chama com GET (mesmo cabeçalho Authorization).
export const GET = sweep;
