import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RouteContext = { params: Promise<Record<string, string>> };

export function withApi(
  handler: (req: Request, ctx: RouteContext) => Promise<unknown>,
) {
  return async (req: Request, ctx: RouteContext): Promise<Response> => {
    try {
      const data = await handler(req, ctx);
      return Response.json({ ok: true, data: data ?? null });
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(
          {
            ok: false,
            code: error.code,
            message: error.message,
            ...error.extra,
          },
          { status: error.status },
        );
      }
      console.error("Erro inesperado na API:", error);
      return Response.json(
        { ok: false, code: "internal", message: "Erro interno do servidor." },
        { status: 500 },
      );
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
}

export async function requireUser(req: Request): Promise<DecodedIdToken> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new ApiError(401, "unauthenticated", "Faça login para continuar.");
  }
  try {
    return await getAdminAuth().verifyIdToken(match[1]);
  } catch {
    throw new ApiError(401, "unauthenticated", "Sessão inválida ou expirada.");
  }
}

export async function isAdminUid(uid: string): Promise<boolean> {
  const snap = await getAdminDb().collection("admins").doc(uid).get();
  return snap.exists;
}

// Id de documento do Firestore: sem "/" (senão vira caminho de outra coleção),
// sem "." / ".." e sem o padrão reservado __x__.
export function isDocId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !value.includes("/") &&
    value !== "." &&
    value !== ".." &&
    !/^__.*__$/.test(value)
  );
}

export async function requireAdmin(req: Request): Promise<DecodedIdToken> {
  const user = await requireUser(req);
  if (!(await isAdminUid(user.uid))) {
    throw new ApiError(403, "forbidden", "Acesso restrito a administradores.");
  }
  return user;
}
