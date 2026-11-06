import { requireAdmin, withApi } from "@/services/server/apiHelpers";
import { paymentsStatus } from "@/services/server/payments";

export const GET = withApi(async (req) => {
  await requireAdmin(req);
  return paymentsStatus();
});
