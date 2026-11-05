import "server-only";
import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import { AccountActionEmail } from "@/components/react-email/accountActionEmail";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin";
import { ApiError } from "./apiHelpers";

export type AccountFrom = "admin" | "aluguel";
type ActionMode = "verifyEmail" | "resetPassword";

const FROM_ADDRESS = "Carcassonne Pub <conta@carcassonnepub.com.br>";
const THROTTLE_MS = 60_000;

function siteUrl(): string {
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

async function sendMail(
  to: string,
  subject: string,
  kind: "verify" | "reset",
  link: string,
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    react: <AccountActionEmail kind={kind} link={link} />,
  });
  if (result.error) {
    throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
  }
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
  const firebaseLink = await auth.generateEmailVerificationLink(user.email);
  const link = buildActionLink(firebaseLink, "verifyEmail", from);
  await sendMail(user.email, "Confirme seu e-mail - Carcassonne Pub", "verify", link);
}

export async function sendPasswordResetEmail(
  email: string,
  from: AccountFrom,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const id = createHash("sha256").update(normalized).digest("hex");
  const ref = getAdminDb().collection("authEmailThrottle").doc(id);

  const snap = await ref.get();
  const last = snap.exists
    ? (snap.data()?.lastSentAt as Timestamp | undefined)
    : undefined;
  if (last && Date.now() - last.toMillis() < THROTTLE_MS) return;

  let firebaseLink: string;
  try {
    firebaseLink = await getAdminAuth().generatePasswordResetLink(normalized);
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") return;
    throw error;
  }
  const link = buildActionLink(firebaseLink, "resetPassword", from);
  await sendMail(normalized, "Redefinir sua senha - Carcassonne Pub", "reset", link);
  await ref.set({ lastSentAt: Timestamp.now() });
}
