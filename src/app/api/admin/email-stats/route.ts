import { requireAdmin, withApi } from "@/services/server/apiHelpers";
import { loadEmailStats } from "@/services/server/resendStats";

/** Admin: números dos e-mails enviados pelo Resend. `?refresh=1` ignora o cache de 5 min. */
export const GET = withApi(async (req) => {
  await requireAdmin(req);
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  return loadEmailStats(refresh);
});
