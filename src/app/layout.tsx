import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AlertProvider } from "@/contexts/alertProvider";
import { Analytics } from "@vercel/analytics/next";
import SiteThemeProvider from "@/components/siteTheme/SiteThemeProvider";
import { SiteConfigProvider } from "@/contexts/siteConfigProvider";
import { unstable_cache } from "next/cache";
import { loadGeneralConfigs } from "@/services/generalConfigsServer";
import { mergeShareMeta } from "@/utils/generalSettings";

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

// Prévia ao compartilhar o link (Configurações → Geral). Relida a cada 5 minutos;
// se o banco não responder, usa o texto padrão.
const loadShareMeta = unstable_cache(
  async () => mergeShareMeta((await loadGeneralConfigs())?.shareMeta),
  ["share-meta"],
  { revalidate: 300 },
);

export async function generateMetadata(): Promise<Metadata> {
  const { title, description, image } = await loadShareMeta();
  const images = image ? [{ url: image }] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "Carcassonne Pub", images },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images },
  };
}

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
        <AlertProvider>
          {/* Tema sazonal (Configurações → Temas) em todas as páginas */}
          <SiteConfigProvider>
            <SiteThemeProvider>{children}</SiteThemeProvider>
          </SiteConfigProvider>
        </AlertProvider>
      </body>
    </html>
  );
}
