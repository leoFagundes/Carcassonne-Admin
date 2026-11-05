import { ApiError, readJson, withApi } from "@/services/server/apiHelpers";
import { sendPasswordResetEmail } from "@/services/server/accountEmails";

export const POST = withApi(async (req) => {
  const body = await readJson<{ email?: unknown; from?: unknown }>(req);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "invalid_body", "E-mail inválido.");
  }
  if (body.from !== "admin" && body.from !== "aluguel") {
    throw new ApiError(400, "invalid_body", "Origem inválida.");
  }
  await sendPasswordResetEmail(email, body.from);
  return null;
});
