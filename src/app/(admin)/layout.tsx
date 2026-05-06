import { Metadata } from "next";
import Sidebar from "./sidebar";
import ConfigGroup from "@/components/configGroup";
import AuthStateRequired from "./AuthStateRequired";
import SessionTimer from "./sessionTimer";

export const metadata: Metadata = {
  title: "Carcassonne Admin",
  description: "Área de administrador do Carcassonne Pub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConfigGroup>
      <div className="flex flex-col md:flex-row items-start w-screen h-screen">
        <AuthStateRequired />
        <SessionTimer />
        <Sidebar />
        <div className="relative flex-1 p-4 sm:p-6 h-full w-full overflow-y-auto">
          {children}
          {/* Background effects */}
          <div className="hex-bg fixed inset-0 pointer-events-none z-[-1]" />
        </div>
      </div>
      <style>{`
        .hex-bg {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>
    </ConfigGroup>
  );
}
