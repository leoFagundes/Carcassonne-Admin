import "server-only";
import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import { AccountActionEmail } from "@/components/react-email/accountActionEmail";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin";
import { ApiError } from "./apiHelpers";
import { loadEmailTemplate } from "./emailTemplatesServer";

export type AccountFrom = "admin" | "aluguel";
type ActionMode = "verifyEmail" | "resetPassword";

const FROM_ADDRESS = "Carcassonne Pub <conta@carcassonnepub.com.br>";
const THROTTLE_MS = 60_000;

export function siteUrl(): string {
  return (process.env.SITE_URL || "https://www.carcassonnepub.com.br").replace(
    /\/+$/,
    "",
  );
}

/** Troca o link do Firebase por um link da nossa página /conta/acao. */
export function buildActionLink(
  firebaseLink: string,
  mode: ActionMode,
  from: AccountFrom,
): string {
  const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
  if (!oobCode) throw new Error("Link do Firebase sem oobCode.");
  const query = new URLSearchParams({ mode, oobCode, from });
  return `${siteUrl()}/conta/acao?${query.toString()}`;
}

async function sendMail(to: string, kind: "verify" | "reset", link: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  // Assunto e textos editados em Configurações → E-mails (falha → o padrão).
  const copy = await loadEmailTemplate(kind === "verify" ? "account-verify" : "account-reset");
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: copy.subject,
    react: <AccountActionEmail kind={kind} link={link} copy={copy} />,
  });
  if (result.error) {
    throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
  }
}

/** Reserva (atômico) a vaga de envio de e-mail da chave; false se enviou há menos de 1 min. */
async function claimEmailSlot(key: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection("authEmailThrottle").doc(key);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = snap.exists
      ? (snap.data()?.lastSentAt as Timestamp | undefined)
      : undefined;
    if (last && Date.now() - last.toMillis() < THROTTLE_MS) return false;
    tx.set(ref, { lastSentAt: Timestamp.now() });
    return true;
  });
}

export async function sendVerificationEmail(
  uid: string,
  from: AccountFrom,
): Promise<void> {
  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  if (!user.email) {
    throw new ApiError(400, "no_email", "A conta não tem e-mail.");
  }
  if (user.emailVerified) {
    throw new ApiError(409, "already_verified", "Seu e-mail já está confirmado.");
  }
  const slot = createHash("sha256").update(`verify:${uid}`).digest("hex");
  if (!(await claimEmailSlot(slot))) {
    throw new ApiError(
      429,
      "too_many_requests",
      "Aguarde um minuto antes de pedir outro e-mail.",
    );
  }
  const firebaseLink = await auth.generateEmailVerificationLink(user.email);
  const link = buildActionLink(firebaseLink, "verifyEmail", from);
  await sendMail(user.email, "verify", link);
}

export async function sendPasswordResetEmail(
  email: string,
  from: AccountFrom,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const id = createHash("sha256").update(normalized).digest("hex");
  // Reserva a vaga ANTES de procurar a conta (atômico): pedidos paralelos
  // não passam todos, e e-mails desconhecidos também são limitados.
  const claimed = await claimEmailSlot(id);
  if (!claimed) return;

  let firebaseLink: string;
  try {
    firebaseLink = await getAdminAuth().generatePasswordResetLink(normalized);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found" || code === "auth/email-not-found") {
      return;
    }
    throw error;
  }
  const link = buildActionLink(firebaseLink, "resetPassword", from);
  await sendMail(normalized, "reset", link);
}
