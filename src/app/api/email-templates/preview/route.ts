import { ApiError, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { renderEmailPreview } from "@/services/server/emailTemplatesServer";
import { isEmailTemplateId } from "@/utils/emailTemplates";

/** Admin: HTML da prévia do e-mail com os textos ainda não salvos (não envia nada). */
export const POST = withApi(async (req) => {
  await requireAdmin(req);
  const body = ((await readJson<unknown>(req)) ?? {}) as { id?: unknown; config?: unknown };
  if (!isEmailTemplateId(body.id) || !body.config || typeof body.config !== "object") {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  return renderEmailPreview(body.id, body.config as Record<string, unknown>);
});
