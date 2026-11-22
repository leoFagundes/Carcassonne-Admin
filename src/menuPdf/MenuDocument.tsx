/**
 * O PDF do cardápio (react-pdf): capa com logo e sumário, depois as seções.
 * Cabeçalho e rodapé (com "Página X de Y") se repetem em toda página de
 * conteúdo; cada seção vira um marcador do PDF; um card nunca é cortado no
 * meio e o título de uma seção não fica sozinho no pé da página.
 */
import React from "react";
import {
  Document,
  Link,
  Page,
  Path,
  Svg,
  Text,
  View,
  Image as PdfImage,
} from "@react-pdf/renderer";
import type { ComboType, InfoType, PubInfo } from "@/types";
import {
  rows,
  tocEntries,
  type MenuModel,
  type PdfItem,
  type PdfSection,
} from "./model";
import { PALETTES, alpha, type PdfTheme } from "./theme";

const PAGE = { top: 64, bottom: 60, side: 40 };
const GAP = 9;

type Pal = (typeof PALETTES)[PdfTheme];

export type MenuDocProps = {
  model: MenuModel;
  theme: PdfTheme;
  pub: PubInfo;
  /** src → data URL das miniaturas. */
  images: Map<string, string>;
  logo?: string | null;
  sectionPerPage: boolean;
  /** Página de cada seção (passada da 1ª montagem); null mostra "…". */
  tocPages: Record<string, number> | null;
  /** Recebe a página de cada seção e o total, enquanto o PDF é montado. */
  record?: { pages: Record<string, number>; total: number };
  generatedAt: Date;
};

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
  return (
    <Text
      style={{
        fontFamily: "Lato",
        fontWeight: 700,
        fontSize: 5.8,
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

/* ─── Capa ─── */
function Cover({
  p,
  pub,
  logo,
  model,
  tocPages,
  generatedAt,
}: { p: Pal } & Pick<
  MenuDocProps,
  "pub" | "logo" | "model" | "tocPages" | "generatedAt"
>) {
  const entries = tocEntries(model);
  const twoCols = entries.length > 9;
  const cols = twoCols
    ? [
        entries.slice(0, Math.ceil(entries.length / 2)),
        entries.slice(Math.ceil(entries.length / 2)),
      ]
    : [entries];
  const month = generatedAt.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <Page
      size="A4"
      style={{
        backgroundColor: p.BG,
        paddingHorizontal: 56,
        paddingTop: 54,
        paddingBottom: 96,
      }}
    >
      {/* Moldura fina */}
      <View
        fixed
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          borderWidth: 0.7,
          borderColor: alpha(p.G, 0.35),
          borderRadius: 3,
        }}
      />
      <View
        fixed
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          borderWidth: 0.4,
          borderColor: alpha(p.G, 0.18),
          borderRadius: 2,
        }}
      />

      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ alignItems: "center" }}>
          {logo ? (
            <PdfImage
              src={logo}
              style={{ width: 118, height: 118, marginBottom: 14 }}
            />
          ) : null}
          <Text
            style={{
              fontFamily: "Cinzel",
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: 4,
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
          <View style={{ width: 260, marginTop: 16, marginBottom: 14 }}>
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

        {/* Sumário */}
        <View
          style={{
            marginTop: 34,
            borderTopWidth: 0.6,
            borderTopColor: alpha(p.G, 0.3),
            paddingTop: 18,
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
              marginBottom: 12,
            }}
          >
            SUMÁRIO
          </Text>
          <View style={{ flexDirection: "row", gap: 28 }}>
            {cols.map((col, c) => (
              <View key={c} style={{ flex: 1, gap: 7 }}>
                {col.map((e) => (
                  <Link
                    key={e.id}
                    src={`#${e.id}`}
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
                          fontSize: 9.5,
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
                          fontSize: 9.5,
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
      </View>

      {/* Rodapé da capa */}
      <View
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 44,
          alignItems: "center",
          gap: 5,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Pill text="Destaque" color={p.G} bg={alpha(p.G, 0.16)} />
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 7.5,
              color: alpha(p.TEXT, 0.55),
            }}
          >
            sugestão da casa
          </Text>
          <Pill text="Vegano" color={p.GREEN} bg={alpha(p.GREEN, 0.16)} />
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 7.5,
              color: alpha(p.TEXT, 0.55),
            }}
          >
            sem ingredientes de origem animal
          </Text>
        </View>
        <Text
          style={{ fontFamily: "Lato", fontSize: 7, color: alpha(p.TEXT, 0.4) }}
        >
          Preços em reais (R$) · atualizado em {month}
        </Text>
      </View>
    </Page>
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
  const contact = [pub.website, pub.instagram && `@${pub.instagram}`]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <>
      <View
        fixed
        style={{
          position: "absolute",
          top: 26,
          left: PAGE.side,
          right: PAGE.side,
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
          <Text
            style={{
              fontFamily: "Cinzel",
              fontWeight: 600,
              fontSize: 7.5,
              letterSpacing: 2.2,
              color: alpha(p.G, 0.8),
            }}
          >
            CARCASSONNE PUB
          </Text>
          <Diamond color={p.G} opacity={0.6} size={5} />
          <Text
            style={{
              fontFamily: "Cinzel",
              fontWeight: 600,
              fontSize: 7.5,
              letterSpacing: 2.2,
              color: alpha(p.G, 0.8),
            }}
          >
            CARDÁPIO
          </Text>
        </View>
      </View>
      <View
        fixed
        style={{
          position: "absolute",
          bottom: 24,
          left: PAGE.side,
          right: PAGE.side,
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
            fontSize: 16,
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
            fontSize: 8.5,
            color: alpha(p.TEXT, 0.62),
            textAlign: "center",
            marginTop: 5,
            paddingHorizontal: 40,
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
  return (
    <View style={{ marginTop: 6, marginBottom: 8, paddingHorizontal: 90 }}>
      <Rule color={alpha(p.G, 0.22)} gap={8}>
        <Text
          style={{
            fontFamily: "Cinzel",
            fontWeight: 600,
            fontSize: 8.5,
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

/* ─── Cards ─── */
const card = (p: Pal, strong = false) => ({
  flex: 1,
  backgroundColor: p.BG2,
  borderWidth: strong ? 0.9 : 0.5,
  borderColor: alpha(p.G, strong ? 0.55 : 0.22),
  borderRadius: 5,
  padding: 8,
});

function ItemCard({
  p,
  item,
  images,
}: {
  p: Pal;
  item: PdfItem;
  images: Map<string, string>;
}) {
  const src = images.get(item.image) ?? images.get(item.fallback);
  const prices = priceLines(item.value);
  const longPrice = prices.length > 1 || item.value.length > 16;
  return (
    <View style={{ ...card(p, item.isFocus), flexDirection: "row", gap: 8 }}>
      {src ? (
        <PdfImage
          src={src}
          style={{ width: 46, height: 46, borderRadius: 4 }}
        />
      ) : (
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 4,
            backgroundColor: alpha(p.G, 0.08),
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}
        >
          <Text
            style={{
              flex: 1,
              fontFamily: "Lato",
              fontWeight: 700,
              fontSize: 9.5,
              color: p.G,
              lineHeight: 1.25,
            }}
          >
            {item.name}
          </Text>
          {item.value && !longPrice ? (
            <Text
              style={{
                fontFamily: "Lato",
                fontWeight: 700,
                fontSize: 9,
                color: p.G2,
                textAlign: "right",
                lineHeight: 1.25,
              }}
            >
              {item.value}
            </Text>
          ) : null}
        </View>
        {longPrice ? (
          <View style={{ marginTop: 2 }}>
            {prices.map((line, i) => (
              <Text
                key={i}
                style={{
                  fontFamily: "Lato",
                  fontWeight: 700,
                  fontSize: 8.2,
                  color: p.G2,
                  lineHeight: 1.3,
                }}
              >
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {item.isFocus || item.isVegan ? (
          <View style={{ flexDirection: "row", gap: 3, marginTop: 2.5 }}>
            {item.isFocus ? (
              <Pill text="Destaque" color={p.G} bg={alpha(p.G, 0.16)} />
            ) : null}
            {item.isVegan ? (
              <Pill text="Vegano" color={p.GREEN} bg={alpha(p.GREEN, 0.16)} />
            ) : null}
          </View>
        ) : null}
        {item.description ? (
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 7.8,
              color: alpha(p.TEXT, 0.74),
              lineHeight: 1.38,
              marginTop: 3,
            }}
          >
            {item.description}
          </Text>
        ) : null}
        {item.sideDish.length ? (
          <Text
            style={{
              fontFamily: "Lato",
              fontSize: 7.3,
              color: alpha(p.G, 0.8),
              marginTop: 2.5,
              lineHeight: 1.3,
            }}
          >
            <Text style={{ fontWeight: 700 }}>Acompanha: </Text>
            {item.sideDish.join(", ")}
          </Text>
        ) : null}
        {item.observation.length ? (
          <Text
            style={{
              fontFamily: "Lato",
              fontStyle: "italic",
              fontSize: 7,
              color: alpha(p.TEXT, 0.55),
              marginTop: 2,
              lineHeight: 1.3,
            }}
          >
            {item.observation.join(" · ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Separa as opções de preço ("Broto R$ 49 / Grande R$ 79" → duas linhas). */
function priceLines(value: string): string[] {
  return value
    .split(/\s+\/\s+|\s*;\s*/)
    .map((v) => v.trim())
    .filter(Boolean);
}

type Row = { lead: React.ReactNode[]; cells: React.ReactNode[] };

/** Cards de dois em dois; `lead` (títulos) entra na 1ª linha para não ficar sozinho no pé da página. */
function gridRows(cells: React.ReactNode[], lead: React.ReactNode[]): Row[] {
  return rows(cells).map((r, i) => ({ lead: i === 0 ? lead : [], cells: r }));
}

function RowView({ row }: { row: Row }) {
  return (
    <View wrap={false}>
      {row.lead}
      <View style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}>
        {row.cells.map((c, i) => (
          <View key={i} style={{ flex: 1, flexDirection: "row" }}>
            {c}
          </View>
        ))}
        {row.cells.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}

function InfoCard({ p, info }: { p: Pal; info: InfoType }) {
  return (
    <View style={{ ...card(p), borderLeftWidth: 2.5, borderLeftColor: p.G }}>
      <Text
        style={{
          fontFamily: "Lato",
          fontWeight: 700,
          fontSize: 9.5,
          color: p.G,
        }}
      >
        {info.name}
      </Text>
      {info.description ? (
        <Text
          style={{
            fontFamily: "Lato",
            fontSize: 7.8,
            color: alpha(p.TEXT, 0.74),
            lineHeight: 1.38,
            marginTop: 3,
          }}
        >
          {info.description}
        </Text>
      ) : null}
      {info.values.length ? (
        <Text
          style={{
            fontFamily: "Lato",
            fontWeight: 700,
            fontSize: 9,
            color: p.G2,
            marginTop: 4,
          }}
        >
          {info.values.join("  ›  ")}
        </Text>
      ) : null}
    </View>
  );
}

function ComboCard({ p, combo }: { p: Pal; combo: ComboType }) {
  return (
    <View style={card(p)}>
      <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
        <Text
          style={{
            flex: 1,
            fontFamily: "Lato",
            fontWeight: 700,
            fontSize: 9.5,
            color: p.G,
            lineHeight: 1.25,
          }}
        >
          {combo.name}
        </Text>
        {combo.value ? (
          <Text
            style={{
              fontFamily: "Lato",
              fontWeight: 700,
              fontSize: 9,
              color: p.G2,
              maxWidth: 110,
              textAlign: "right",
            }}
          >
            {combo.value}
          </Text>
        ) : null}
      </View>
      {combo.description ? (
        <Text
          style={{
            fontFamily: "Lato",
            fontSize: 7.8,
            color: alpha(p.TEXT, 0.74),
            lineHeight: 1.38,
            marginTop: 3,
          }}
        >
          {combo.description}
        </Text>
      ) : null}
    </View>
  );
}

/* ─── Documento ─── */
export function MenuDocument(props: MenuDocProps) {
  const {
    model,
    theme,
    pub,
    images,
    logo,
    sectionPerPage,
    tocPages,
    record,
    generatedAt,
  } = props;
  const p = PALETTES[theme];

  type Block = {
    id: string;
    title: string;
    subtitle?: string;
    groups: { name?: string; cells: React.ReactNode[] }[];
  };
  const blocks: Block[] = [];
  if (model.infos.length)
    blocks.push({
      id: "avisos",
      title: "Avisos",
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
      subtitle: s.subtitle,
      groups: s.groups.map((g) => ({
        name: g.name,
        cells: g.items.map((it) => (
          <ItemCard key={it.key} p={p} item={it} images={images} />
        )),
      })),
    });

  const blockRows = (b: Block): Row[] =>
    b.groups.flatMap((g, gi) =>
      gridRows(g.cells, [
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
      ]),
    );

  return (
    <Document
      title="Cardápio · Carcassonne Pub"
      author="Carcassonne Pub"
      subject="Cardápio"
      language="pt-BR"
      pageMode="useOutlines"
      creator="Carcassonne Admin"
      producer="Carcassonne Admin"
    >
      <Cover
        p={p}
        pub={pub}
        logo={logo}
        model={model}
        tocPages={tocPages}
        generatedAt={generatedAt}
      />
      <Page
        size="A4"
        style={{
          backgroundColor: p.BG,
          paddingTop: PAGE.top,
          paddingBottom: PAGE.bottom,
          paddingHorizontal: PAGE.side,
        }}
      >
        <Chrome p={p} pub={pub} record={record} />
        {blocks.map((b, i) => (
          <View
            key={b.id}
            break={sectionPerPage && i > 0}
            style={{ marginTop: i === 0 || sectionPerPage ? 0 : 18 }}
          >
            {blockRows(b).map((row, r) => (
              <RowView key={r} row={row} />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
