import type { ReactNode } from "react";
import ClientShell from "@/components/clientShell";

// Todas as páginas do site: aviso no topo e áreas desligadas (Configurações → Geral).
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
