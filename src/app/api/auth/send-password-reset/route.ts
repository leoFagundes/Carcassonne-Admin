import { after } from "next/server";
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
  const from = body.from;
  // O trabalho roda depois da resposta: o retorno é idêntico para qualquer
  // e-mail (existente, inexistente, limitado ou com falha interna).
  after(async () => {
    try {
      await sendPasswordResetEmail(email, from);
    } catch (error) {
      console.error("Falha ao enviar e-mail de redefinição de senha:", error);
    }
  });
  return null;
});
