import { ApiError, readJson, requireUser, withApi } from "@/services/server/apiHelpers";
import { saveCustomerProfile } from "@/services/server/rentalService";

export const POST = withApi(async (req) => {
  const token = await requireUser(req);
  if (!token.email) {
    throw new ApiError(400, "invalid_profile", "A conta precisa ter um e-mail.");
  }
  const body = await readJson<{
    name?: unknown;
    phone?: unknown;
    cpf?: unknown;
    acceptTerms?: unknown;
  }>(req);
  await saveCustomerProfile(token.uid, token.email, {
    name: typeof body?.name === "string" ? body.name : "",
    phone: typeof body?.phone === "string" ? body.phone : "",
    cpf: typeof body?.cpf === "string" ? body.cpf : "",
    acceptTerms: body?.acceptTerms === true,
  });
  return null;
});
