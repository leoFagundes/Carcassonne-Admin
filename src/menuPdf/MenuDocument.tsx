/**
 * O PDF do cardápio (react-pdf): capa com logo e sumário, depois as seções,
 * o regulamento e o verso (os dois últimos opcionais).
 * Cabeçalho e rodapé (com "Página X de Y") se repetem em toda página de
 * conteúdo; cada seção vira um marcador do PDF; um card nunca é cortado no
 * meio e o título de uma seção não fica sozinho no pé da página.
 *
 * As medidas mudam com o papel (A4 ou A5, ver LAYOUTS) e o tamanho da letra
 * (FONT_SCALE); o que entra ou não vem das opções (options.ts).
 */
import React, { createContext, useContext } from "react";
import {
  Document,
  Link,
  Page,
  Path,
  Rect,
  Svg,
  Text,
  View,
  Image as PdfImage,
} from "@react-pdf/renderer";
import type { ComboType, InfoType, PubInfo } from "@/types";
import { formatPhoneBR } from "@/utils/generalSettings";
import {
  HOUSE_NOTES,
  LEGAL_NOTICES,
  PAYMENT,
  PROCON,
} from "@/utils/rulesContent";
import {
  rows,
  tocEntries,
  type MenuModel,
  type PdfItem,
  type PdfSection,
} from "./model";
import { PALETTES, alpha, type PdfTheme } from "./theme";
import { FONT_SCALE, type PdfOptions, type PdfPaper } from "./options";
import type { QrShape } from "./qr";
import { hoursLines } from "./hours";

type Pal = (typeof PALETTES)[PdfTheme];

/* ─── Medidas por papel (em pontos; A4 = 595 × 842, A5 = 420 × 595) ─── */
const LAYOUTS = {
  A4: {
    side: 40,
    top: 64,
    bottom: 60,
    chromeTop: 26,
    chromeBottom: 24,
    cols: 2,
    gap: 9,
    sectionGap: 18,
    coverPadX: 56,
    coverPadY: 54,
    coverLegendBottom: 44,
    frame: [20, 24],
    coverLogo: 118,
    coverLogoBig: 160,
    coverTitle: 30,
    coverTitleSpacing: 4,
    coverRule: 260,
    coverGap: 34,
    mastLogo: 54,
    mastTitle: 22,
    sectionTitle: 16,
    groupPad: 90,
    subtitlePad: 40,
    tocTwoColsFrom: 10,
    tocTwoColsFromQr: 10,
    coverLogoQr: 118,
    qrCover: 66,
    qrSmall: 50,
    qrBesideName: true,
    rulesCols: 3,
    backLogo: 130,
  },
  A5: {
    side: 28,
    top: 50,
    bottom: 46,
    chromeTop: 19,
    chromeBottom: 17,
    cols: 1,
    gap: 7,
    sectionGap: 14,
    coverPadX: 36,
    coverPadY: 40,
    coverLegendBottom: 30,
    frame: [14, 17],
    coverLogo: 84,
    coverLogoBig: 118,
    coverTitle: 21,
    coverTitleSpacing: 2.6,
    coverRule: 180,
    coverGap: 24,
    mastLogo: 42,
    mastTitle: 16,
    sectionTitle: 13.5,
    groupPad: 50,
    subtitlePad: 14,
    tocTwoColsFrom: 9,
    tocTwoColsFromQr: 7,
    coverLogoQr: 66,
    qrCover: 56,
    qrSmall: 44,
    qrBesideName: false,
    rulesCols: 1,
    backLogo: 92,
  },
} as const;

type Layout = (typeof LAYOUTS)[PdfPaper] & { k: number };
const LayoutContext = createContext<Layout>({ ...LAYOUTS.A4, k: 1 });
const useLayout = () => useContext(LayoutContext);

type TocEntry = { id: string; title: string };

export type MenuDocProps = {
  model: MenuModel;
  opts: PdfOptions;
  pub: PubInfo;
  /** src → data URL das miniaturas. */
  images: Map<string, string>;
  logo?: string | null;
  /** Desenho do QR e o link escrito embaixo (null = sem QR). */
  qr?: { shape: QrShape; label: string } | null;
  /** Página de cada seção (passada da 1ª montagem); null mostra "…". */
  tocPages: Record<string, number> | null;
  /** Recebe a página de cada seção e o total, enquanto o PDF é montado. */
  record?: { pages: Record<string, number>; total: number };
  generatedAt: Date;
};

/* ─── Peças pequenas ─── */
function Diamond({
  color,
  size = 7,
  opacity = 1,
}: {
  color: string;
  size?: number;
  opacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path
        d="M5 0 L6.3 3.7 L10 5 L6.3 6.3 L5 10 L3.7 6.3 L0 5 L3.7 3.7 Z"
        fill={color}
        fillOpacity={opacity}
      />
    </Svg>
  );
}

function Rule({
  color,
  children,
  gap = 8,
}: {
  color: string;
  children?: React.ReactNode;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap }}>
      <View style={{ flex: 1, height: 0.6, backgroundColor: color }} />
      {children}
      <View style={{ flex: 1, height: 0.6, backgroundColor: color }} />
    </View>
  );
}

function Pill({
  text,
  color,
  bg,
}: {
  text: string;
  color: string;
  bg: string;
}) {
  const { k } = useLayout();
  return (
    <Text
      style={{
        fontFamily: "Lato",
        fontWeight: 700,
        fontSize: 5.8 * k,
        letterSpacing: 0.8,
        color,
        backgroundColor: bg,
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingTop: 1.6,
        paddingBottom: 1.2,
      }}
    >
      {text.toUpperCase()}
    </Text>
  );
}

function Badges({
  p,
  item,
  opts,
}: {
  p: Pal;
  item: PdfItem;
  opts: PdfOptions;
}) {
  if (!opts.badges || (!item.isFocus && !item.isVegan)) return null;
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {item.isFocus ? (
        <Pill text="Destaque" color={p.G} bg={alpha(p.G, 0.16)} />
      ) : null}
      {item.isVegan ? (
        <Pill text="Vegano" color={p.GREEN} bg={alpha(p.GREEN, 0.16)} />
      ) : null}
    </View>
  );
}

/** O QR sempre escuro num quadro claro (o celular lê melhor do que invertido). */
function QrCode({ shape, size }: { shape: QrShape; size: number }) {
  const quiet = 2;
  const box = shape.size + quiet * 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${box} ${box}`}>
      <Rect x={0} y={0} width={box} height={box} rx={1.4} fill="#fbf8f0" />
      <Path
        d={shape.path}
        fill="#141210"
        transform={`translate(${quiet} ${quiet})`}
      />
    </Svg>
  );
}

function QrBlock({
  p,
  qr,
  size,
  compact = false,
}: {
  p: Pal;
  qr: NonNullable<MenuDocProps["qr"]>;
  size: number;
  compact?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: compact ? 8 : 12,
      }}
    >
      <QrCode shape={qr.shape} size={size} />
      <View style={{ maxWidth: compact ? 92 : 170 }}>
        <Text
          style={{
            fontFamily: "Cinzel",
            fontWeight: 600,
            fontSize: compact ? 7.5 : 8.5,
            letterSpacing: 1.6,
            color: p.G,
          }}
        >
          CARDÁPIO ONLINE
        </Text>
        <Text
          style={{
            fontFamily: "Lato",
            fontSize: compact ? 6.8 : 7.5,
            color: alpha(p.TEXT, 0.6),
            marginTop: 2,
            lineHeight: 1.35,
          }}
        >
          Aponte a câmera do celular
        </Text>
        {compact ? null : (
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 6.8,
              color: alpha(p.TEXT, 0.4),
              marginTop: 2,
            }}
          >
            {qr.label}
          </Text>
        )}
      </View>
    </View>
  );
}

/** A moldura dupla da capa e do verso. */
function Frame({ p }: { p: Pal }) {
  const L = useLayout();
  return (
    <>
      <View
        fixed
        style={{
          position: "absolute",
          top: L.frame[0],
          left: L.frame[0],
          right: L.frame[0],
          bottom: L.frame[0],
          borderWidth: 0.7,
          borderColor: alpha(p.G, 0.35),
          borderRadius: 3,
        }}
      />
      <View
        fixed
        style={{
          position: "absolute",
          top: L.frame[1],
          left: L.frame[1],
          right: L.frame[1],
          bottom: L.frame[1],
          borderWidth: 0.4,
          borderColor: alpha(p.G, 0.18),
          borderRadius: 2,
        }}
      />
    </>
  );
}

/* ─── Sumário ─── */
function Toc({
  p,
  entries,
  tocPages,
  twoColsFrom,
  scaled,
}: {
  p: Pal;
  entries: TocEntry[];
  tocPages: MenuDocProps["tocPages"];
  twoColsFrom?: number;
  scaled?: boolean;
}) {
  const L = useLayout();
  // Na capa fica sempre no tamanho normal (com letra grande ela não caberia numa página)
  const size = 9.5 * (scaled ? Math.min(L.k, 1.15) : 1);
  const half = Math.ceil(entries.length / 2);
  const cols =
    entries.length >= (twoColsFrom ?? L.tocTwoColsFrom)
      ? [entries.slice(0, half), entries.slice(half)]
      : [entries];
  return (
    <View
      style={{
        borderTopWidth: 0.6,
        borderTopColor: alpha(p.G, 0.3),
        paddingTop: 14,
      }}
    >
      <Text
        style={{
          fontFamily: "Cinzel",
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: 3,
          color: p.G2,
          textAlign: "center",
          marginBottom: 11,
        }}
      >
        SUMÁRIO
      </Text>
      <View style={{ flexDirection: "row", gap: 24 }}>
        {cols.map((col, c) => (
          <View key={c} style={{ flex: 1, gap: 6.5 }}>
            {col.map((e) => (
              <Link
                key={e.id}
                src={"#" + e.id}
                style={{ textDecoration: "none" }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Lato",
                      fontSize: size,
                      color: p.TEXT,
                    }}
                  >
                    {e.title}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      borderBottomWidth: 0.8,
                      borderBottomColor: alpha(p.G, 0.35),
                      borderBottomStyle: "dotted",
                      marginBottom: 2.5,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: "Cinzel",
                      fontWeight: 600,
                      fontSize: size,
                      color: p.G,
                    }}
                  >
                    {tocPages?.[e.id] ?? "…"}
                  </Text>
                </View>
              </Link>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Legenda (selos, moeda e data) ─── */
function Legend({
  p,
  opts,
  generatedAt,
}: {
  p: Pal;
  opts: PdfOptions;
  generatedAt: Date;
}) {
  const month = generatedAt.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const note = {
    fontFamily: "Lato",
    fontSize: 7.5,
    color: alpha(p.TEXT, 0.55),
  };
  return (
    <View style={{ alignItems: "center", gap: 5 }}>
      {opts.badges ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 12,
            rowGap: 4,
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <Pill text="Destaque" color={p.G} bg={alpha(p.G, 0.16)} />
            <Text style={note}>sugestão da casa</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <Pill text="Vegano" color={p.GREEN} bg={alpha(p.GREEN, 0.16)} />
            <Text style={note}>sem ingredientes de origem animal</Text>
          </View>
        </View>
      ) : null}
      <Text
        style={{ fontFamily: "Lato", fontSize: 7, color: alpha(p.TEXT, 0.4) }}
      >
        Preços em reais (R$) · atualizado em {month}
      </Text>
    </View>
  );
}

type HeadProps = { p: Pal; entries: TocEntry[] } & Pick<
  MenuDocProps,
  "pub" | "logo" | "tocPages" | "generatedAt" | "opts" | "qr"
>;

/* ─── Capa ─── */
function Cover({
  p,
  pub,
  logo,
  entries,
  tocPages,
  generatedAt,
  opts,
  qr,
}: HeadProps) {
  const L = useLayout();
  const logoSize = !opts.toc
    ? L.coverLogoBig
    : qr
      ? L.coverLogoQr
      : L.coverLogo;
  return (
    <Page
      size={opts.paper}
      style={{
        backgroundColor: p.BG,
        paddingHorizontal: L.coverPadX,
        paddingTop: L.coverPadY,
        paddingBottom: opts.legend ? L.coverLegendBottom : L.coverPadY,
      }}
    >
      <Frame p={p} />
      <View style={{ flex: 1, justifyContent: "center", gap: L.coverGap }}>
        <View style={{ alignItems: "center" }}>
          {logo ? (
            <PdfImage
              src={logo}
              style={{ width: logoSize, height: logoSize, marginBottom: 14 }}
            />
          ) : null}
          <Text
            style={{
              fontFamily: "Cinzel",
              fontWeight: 700,
              fontSize: L.coverTitle,
              letterSpacing: L.coverTitleSpacing,
              color: p.G,
              textAlign: "center",
            }}
          >
            CARCASSONNE PUB
          </Text>
          <Text
            style={{
              fontFamily: "Lato",
              fontStyle: "italic",
              fontSize: 10.5,
              letterSpacing: 3,
              color: p.G2,
              marginTop: 6,
            }}
          >
            Pub &amp; Luderia
          </Text>
          <View style={{ width: L.coverRule, marginTop: 16, marginBottom: 14 }}>
            <Rule color={alpha(p.G, 0.55)}>
              <Diamond color={p.G} size={8} />
            </Rule>
          </View>
          <Text
            style={{
              fontFamily: "Cinzel",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: 6,
              color: p.G,
            }}
          >
            CARDÁPIO
          </Text>
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 8.5,
              color: alpha(p.TEXT, 0.6),
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {pub.address}
          </Text>
        </View>
        {opts.toc ? (
          <Toc
            p={p}
            entries={entries}
            tocPages={tocPages}
            twoColsFrom={qr ? L.tocTwoColsFromQr : undefined}
          />
        ) : null}
        {qr ? (
          <View style={{ alignItems: "center" }}>
            <QrBlock p={p} qr={qr} size={L.qrCover} />
          </View>
        ) : null}
      </View>

      {/* Legenda no pé da capa, no fluxo normal (presa por posição, ela abria uma 2ª página no A5) */}
      {opts.legend ? (
        <View style={{ marginTop: 16 }}>
          <Legend p={p} opts={opts} generatedAt={generatedAt} />
        </View>
      ) : null}
    </Page>
  );
}

/* ─── Sem capa: abertura compacta no começo da 1ª página ─── */
function Masthead({
  p,
  pub,
  logo,
  entries,
  tocPages,
  generatedAt,
  opts,
  qr,
}: HeadProps) {
  const L = useLayout();
  // O QR vai ao lado do nome (embaixo no A5); sem abertura, vai no fim do cardápio
  const qrHere = qr && opts.masthead ? qr : null;
  const qrBeside = qrHere && L.qrBesideName ? qrHere : null;
  const qrBelow = qrHere && !L.qrBesideName ? qrHere : null;
  if (!opts.masthead && !opts.toc && !opts.legend) return null;
  return (
    <View style={{ marginBottom: 20, gap: 14 }}>
      {opts.masthead ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {logo ? (
            <PdfImage
              src={logo}
              style={{ width: L.mastLogo, height: L.mastLogo }}
            />
          ) : null}
          <View style={{ flexShrink: 1 }}>
            <Text
              style={{
                fontFamily: "Cinzel",
                fontWeight: 700,
                fontSize: L.mastTitle,
                letterSpacing: 3,
                color: p.G,
              }}
            >
              CARCASSONNE PUB
            </Text>
            <Text
              style={{
                fontFamily: "Cinzel",
                fontWeight: 600,
                fontSize: 9.5,
                letterSpacing: 4,
                color: p.G2,
                marginTop: 3,
              }}
            >
              CARDÁPIO
            </Text>
            <Text
              style={{
                fontFamily: "Lato",
                fontSize: 7.5,
                color: alpha(p.TEXT, 0.55),
                marginTop: 3,
              }}
            >
              {pub.address}
            </Text>
          </View>
          {qrBeside ? (
            <View
              style={{
                marginLeft: 10,
                paddingLeft: 12,
                borderLeftWidth: 0.6,
                borderLeftColor: alpha(p.G, 0.3),
              }}
            >
              <QrBlock p={p} qr={qrBeside} size={L.qrSmall} compact />
            </View>
          ) : null}
        </View>
      ) : null}
      {qrBelow ? (
        <View style={{ alignItems: "center" }}>
          <QrBlock p={p} qr={qrBelow} size={L.qrSmall} />
        </View>
      ) : null}
      {opts.toc ? (
        <Toc p={p} entries={entries} tocPages={tocPages} scaled />
      ) : null}
      {opts.legend ? (
        <Legend p={p} opts={opts} generatedAt={generatedAt} />
      ) : null}
      <Rule color={alpha(p.G, 0.35)}>
        <Diamond color={p.G} size={6} />
      </Rule>
    </View>
  );
}

/* ─── Cabeçalho e rodapé das páginas de conteúdo ─── */
function Chrome({
  p,
  pub,
  record,
}: {
  p: Pal;
  pub: PubInfo;
  record?: MenuDocProps["record"];
}) {
  const L = useLayout();
  const contact = [pub.website, pub.instagram && `@${pub.instagram}`]
    .filter(Boolean)
    .join("  ·  ");
  const label = {
    fontFamily: "Cinzel",
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 2.2,
    color: alpha(p.G, 0.8),
  } as const;
  return (
    <>
      <View
        fixed
        style={{
          position: "absolute",
          top: L.chromeTop,
          left: L.side,
          right: L.side,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 6,
            borderBottomWidth: 0.5,
            borderBottomColor: alpha(p.G, 0.3),
          }}
        >
          <Text style={label}>CARCASSONNE PUB</Text>
          <Diamond color={p.G} opacity={0.6} size={5} />
          <Text style={label}>CARDÁPIO</Text>
        </View>
      </View>
      <View
        fixed
        style={{
          position: "absolute",
          bottom: L.chromeBottom,
          left: L.side,
          right: L.side,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 6,
            borderTopWidth: 0.5,
            borderTopColor: alpha(p.G, 0.3),
          }}
        >
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 7,
              color: alpha(p.TEXT, 0.5),
            }}
          >
            {contact}
          </Text>
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 7,
              color: alpha(p.TEXT, 0.6),
            }}
            render={({ pageNumber, totalPages }) => {
              if (record) record.total = totalPages;
              return `Página ${pageNumber} de ${totalPages}`;
            }}
          />
        </View>
      </View>
    </>
  );
}

/** Conta as páginas mesmo sem rodapé (o total aparece na tela). */
function PageCounter({
  record,
  color,
}: {
  record?: MenuDocProps["record"];
  color: string;
}) {
  return (
    <Text
      fixed
      style={{ position: "absolute", bottom: 4, left: 4, fontSize: 1, color }}
      render={({ totalPages }) => {
        if (record) record.total = totalPages;
        return " ";
      }}
    />
  );
}

/** Página de conteúdo: margens, cabeçalho/rodapé (ou só o contador). */
function ContentPage({
  p,
  opts,
  pub,
  record,
  children,
}: {
  p: Pal;
  opts: PdfOptions;
  pub: PubInfo;
  record?: MenuDocProps["record"];
  children: React.ReactNode;
}) {
  const L = useLayout();
  return (
    <Page
      size={opts.paper}
      style={{
        backgroundColor: p.BG,
        paddingTop: opts.pageChrome ? L.top : L.side + 2,
        paddingBottom: opts.pageChrome ? L.bottom : L.side + 2,
        paddingHorizontal: L.side,
      }}
    >
      {opts.pageChrome ? (
        <Chrome p={p} pub={pub} record={record} />
      ) : (
        <PageCounter record={record} color={p.BG} />
      )}
      {children}
    </Page>
  );
}

/* ─── Título de seção ─── */
function SectionHeader({
  p,
  id,
  title,
  subtitle,
  record,
}: {
  p: Pal;
  id: string;
  title: string;
  subtitle?: string;
  record?: MenuDocProps["record"];
}) {
  const L = useLayout();
  // O marcador (bookmark) aparece na barra lateral do leitor de PDF
  const mark = { bookmark: { title, fit: true } } as Record<string, unknown>;
  return (
    <View id={id} {...mark} style={{ marginBottom: subtitle ? 10 : 12 }}>
      <Rule color={alpha(p.G, 0.5)} gap={10}>
        <Diamond color={p.G2} size={6} />
        <Text
          style={{
            fontFamily: "Cinzel",
            fontWeight: 700,
            fontSize: L.sectionTitle * (1 + (L.k - 1) * 0.6),
            letterSpacing: 2.4,
            color: p.G,
          }}
          render={({ pageNumber }) => {
            if (record) record.pages[id] = pageNumber;
            return title.toUpperCase();
          }}
        />
        <Diamond color={p.G2} size={6} />
      </Rule>
      {subtitle ? (
        <Text
          style={{
            fontFamily: "Lato",
            fontStyle: "italic",
            fontSize: 8.5 * L.k,
            color: alpha(p.TEXT, 0.62),
            textAlign: "center",
            marginTop: 5,
            paddingHorizontal: L.subtitlePad,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function GroupLabel({ p, name }: { p: Pal; name: string }) {
  const L = useLayout();
  return (
    <View
      style={{ marginTop: 6, marginBottom: 8, paddingHorizontal: L.groupPad }}
    >
      <Rule color={alpha(p.G, 0.22)} gap={8}>
        <Text
          style={{
            fontFamily: "Cinzel",
            fontWeight: 600,
            fontSize: 8.5 * L.k,
            letterSpacing: 2,
            color: p.G2,
          }}
        >
          {name.toUpperCase()}
        </Text>
      </Rule>
    </View>
  );
}

/* ─── Textos dos itens ─── */
const card = (p: Pal, strong = false) => ({
  flex: 1,
  backgroundColor: p.BG2,
  borderWidth: strong ? 0.9 : 0.5,
  borderColor: alpha(p.G, strong ? 0.55 : 0.22),
  borderRadius: 5,
  padding: 8,
});

function useText(p: Pal) {
  const { k } = useLayout();
  return {
    name: {
      fontFamily: "Lato",
      fontWeight: 700,
      fontSize: 9.5 * k,
      color: p.G,
      lineHeight: 1.25,
    },
    price: {
      fontFamily: "Lato",
      fontWeight: 700,
      fontSize: 9 * k,
      color: p.G2,
      lineHeight: 1.25,
    },
    priceLine: {
      fontFamily: "Lato",
      fontWeight: 700,
      fontSize: 8.2 * k,
      color: p.G2,
      lineHeight: 1.3,
    },
    body: {
      fontFamily: "Lato",
      fontSize: 7.8 * k,
      color: alpha(p.TEXT, 0.74),
      lineHeight: 1.38,
      marginTop: 3,
    },
    side: {
      fontFamily: "Lato",
      fontSize: 7.3 * k,
      color: alpha(p.G, 0.8),
      marginTop: 2.5,
      lineHeight: 1.3,
    },
    obs: {
      fontFamily: "Lato",
      fontStyle: "italic" as const,
      fontSize: 7 * k,
      color: alpha(p.TEXT, 0.55),
      marginTop: 2,
      lineHeight: 1.3,
    },
  };
}

/** Separa as opções de preço ("Broto R$ 49 / Grande R$ 79" → duas linhas). */
function priceLines(value: string): string[] {
  return value
    .split(/\s+\/\s+|\s*;\s*/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function ItemDetails({
  p,
  item,
  opts,
}: {
  p: Pal;
  item: PdfItem;
  opts: PdfOptions;
}) {
  const t = useText(p);
  return (
    <>
      {opts.descriptions && item.description ? (
        <Text style={t.body}>{item.description}</Text>
      ) : null}
      {opts.extras && item.sideDish.length ? (
        <Text style={t.side}>
          <Text style={{ fontWeight: 700 }}>Acompanha: </Text>
          {item.sideDish.join(", ")}
        </Text>
      ) : null}
      {opts.extras && item.observation.length ? (
        <Text style={t.obs}>{item.observation.join(" · ")}</Text>
      ) : null}
    </>
  );
}

/* ─── Estilo "cards" ─── */
function ItemCard({
  p,
  item,
  images,
  opts,
}: {
  p: Pal;
  item: PdfItem;
  images: Map<string, string>;
  opts: PdfOptions;
}) {
  const { k } = useLayout();
  const t = useText(p);
  const src = images.get(item.image) ?? images.get(item.fallback);
  const focus = opts.badges && item.isFocus;
  const prices = priceLines(item.value);
  const longPrice = prices.length > 1 || item.value.length > 16;
  const photo = 46 * Math.min(k, 1.15);
  return (
    <View style={{ ...card(p, focus), flexDirection: "row", gap: 8 }}>
      {!opts.photos ? null : src ? (
        <PdfImage
          src={src}
          style={{ width: photo, height: photo, borderRadius: 4 }}
        />
      ) : (
        <View
          style={{
            width: photo,
            height: photo,
            borderRadius: 4,
            backgroundColor: alpha(p.G, 0.08),
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}
        >
          <Text style={{ ...t.name, flex: 1 }}>{item.name}</Text>
          {item.value && !longPrice ? (
            <Text style={{ ...t.price, textAlign: "right" }}>{item.value}</Text>
          ) : null}
        </View>
        {longPrice ? (
          <View style={{ marginTop: 2 }}>
            {prices.map((line, i) => (
              <Text key={i} style={t.priceLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {opts.badges && (item.isFocus || item.isVegan) ? (
          <View style={{ marginTop: 2.5 }}>
            <Badges p={p} item={item} opts={opts} />
          </View>
        ) : null}
        <ItemDetails p={p} item={item} opts={opts} />
      </View>
    </View>
  );
}

/* ─── Estilo "lista clássica": nome ······ preço, sem foto nem card ─── */
function ListItem({
  p,
  item,
  opts,
}: {
  p: Pal;
  item: PdfItem;
  opts: PdfOptions;
}) {
  const t = useText(p);
  const prices = priceLines(item.value);
  const longPrice = prices.length > 1 || item.value.length > 22;
  const leader = {
    flex: 1,
    minWidth: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: alpha(p.G, 0.35),
    borderBottomStyle: "dotted" as const,
    marginBottom: 3,
  };
  return (
    <View style={{ flex: 1, paddingVertical: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        <Text style={{ ...t.name, flexShrink: 1 }}>{item.name}</Text>
        {opts.badges && (item.isFocus || item.isVegan) ? (
          <View style={{ marginBottom: 1.5 }}>
            <Badges p={p} item={item} opts={opts} />
          </View>
        ) : null}
        {item.value && !longPrice ? (
          <>
            <View style={leader} />
            <Text style={t.price}>{item.value}</Text>
          </>
        ) : null}
      </View>
      {longPrice
        ? prices.map((line, i) => (
            <Text key={i} style={{ ...t.priceLine, marginTop: i ? 0 : 1.5 }}>
              {line}
            </Text>
          ))
        : null}
      <ItemDetails p={p} item={item} opts={opts} />
    </View>
  );
}

function InfoCard({ p, info }: { p: Pal; info: InfoType }) {
  const t = useText(p);
  return (
    <View style={{ ...card(p), borderLeftWidth: 2.5, borderLeftColor: p.G }}>
      <Text style={t.name}>{info.name}</Text>
      {info.description ? <Text style={t.body}>{info.description}</Text> : null}
      {info.values.length ? (
        <Text style={{ ...t.price, marginTop: 4 }}>
          {info.values.join("  ›  ")}
        </Text>
      ) : null}
    </View>
  );
}

function ComboCard({ p, combo }: { p: Pal; combo: ComboType }) {
  const t = useText(p);
  return (
    <View style={card(p)}>
      <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
        <Text style={{ ...t.name, flex: 1 }}>{combo.name}</Text>
        {combo.value ? (
          <Text style={{ ...t.price, maxWidth: 110, textAlign: "right" }}>
            {combo.value}
          </Text>
        ) : null}
      </View>
      {combo.description ? (
        <Text style={t.body}>{combo.description}</Text>
      ) : null}
    </View>
  );
}

/* ─── Linhas que não se partem ─── */
type Row = { lead: React.ReactNode[]; cells: React.ReactNode[] };

/** Em linhas de `cols`; `lead` (títulos) entra na 1ª linha para não ficar sozinho no pé da página. */
function gridRows(
  cells: React.ReactNode[],
  lead: React.ReactNode[],
  cols: number,
): Row[] {
  return rows(cells, cols).map((r, i) => ({
    lead: i === 0 ? lead : [],
    cells: r,
  }));
}

function RowView({
  row,
  cols,
  gap,
  colGap,
}: {
  row: Row;
  cols: number;
  gap: number;
  colGap?: number;
}) {
  return (
    <View wrap={false}>
      {row.lead}
      <View
        style={{ flexDirection: "row", gap: colGap ?? gap, marginBottom: gap }}
      >
        {row.cells.map((c, i) => (
          <View key={i} style={{ flex: 1, flexDirection: "row" }}>
            {c}
          </View>
        ))}
        {Array.from({ length: cols - row.cells.length }, (_, i) => (
          <View key={`vazio-${i}`} style={{ flex: 1 }} />
        ))}
      </View>
    </View>
  );
}

/* ─── Regulamento (o mesmo texto do site) ─── */
function RulesPage({
  p,
  opts,
  pub,
  record,
}: {
  p: Pal;
  opts: PdfOptions;
  pub: PubInfo;
  record?: MenuDocProps["record"];
}) {
  const L = useLayout();
  const t = useText(p);
  const contacts = [
    pub.whatsapp && { label: "WhatsApp", value: formatPhoneBR(pub.whatsapp) },
    pub.instagram && { label: "Instagram", value: `@${pub.instagram}` },
    pub.facebook && { label: "Facebook", value: `/${pub.facebook}` },
    pub.website && { label: "Site", value: pub.website },
    pub.address && { label: "Endereço", value: pub.address },
  ].filter(Boolean) as { label: string; value: string }[];
  const label = {
    fontFamily: "Cinzel",
    fontWeight: 600,
    fontSize: 7.5 * L.k,
    letterSpacing: 1.6,
    color: alpha(p.G, 0.75),
  } as const;
  const boxes = [
    ...LEGAL_NOTICES.map((n) => (
      <View key={n.kind} style={{ ...card(p), gap: 4 }}>
        <Text style={label}>{n.label.toUpperCase()}</Text>
        <Text style={{ ...t.body, marginTop: 0 }}>{n.text}</Text>
        <Text style={{ ...t.obs, marginTop: 2 }}>{n.law}</Text>
      </View>
    )),
    <View key="pagamento" style={{ ...card(p), gap: 4 }}>
      <Text style={label}>{PAYMENT.label.toUpperCase()}</Text>
      {PAYMENT.methods.map((m) => (
        <Text key={m} style={{ ...t.body, marginTop: 0 }}>
          • {m}
        </Text>
      ))}
      <Text style={{ ...t.obs, marginTop: 2 }}>{PAYMENT.note}</Text>
    </View>,
  ];
  return (
    <ContentPage p={p} opts={opts} pub={pub} record={record}>
      <SectionHeader
        p={p}
        id="regulamento"
        title="Regulamento"
        record={record}
      />
      <View style={{ gap: 16 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 22,
            rowGap: 6,
          }}
        >
          {contacts.map((c) => (
            <View key={c.label} style={{ alignItems: "center" }}>
              <Text style={label}>{c.label.toUpperCase()}</Text>
              <Text style={{ ...t.body, marginTop: 2, color: p.TEXT }}>
                {c.value}
              </Text>
            </View>
          ))}
        </View>
        <Rule color={alpha(p.G, 0.25)}>
          <Diamond color={p.G2} size={5} />
        </Rule>
        <View>
          {rows(boxes, L.rulesCols).map((row, r) => (
            <RowView
              key={r}
              row={{ lead: [], cells: row }}
              cols={L.rulesCols}
              gap={L.gap}
            />
          ))}
        </View>
        {/* Observações e PROCON sempre juntos (o PROCON não fica sozinho numa página) */}
        <View wrap={false} style={{ gap: 16 }}>
          <View
            style={{
              // Sem "flex" (o do card zera a altura numa coluna e as linhas se sobrepõem)
              borderWidth: 0.5,
              borderColor: alpha(p.G, 0.22),
              borderRadius: 5,
              padding: 8,
              gap: 4,
            }}
          >
            {HOUSE_NOTES.map((n) => (
              <Text key={n} style={{ ...t.body, marginTop: 0 }}>
                • {n}
              </Text>
            ))}
          </View>
          <Text
            style={{ ...label, textAlign: "center", color: alpha(p.G, 0.5) }}
          >
            {PROCON}
          </Text>
        </View>
      </View>
    </ContentPage>
  );
}

/* ─── Verso: última página, minimalista ─── */
function BackPage({
  p,
  opts,
  pub,
  logo,
  qr,
}: {
  p: Pal;
  opts: PdfOptions;
  pub: PubInfo;
  logo?: string | null;
  qr?: MenuDocProps["qr"];
}) {
  const L = useLayout();
  const hours = hoursLines(pub.hours);
  const contacts = [
    pub.website,
    pub.instagram && `@${pub.instagram}`,
    pub.whatsapp && formatPhoneBR(pub.whatsapp),
  ]
    .filter(Boolean)
    .join("   ·   ");
  const small = {
    fontFamily: "Lato",
    fontSize: 8.5,
    color: alpha(p.TEXT, 0.62),
  };
  return (
    <Page
      size={opts.paper}
      style={{
        backgroundColor: p.BG,
        paddingHorizontal: L.coverPadX,
        paddingVertical: L.coverPadY,
      }}
    >
      <Frame p={p} />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        {logo ? (
          <PdfImage
            src={logo}
            style={{ width: L.backLogo, height: L.backLogo }}
          />
        ) : null}
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Cinzel",
              fontWeight: 700,
              fontSize: L.coverTitle * 0.75,
              letterSpacing: L.coverTitleSpacing * 0.8,
              color: p.G,
            }}
          >
            CARCASSONNE PUB
          </Text>
          <Text
            style={{
              fontFamily: "Lato",
              fontStyle: "italic",
              fontSize: 9.5,
              letterSpacing: 3,
              color: p.G2,
              marginTop: 5,
            }}
          >
            Pub &amp; Luderia
          </Text>
        </View>
        <View style={{ width: L.coverRule * 0.7 }}>
          <Rule color={alpha(p.G, 0.45)}>
            <Diamond color={p.G} size={6} />
          </Rule>
        </View>
        {hours.length ? (
          <View style={{ alignItems: "center", gap: 3 }}>
            <Text
              style={{
                fontFamily: "Cinzel",
                fontWeight: 600,
                fontSize: 8,
                letterSpacing: 2.4,
                color: p.G2,
                marginBottom: 3,
              }}
            >
              HORÁRIO
            </Text>
            {hours.map((h) => (
              <Text key={h.days} style={small}>
                <Text style={{ color: p.TEXT }}>{h.days}</Text>
                {"  ·  "}
                {h.time}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={{ alignItems: "center", gap: 4 }}>
          {contacts ? (
            <Text style={{ ...small, color: alpha(p.TEXT, 0.8) }}>
              {contacts}
            </Text>
          ) : null}
          {pub.address ? (
            <Text style={{ ...small, fontSize: 7.5, textAlign: "center" }}>
              {pub.address}
            </Text>
          ) : null}
        </View>
        {qr ? <QrBlock p={p} qr={qr} size={L.qrCover} /> : null}
      </View>
    </Page>
  );
}

/* ─── Documento ─── */
export function MenuDocument(props: MenuDocProps) {
  const { model, opts, pub, images, logo, qr, tocPages, record, generatedAt } =
    props;
  const p = PALETTES[opts.theme];
  const L: Layout = { ...LAYOUTS[opts.paper], k: FONT_SCALE[opts.fontSize] };
  const list = opts.style === "list";
  const entries: TocEntry[] = [
    ...tocEntries(model),
    ...(opts.rules ? [{ id: "regulamento", title: "Regulamento" }] : []),
  ];
  const head = { p, pub, logo, entries, tocPages, generatedAt, opts, qr };

  type Block = {
    id: string;
    title: string;
    subtitle?: string;
    kind: "cards" | "items";
    groups: { name?: string; cells: React.ReactNode[] }[];
  };
  const blocks: Block[] = [];
  if (model.infos.length)
    blocks.push({
      id: "avisos",
      title: "Avisos",
      kind: "cards",
      groups: [
        {
          cells: model.infos.map((i, k) => <InfoCard key={k} p={p} info={i} />),
        },
      ],
    });
  if (model.combos.length)
    blocks.push({
      id: "combos",
      title: "Combos",
      kind: "cards",
      groups: [
        {
          cells: model.combos.map((c, k) => (
            <ComboCard key={k} p={p} combo={c} />
          )),
        },
      ],
    });
  for (const s of model.sections as PdfSection[])
    blocks.push({
      id: s.id,
      title: s.title,
      subtitle: opts.subtitles ? s.subtitle : undefined,
      kind: "items",
      groups: s.groups.map((g) => ({
        name: g.name,
        cells: g.items.map((it) =>
          list ? (
            <ListItem key={it.key} p={p} item={it} opts={opts} />
          ) : (
            <ItemCard
              key={it.key}
              p={p}
              item={it}
              images={images}
              opts={opts}
            />
          ),
        ),
      })),
    });

  const blockRows = (b: Block): Row[] =>
    b.groups.flatMap((g, gi) =>
      gridRows(
        g.cells,
        [
          ...(gi === 0
            ? [
                <SectionHeader
                  key="h"
                  p={p}
                  id={b.id}
                  title={b.title}
                  subtitle={b.subtitle}
                  record={record}
                />,
              ]
            : []),
          ...(g.name ? [<GroupLabel key="g" p={p} name={g.name} />] : []),
        ],
        L.cols,
      ),
    );

  // Na lista clássica, as linhas ficam mais juntas e as colunas mais afastadas
  const rowGap = (b: Block) => (list && b.kind === "items" ? 6 * L.k : L.gap);
  const colGap = (b: Block) => (list && b.kind === "items" ? 26 : L.gap);

  // Sem capa e sem abertura, o QR fecha o cardápio (se não houver verso, que também tem o QR)
  const qrAtEnd =
    qr && !opts.cover && !opts.masthead && !opts.backPage ? qr : null;
  const hasContent =
    blocks.length > 0 ||
    (!opts.cover && (opts.masthead || opts.toc || opts.legend));

  return (
    <LayoutContext.Provider value={L}>
      <Document
        title="Cardápio · Carcassonne Pub"
        author="Carcassonne Pub"
        subject="Cardápio"
        language="pt-BR"
        pageMode="useOutlines"
        creator="Carcassonne Admin"
        producer="Carcassonne Admin"
      >
        {opts.cover ? <Cover {...head} /> : null}
        {hasContent ? (
          <ContentPage p={p} opts={opts} pub={pub} record={record}>
            {opts.cover ? null : <Masthead {...head} />}
            {blocks.map((b, i) => (
              <View
                key={b.id}
                break={opts.sectionPerPage && i > 0}
                style={{
                  marginTop: i === 0 || opts.sectionPerPage ? 0 : L.sectionGap,
                }}
              >
                {blockRows(b).map((row, r) => (
                  <RowView
                    key={r}
                    row={row}
                    cols={L.cols}
                    gap={rowGap(b)}
                    colGap={colGap(b)}
                  />
                ))}
              </View>
            ))}
            {qrAtEnd ? (
              <View
                wrap={false}
                style={{ marginTop: 16, alignItems: "center", gap: 12 }}
              >
                <View style={{ width: "100%" }}>
                  <Rule color={alpha(p.G, 0.3)}>
                    <Diamond color={p.G} size={6} />
                  </Rule>
                </View>
                <QrBlock p={p} qr={qrAtEnd} size={L.qrCover} />
              </View>
            ) : null}
          </ContentPage>
        ) : null}
        {opts.rules ? (
          <RulesPage p={p} opts={opts} pub={pub} record={record} />
        ) : null}
        {opts.backPage ? (
          <BackPage p={p} opts={opts} pub={pub} logo={logo} qr={qr} />
        ) : null}
      </Document>
    </LayoutContext.Provider>
  );
}
