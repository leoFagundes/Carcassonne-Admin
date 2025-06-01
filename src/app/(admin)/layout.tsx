import { Metadata } from "next";
import Sidebar from "./sidebar";
import AuthStateRequired from "./AuthStateRequired";
import ConfigGroup from "@/components/configGroup";

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
      <div className="flex flex-col md:flex-row items-start w-screen h-screen py-4 gap-2">
        <AuthStateRequired />
        <Sidebar />
        <div className="relative flex-1 bg-primary-black rounded-md backdrop-blur-[1px] p-4 h-full w-full ">
          {children}
        </div>
      </div>
    </ConfigGroup>
  );
}
