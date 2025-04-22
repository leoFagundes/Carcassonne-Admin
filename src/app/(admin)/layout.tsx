import { Metadata } from "next";
import Sidebar from "./sidebar";

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
      <Sidebar />
      <div className="relative flex-1 bg-primary-black/60 rounded-md backdrop-blur-[1px] p-8 shadow-card h-full w-full ">
        {children}
      </div>
      <img
        className="absolute top-10 right-10 w-[150px] lg:flex hidden z-40"
        src="images/mascote-2.png"
        alt="meeple"
      />
    </div>
  );
}
