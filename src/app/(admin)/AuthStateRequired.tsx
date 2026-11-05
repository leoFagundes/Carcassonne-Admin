"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth } from "@/services/firebaseConfig";
import { useRouter } from "next/navigation";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { useAlert } from "@/contexts/alertProvider";
import AdminRepository from "@/services/repositories/AdminRepository";

export default function AuthStateRequired() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const { addAlert } = useAlert();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (!user) {
        addAlert("Você precisa estar logado para acessar esta página.");
        router.push("/");
        return;
      }

      // Estar logado não basta: só quem tem documento em /admins entra.
      // Contas comuns (ex.: clientes do aluguel) são deslogadas aqui.
      let admin;
      try {
        admin = await AdminRepository.getAdmin(user.uid);
      } catch (error) {
        console.error("Erro ao verificar acesso de administrador:", error);
        addAlert("Não foi possível verificar seu acesso. Atualize a página.");
        return;
      }
      if (!admin) {
        await signOut(auth);
        addAlert("Esta conta não tem acesso à área do administrador.");
        router.push("/");
        return;
      }

      // Admins criados à mão no console podem estar sem e-mail — completa
      // para aparecerem identificados na página de Usuários.
      if (!admin.email && user.email) {
        AdminRepository.update(user.uid, { email: user.email });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  return <div>{loading && <LoaderFullscreen />}</div>;
}
