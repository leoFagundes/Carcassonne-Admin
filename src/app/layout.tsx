import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AlertProvider } from "@/contexts/alertProvider";
import { Analytics } from "@vercel/analytics/next";

// Fontes hospedadas no projeto (antes vinham de next/font/google): o build
// do Turbopack quebrava ao baixar a Saira do Google Fonts ("next/font/google
// queries have exactly one entry"), sem nenhuma mudança no código.
const cormorantGaramond = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-300-normal.woff2", weight: "300" },
    { path: "./fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/cormorant-garamond-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-pirata-one",
  adjustFontFallback: "Times New Roman",
});

const saira = localFont({
  src: [
    { path: "./fonts/saira-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/saira-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/saira-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/saira-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-saira",
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
    <html lang="pt-BR">
      <body
        className={`${cormorantGaramond.variable} ${saira.variable} antialiased text-primary-white bg-primary-black`}
      >
        <Analytics />
        <div className="background-fixed" />
        <AlertProvider>{children}</AlertProvider>
      </body>
    </html>
  );
}
