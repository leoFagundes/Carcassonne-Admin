"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  MenuItemType,
  ComboType,
  InfoType,
  DescriptionTypeProps,
  TypeOrderType,
} from "@/types";
import { LuStar, LuVegan } from "react-icons/lu";

const COLORS = {
  primaryBlack: "#121111",
  secondaryBlack: "#1a1a1a",
  darkBlack: "#0a0a0a",
  primaryGold: "#e6c56b",
  secondaryGold: "#d4af37",
  primaryWhite: "#f9f9f9",
  brown: "#2f1e0b",
};

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
      const orderA =
        typesOrder.find((t) => t.type.name === a)?.type.order ?? 999;
      const orderB =
        typesOrder.find((t) => t.type.name === b)?.type.order ?? 999;
      return orderA - orderB;
    }
  );

  return (
    <div
      id="cardapio-pdf"
      style={{
        width: "210mm",
        minHeight: "297mm",
        backgroundColor: COLORS.primaryBlack,
        color: COLORS.primaryGold,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* HEADER */}
      <header style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "36px", marginBottom: "6px" }}>Cardápio</h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontStyle: "italic",
            fontSize: "14px",
          }}
        >
          <Line />
          <span>Carcassonne Pub</span>
          <Line />
        </div>
      </header>

      {/* AVISOS */}
      {infos.length > 0 && (
        <Section title="Avisos">
          {[...infos]
            .sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0))
            .map((info) => (
              <Card key={info.id}>
                <strong>{info.name}</strong>
                <p style={{ fontSize: "14px", marginTop: "6px" }}>
                  {info.description}
                </p>
              </Card>
            ))}
        </Section>
      )}

      {/* COMBOS */}
      {combos.length > 0 && (
        <Section title="Combos">
          {combos.map((combo) => (
            <Card key={combo.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "16px",
                }}
              >
                <div>
                  <strong>{combo.name}</strong>
                  <p style={{ fontSize: "14px", marginTop: "6px" }}>
                    {combo.description}
                  </p>
                </div>
                <strong>{combo.value}</strong>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* CATEGORIAS */}
      {orderedTypes.map((type) => {
        const typeItems = visibleItems.filter((i) => i.type === type);

        const description = descriptions.find(
          (d) => d.type === type
        )?.description;

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
          <Section key={type} title={type} subtitle={description}>
            {noSubtype.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}

            {Object.entries(grouped).map(([subtype, items]) => (
              <div key={subtype} style={{ marginTop: "24px" }}>
                <h3
                  style={{
                    textAlign: "center",
                    fontSize: "20px",
                    marginBottom: "12px",
                  }}
                >
                  {subtype}
                </h3>
                {items.map((item) => (
                  <MenuItem key={item.id} item={item} />
                ))}
              </div>
            ))}
          </Section>
        );
      })}
    </div>
  );
}

/* ---------- Helpers ---------- */

function Line() {
  return (
    <div
      className="w-full my-4"
      style={{
        height: "1px",

        backgroundColor: COLORS.primaryGold,
      }}
    />
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "48px" }}>
      <h2 className="mb-4" style={{ fontSize: "28px", textAlign: "center" }}>
        {title}
      </h2>

      {subtitle && (
        <p
          style={{
            fontSize: "12px",
            fontStyle: "italic",
            textAlign: "center",
            margin: "12px 0 24px",
          }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: COLORS.secondaryBlack,
        padding: "16px",
        borderRadius: "6px",
        marginBottom: "16px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({ item }: { item: MenuItemType }) {
  return (
    <Card>
      <div style={{ display: "flex", gap: "16px" }}>
        <img
          src={item.image || "/images/patternMenuImage.png"}
          alt={item.name}
          crossOrigin="anonymous"
          style={{
            width: "90px",
            height: "90px",
            objectFit: "cover",
            borderRadius: "6px",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        />

        <div style={{ flex: 1 }}>
          <div
            className="h-full"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <strong>{item.name}</strong>
                {item.isVegan && (
                  <span style={{ marginLeft: "6px" }}>
                    <LuVegan />
                  </span>
                )}
                {item.isFocus && (
                  <span
                    className="flex items-center gap-2 "
                    style={{ marginLeft: "6px" }}
                  >
                    <LuStar />
                  </span>
                )}
              </div>
              {item.description && (
                <p
                  className="flex-1 h-full "
                  style={{
                    fontSize: "14px",
                    marginTop: "6px",
                    color: COLORS.primaryGold,
                  }}
                >
                  {item.description}
                </p>
              )}
              <strong>{item.value}</strong>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
