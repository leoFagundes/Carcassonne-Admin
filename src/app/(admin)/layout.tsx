import { Metadata } from "next";
import Sidebar from "./sidebar";
import VerifyAuthState from "./verifyAuthState";

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
    <div className="flex flex-col md:flex-row items-start w-screen h-screen p-8 gap-2">
      <VerifyAuthState />
      <Sidebar />
      <div className="relative flex-1 bg-primary-black rounded-md backdrop-blur-[1px] p-8  h-full w-full ">
        {children}
      </div>
      <img
        className="absolute top-6 right-16 w-[150px] scale-75 lg:flex hidden z-40"
        src="images/mascote-2.png"
        alt="meeple"
      />
    </div>
  );
}
