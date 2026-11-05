import { ApiError, readJson, requireUser, withApi } from "@/services/server/apiHelpers";
import { sendVerificationEmail } from "@/services/server/accountEmails";

export const POST = withApi(async (req) => {
  const token = await requireUser(req);
  const body = await readJson<{ from?: unknown }>(req);
  if (body?.from !== "admin" && body?.from !== "aluguel") {
    throw new ApiError(400, "invalid_body", "Origem inválida.");
  }
  await sendVerificationEmail(token.uid, body.from);
  return null;
});
