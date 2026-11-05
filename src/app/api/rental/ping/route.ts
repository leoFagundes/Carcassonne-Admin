import { getAdminAuth } from "@/services/server/firebaseAdmin";
import { requireAdmin, withApi } from "@/services/server/apiHelpers";

export const GET = withApi(async (req) => {
  await requireAdmin(req);
  return { project: getAdminAuth().app.options.projectId };
});
