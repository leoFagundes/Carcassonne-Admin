"use client";

import {
  MenuItemType,
  ComboType,
  InfoType,
  DescriptionTypeProps,
  TypeOrderType,
} from "@/types";
import { LuVegan, LuStar } from "react-icons/lu";

const G = "#e6c56b";   // primary gold
const G2 = "#d4af37";  // secondary gold
const BG = "#121111";  // primary black
const BG2 = "#1a1a1a"; // secondary black
const TEXT = "#f9f9f9";

type Props = {
  items?: MenuItemType[];
  combos?: ComboType[];
  infos?: InfoType[];
  descriptions?: DescriptionTypeProps[];
  typesOrder?: TypeOrderType[];
};

export default function MenuPDF({
  items = [],
  combos = [],
  infos = [],
  descriptions = [],
  typesOrder = [],
}: Props) {
  const visibleItems = items.filter((i) => i.isVisible);

  const orderedTypes = [...new Set(visibleItems.map((i) => i.type))].sort(
    (a, b) => {
      const orderA = typesOrder.find((t) => t.type.name === a)?.type.order ?? 999;
      const orderB = typesOrder.find((t) => t.type.name === b)?.type.order ?? 999;
      return orderA - orderB;
    }
  );

  return (
    <div
      id="cardapio-pdf"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "16mm 14mm",
        boxSizing: "border-box",
        backgroundColor: BG,
        color: G,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {/* HEADER */}
      <header style={{ textAlign: "center", marginBottom: "24px", pageBreakInside: "avoid" }}>
        {/* Logo crown decoration */}
        <div style={{ fontSize: "22px", letterSpacing: "8px", marginBottom: "4px", color: G2 }}>
          ✦ ✦ ✦
        </div>

        <h1 style={{
          fontSize: "38px",
          fontWeight: "700",
          letterSpacing: "6px",
          textTransform: "uppercase",
          margin: "0 0 4px",
          color: G,
        }}>
          Carcassonne Pub
        </h1>

        <div style={{
          fontSize: "13px",
          letterSpacing: "4px",
          textTransform: "uppercase",
          color: G2,
          marginBottom: "12px",
          fontStyle: "italic",
        }}>
          Pub &amp; Luderia
        </div>

        {/* Ornamental divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "8px" }}>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${G})` }} />
          <span style={{ fontSize: "18px", color: G }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${G})` }} />
        </div>

        <div style={{ fontSize: "12px", color: G2, letterSpacing: "1px", fontFamily: "Arial, sans-serif" }}>
          CARDÁPIO
        </div>
        <div style={{ fontSize: "11px", color: `${G}80`, fontFamily: "Arial, sans-serif", marginTop: "4px" }}>
          CLN 407 Bloco E Loja 37 — Asa Norte, Brasília – DF
        </div>
      </header>

      {/* AVISOS */}
      {infos.length > 0 && (
        <PDFSection title="Avisos">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[...infos]
              .sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0))
              .map((info) => (
                <div key={info.id} style={{
                  backgroundColor: BG2,
                  border: `1px solid ${G}40`,
                  borderLeft: `3px solid ${G}`,
                  padding: "10px 12px",
                  borderRadius: "4px",
                  pageBreakInside: "avoid",
                }}>
                  <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "4px" }}>
                    {info.name}
                  </div>
                  <div style={{ fontSize: "12px", color: TEXT, lineHeight: "1.5", fontFamily: "Arial, sans-serif" }}>
                    {info.description}
                  </div>
                  {info.values.length > 0 && (
                    <div style={{ marginTop: "6px", fontSize: "14px", fontWeight: "700", color: G }}>
                      {info.values.join(" → ")}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </PDFSection>
      )}

      {/* COMBOS */}
      {combos.length > 0 && (
        <PDFSection title="Combos">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {combos.map((combo) => (
              <div key={combo.id} style={{
                backgroundColor: BG2,
                border: `1px solid ${G}40`,
                padding: "10px 12px",
                borderRadius: "4px",
                pageBreakInside: "avoid",
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "4px",
                }}>
                  <span style={{ fontWeight: "700", fontSize: "13px" }}>{combo.name}</span>
                  <span style={{ fontWeight: "700", fontSize: "13px", whiteSpace: "nowrap", color: G }}>{combo.value}</span>
                </div>
                <div style={{ fontSize: "12px", color: TEXT, lineHeight: "1.5", fontFamily: "Arial, sans-serif" }}>
                  {combo.description}
                </div>
              </div>
            ))}
          </div>
        </PDFSection>
      )}

      {/* CATEGORIAS */}
      {orderedTypes.map((type) => {
        const typeItems = visibleItems
          .filter((i) => i.type === type)
          .sort((a, b) => {
            if (a.isFocus !== b.isFocus) return b.isFocus ? 1 : -1;
            return a.name.localeCompare(b.name);
          });

        const description = descriptions.find((d) => d.type === type)?.description;
        const noSubtype = typeItems.filter((i) => !i.subtype);
        const withSubtype = typeItems.filter((i) => i.subtype);
        const grouped = withSubtype.reduce(
          (acc, item) => {
            const key = item.subtype as string;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          },
          {} as Record<string, MenuItemType[]>
        );

        return (
          <PDFSection key={type} title={type} subtitle={description}>
            {noSubtype.length > 0 && (
              <ItemGrid items={noSubtype} />
            )}
            {Object.entries(grouped).map(([subtype, items]) => (
              <div key={subtype} style={{ marginTop: "16px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px",
                }}>
                  <div style={{ flex: 1, height: "1px", backgroundColor: `${G}30` }} />
                  <span style={{ fontSize: "13px", letterSpacing: "2px", color: G2, textTransform: "uppercase" }}>
                    {subtype}
                  </span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: `${G}30` }} />
                </div>
                <ItemGrid items={items} />
              </div>
            ))}
          </PDFSection>
        );
      })}

      {/* FOOTER */}
      <footer style={{
        marginTop: "40px",
        paddingTop: "16px",
        borderTop: `1px solid ${G}40`,
        textAlign: "center",
        pageBreakInside: "avoid",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${G}60)` }} />
          <span style={{ fontSize: "14px", color: G2 }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${G}60)` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", flexWrap: "wrap", fontFamily: "Arial, sans-serif" }}>
          <LegendItem icon="🌱" label="Vegano" />
          <LegendItem icon="⭐" label="Destaque" />
          <LegendItem label="Preços em Reais (R$)" />
        </div>
        <div style={{ marginTop: "12px", fontSize: "10px", color: `${G}50`, fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>
          CARCASSONNE PUB · carcassonnepub.com.br · @carcassonnepub
        </div>
      </footer>
    </div>
  );
}

/* ─── Section ─── */
function PDFSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "32px" }}>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: subtitle ? "4px" : "16px",
      }}>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${G})` }} />
        <h2 style={{
          fontSize: "22px",
          fontWeight: "700",
          letterSpacing: "3px",
          textTransform: "uppercase",
          margin: 0,
          color: G,
        }}>
          {title}
        </h2>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${G})` }} />
      </div>

      {subtitle && (
        <p style={{
          fontSize: "11px",
          fontStyle: "italic",
          textAlign: "center",
          color: `${G}90`,
          margin: "0 0 14px",
          fontFamily: "Arial, sans-serif",
        }}>
          {subtitle}
        </p>
      )}

      {children}
    </section>
  );
}

/* ─── Item grid (2 columns) ─── */
function ItemGrid({ items }: { items: MenuItemType[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {items.map((item) => (
        <MenuItem key={item.id} item={item} />
      ))}
    </div>
  );
}

/* ─── Menu item ─── */
function MenuItem({ item }: { item: MenuItemType }) {
  const imgSrc = item.image || "/images/patternMenuImage.png";

  return (
    <div style={{
      backgroundColor: BG2,
      border: `1px solid ${G}35`,
      borderRadius: "5px",
      padding: "10px 12px",
      pageBreakInside: "avoid",
      breakInside: "avoid",
      display: "flex",
      gap: "10px",
    }}>
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={item.name}
        style={{
          width: "64px",
          height: "64px",
          objectFit: "cover",
          borderRadius: "4px",
          flexShrink: 0,
          backgroundColor: "#0a0a0a",
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/images/patternMenuImage.png";
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: "700", fontSize: "13px", color: G, lineHeight: "1.4" }}>
            {item.name}
          </span>
          {item.isVegan && (
            <span title="Vegano" style={{ color: "#7fc87f", flexShrink: 0 }}>
              <LuVegan size={12} />
            </span>
          )}
          {item.isFocus && (
            <span title="Destaque" style={{ color: G, flexShrink: 0 }}>
              <LuStar size={11} />
            </span>
          )}
        </div>

        {/* Value */}
        {item.value && (
          <div style={{
            fontSize: "11px",
            fontWeight: "600",
            color: G2,
            marginBottom: "4px",
            fontFamily: "Arial, sans-serif",
          }}>
            {item.value}
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p style={{
            fontSize: "11px",
            color: `${TEXT}bb`,
            lineHeight: "1.5",
            margin: "0 0 3px",
            fontFamily: "Arial, sans-serif",
          }}>
            {item.description}
          </p>
        )}

        {/* Side dishes */}
        {item.sideDish && item.sideDish.length > 0 && (
          <div style={{ fontSize: "11px", color: `${G}75`, fontFamily: "Arial, sans-serif" }}>
            <span style={{ fontWeight: "600" }}>Acomp.: </span>
            {item.sideDish.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Legend item ─── */
function LegendItem({ icon, label }: { icon?: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: `${G}70` }}>
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </div>
  );
}
