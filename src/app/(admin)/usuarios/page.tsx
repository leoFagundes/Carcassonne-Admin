"use client";

import LoaderFullscreen from "@/components/loaderFullscreen";
import { useAlert } from "@/contexts/alertProvider";
import { auth } from "@/services/firebaseConfig";
import AdminRepository from "@/services/repositories/AdminRepository";
import { adminApi } from "@/services/rentalApi";
import { AdminRequestType, AdminType } from "@/types";
import { onAuthStateChanged } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  LuCheck,
  LuClock,
  LuInfo,
  LuShieldCheck,
  LuTrash2,
  LuUserMinus,
  LuUsers,
  LuX,
} from "react-icons/lu";

function formatDate(value?: Timestamp) {
  if (!value) return "";
  return value.toDate().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function byCreatedAt<T extends { createdAt?: Timestamp }>(a: T, b: T) {
  return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0);
}

export default function UsuariosPage() {
  const [admins, setAdmins] = useState<(AdminType & { id: string })[]>([]);
  const [requests, setRequests] = useState<(AdminRequestType & { id: string })[]>([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const { addAlert } = useAlert();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUid(user?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubAdmins = AdminRepository.subscribeToAdmins((list) => {
      setAdmins(list.sort(byCreatedAt));
      setAdminsLoaded(true);
    });
    const unsubRequests = AdminRepository.subscribeToRequests((list) => {
      setRequests(list.sort(byCreatedAt));
      setRequestsLoaded(true);
    });
    return () => {
      unsubAdmins();
      unsubRequests();
    };
  }, []);

  async function run(action: () => Promise<boolean>, success: string, failure: string) {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    addAlert(ok ? success : failure);
  }

  function handleApprove(request: AdminRequestType & { id: string }) {
    if (!confirm(`Liberar acesso de administrador para ${request.email}?`)) return;
    run(
      () => AdminRepository.approve(request.id, request.email),
      `${request.email} agora é administrador.`,
      "Erro ao aprovar o pedido.",
    );
  }

  function handleReject(request: AdminRequestType & { id: string }) {
    if (!confirm(`Recusar o pedido de ${request.email}?`)) return;
    run(
      () => AdminRepository.reject(request.id),
      "Pedido recusado.",
      "Erro ao recusar o pedido.",
    );
  }

  function handleRevoke(admin: AdminType & { id: string }) {
    const label = admin.email ?? admin.id;
    if (!confirm(`Remover o acesso de administrador de ${label}?`)) return;
    run(
      () => AdminRepository.revoke(admin.id),
      `${label} não é mais administrador.`,
      "Erro ao remover o acesso.",
    );
  }

  async function handleDelete(uid: string, label: string) {
    if (
      !confirm(
        `Excluir de vez a conta de ${label}?

Apaga o login e todos os dados da conta (inclusive aluguéis encerrados, se ela também alugou jogos). Não dá para desfazer.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const result = await adminApi.deleteAccount(uid);
    setBusy(false);
    addAlert(result.ok ? `Conta de ${label} excluída.` : result.message);
  }

  const deleteButton = (uid: string, label: string) => (
    <button
      onClick={() => handleDelete(uid, label)}
      aria-label={`Excluir a conta de ${label}`}
      title="Excluir conta"
      className="flex items-center justify-center p-2 rounded-lg border border-primary-gold/15 text-primary-gold/50 hover:border-invalid-color/40 hover:text-invalid-color transition-all cursor-pointer shrink-0"
    >
      <LuTrash2 size={13} />
    </button>
  );

  const loading = !adminsLoaded || !requestsLoaded;

  return (
    <section className="flex flex-col gap-6 w-full h-full overflow-y-auto outline-none relative">
      {(loading || busy) && <LoaderFullscreen />}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2 w-full">
          <LuUsers size={32} className="text-primary-gold/70 shrink-0" />
          <h1 className="text-3xl font-semibold text-primary-gold">Usuários</h1>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>

      <div className="flex flex-col gap-6 w-full max-w-[560px] mx-auto pb-6">
        {/* Pedidos pendentes */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary-gold/60">
            <LuClock size={15} />
            <span className="text-xs uppercase tracking-widest">Pedidos de acesso</span>
            <span className="text-xs text-primary-gold/35">({requests.length})</span>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-primary-gold/35 px-1 py-3">
              Nenhum pedido aguardando aprovação.
            </p>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 border border-yellow-500/25 bg-yellow-500/[0.04] rounded-xl px-4 py-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-primary-gold/90 truncate">
                    {request.email}
                  </span>
                  <span className="text-xs text-primary-gold/35">
                    Pedido em {formatDate(request.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {deleteButton(request.id, request.email)}
                  <button
                    onClick={() => handleReject(request)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-gold/15 text-xs text-primary-gold/50 hover:border-invalid-color/40 hover:text-invalid-color transition-all cursor-pointer"
                  >
                    <LuX size={13} /> Recusar
                  </button>
                  <button
                    onClick={() => handleApprove(request)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-gold text-primary-black text-xs font-semibold hover:bg-primary-gold/90 transition-all cursor-pointer"
                  >
                    <LuCheck size={13} /> Aprovar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Administradores */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary-gold/60">
            <LuShieldCheck size={15} />
            <span className="text-xs uppercase tracking-widest">Administradores</span>
            <span className="text-xs text-primary-gold/35">({admins.length})</span>
          </div>
          {admins.map((admin) => {
            const isSelf = admin.id === currentUid;
            return (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-3 border border-primary-gold/15 bg-secondary-black/40 rounded-xl px-4 py-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-primary-gold/90 truncate">
                      {admin.email ?? admin.id}
                    </span>
                    {isSelf && (
                      <span className="shrink-0 text-[9px] uppercase tracking-wider bg-primary-gold text-primary-black font-bold px-1.5 py-0.5 rounded-full">
                        você
                      </span>
                    )}
                  </div>
                  {admin.createdAt && (
                    <span className="text-xs text-primary-gold/35">
                      Desde {formatDate(admin.createdAt)}
                    </span>
                  )}
                </div>
                {/* Ninguém remove o próprio acesso — evita ficar sem nenhum admin */}
                {!isSelf && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRevoke(admin)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-gold/15 text-xs text-primary-gold/50 hover:border-invalid-color/40 hover:text-invalid-color transition-all cursor-pointer shrink-0"
                    >
                      <LuUserMinus size={13} /> Remover acesso
                    </button>
                    {deleteButton(admin.id, admin.email ?? admin.id)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-primary-gold/10 bg-primary-gold/[0.03] text-xs text-primary-gold/45 leading-relaxed">
          <LuInfo size={14} className="shrink-0 mt-0.5" />
          <span>
            Remover o acesso ou recusar um pedido não apaga a conta — a pessoa só deixa de
            entrar no admin. Para apagar a conta de vez (login e dados), use o botão de lixeira.
            Ninguém exclui a própria conta.
          </span>
        </div>
      </div>
    </section>
  );
}
