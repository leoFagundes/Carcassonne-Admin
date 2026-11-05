"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import type { RentalCustomerType } from "@/types";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";

type Customer = RentalCustomerType & { id: string };

/** Conta do cliente do aluguel: usuário do Firebase + cadastro (se houver). */
export function useRentalCustomer() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [customerReady, setCustomerReady] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setEmailVerified(!!next?.emailVerified);
        setCustomer(null);
        setCustomerReady(!next);
        setAuthReady(true);
      }),
    [],
  );

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    return RentalCustomerRepository.subscribeToOwn(uid, (c) => {
      setCustomer(c);
      setCustomerReady(true);
    });
  }, [uid]);

  const reloadUser = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await current.reload();
    // Renova o token para o servidor enxergar o email_verified novo.
    await current.getIdToken(true);
    setEmailVerified(current.emailVerified);
  }, []);

  return {
    user,
    customer,
    loading: !authReady || !customerReady,
    emailVerified,
    reloadUser,
  };
}
