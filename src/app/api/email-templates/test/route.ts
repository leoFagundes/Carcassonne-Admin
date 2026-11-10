import { ApiError, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { sendEmailTemplateTest } from "@/services/server/emailTemplatesServer";
import { isEmailTemplateId } from "@/utils/emailTemplates";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Admin: envia o e-mail de exemplo (versão salva) para um endereço de teste. */
export const POST = withApi(async (req) => {
  await requireAdmin(req);
  const body = ((await readJson<unknown>(req)) ?? {}) as { id?: unknown; to?: unknown };
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!isEmailTemplateId(body.id) || !EMAIL_RE.test(to) || to.length > 200) {
    throw new ApiError(400, "invalid_body", "Informe um e-mail válido para o teste.");
  }
  try {
    await sendEmailTemplateTest(body.id, to);
  } catch (error) {
    console.error("Erro ao enviar o e-mail de teste:", error);
    throw new ApiError(502, "send_failed", "Não foi possível enviar o teste agora.");
  }
});
