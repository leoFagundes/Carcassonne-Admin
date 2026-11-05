import { requireAdmin, withApi } from "@/services/server/apiHelpers";

export const GET = withApi(async (req) => {
  await requireAdmin(req);
  return { project: process.env.FIREBASE_ADMIN_PROJECT_ID };
});
