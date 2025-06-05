import type { Metadata } from "next";
import { Pirata_One, Saira } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/contexts/alertProvider";
import { Analytics } from "@vercel/analytics/next";

const pirataOne = Pirata_One({
  weight: "400",
  variable: "--font-pirata-one",
  subsets: ["latin"],
});

const saira = Saira({
  weight: ["400", "500", "600", "700"],
  variable: "--font-saira",
  subsets: ["latin"],
});

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
    <html lang="pt-br">
      <body
        className={` ${pirataOne.variable} ${saira.variable} antialiased text-primary-white bg-primary-black`}
      >
        <Analytics />
        <div className="background-fixed" />
        <AlertProvider>{children}</AlertProvider>
      </body>
    </html>
  );
}
