"use client";

/**
 * Central de ajuda do admin: "O que você quer fazer?".
 * Três vistas pelo endereço: entrada (busca, mais procurados e áreas),
 * uma área (?area=…) e um guia (?guia=…). O conteúdo fica em src/help.
 */
import React, { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCalendarDays,
  LuChevronRight,
  LuExternalLink,
  LuLibrary,
  LuLifeBuoy,
  LuLightbulb,
  LuLink,
  LuMap,
  LuMusic,
  LuPackage,
  LuPalette,
  LuSearch,
  LuSlidersHorizontal,
  LuSparkles,
  LuTriangleAlert,
  LuUsers,
  LuUtensils,
  LuWandSparkles,
  LuX,
} from "react-icons/lu";
import { AREAS, GUIDES, POPULAR, areaOf, countByArea, guideById, guidesByArea, type AreaId, type Guide } from "@/help";
import { searchGuides } from "@/help/search";

const AREA_ICONS: Record<AreaId, IconType> = {
  reservas: LuCalendarDays,
  mapa: LuMap,
  aluguel: LuPackage,
  cardapio: LuUtensils,
  colecao: LuLibrary,
  eventos: LuSparkles,
  musicas: LuMusic,
  links: LuLink,
  usuarios: LuUsers,
  configuracoes: LuSlidersHorizontal,
  temas: LuPalette,
  extras: LuWandSparkles,
};

/** Texto com **negrito** → nomes de botões e menus em destaque. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-primary-gold">
            {p}
          </strong>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
}

function AreaIcon({ area, size = 18, className = "" }: { area: AreaId; size?: number; className?: string }) {
  const Icon = AREA_ICONS[area];
  return <Icon size={size} className={className} aria-hidden="true" />;
}

function IconTile({ area, big = false }: { area: AreaId; big?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-primary-gold/20 to-primary-gold/5 text-primary-gold ring-1 ring-primary-gold/15 ${
        big ? "h-11 w-11" : "h-9 w-9"
      }`}
    >
      <AreaIcon area={area} size={big ? 21 : 17} />
    </span>
  );
}

/** Linha de um guia nas listas (mais procurados, área, resultados). */
function GuideRow({ guide, onOpen, showArea = true }: { guide: Guide; onOpen: (id: string) => void; showArea?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(guide.id)}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-primary-gold/10 bg-secondary-black/50 px-3 py-2.5 text-left transition-all hover:border-primary-gold/35 hover:bg-secondary-black/80"
    >
      {showArea && <IconTile area={guide.area} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium leading-snug text-primary-gold/90 group-hover:text-primary-gold">{guide.title}</span>
        <span className="mt-0.5 truncate text-xs text-primary-gold/45">
          {showArea ? `${areaOf(guide.area).label} · ` : ""}
          {guide.summary.replace(/\*\*/g, "")}
        </span>
      </span>
      <LuChevronRight size={16} className="shrink-0 text-primary-gold/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-gold/70" />
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-gold/45">{children}</p>;
}

function SearchBox({
  value,
  onChange,
  big,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  big?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <label
      className={`flex w-full items-center gap-3 rounded-2xl border border-primary-gold/30 bg-primary-black/70 text-primary-gold transition-colors focus-within:border-primary-gold/70 ${
        big ? "px-4 py-3.5 shadow-[0_16px_40px_-18px_rgba(230,197,107,0.45)]" : "px-3 py-2.5"
      }`}
    >
      <LuSearch size={big ? 20 : 17} className="shrink-0 text-primary-gold/60" aria-hidden="true" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
        placeholder="O que você quer fazer? Ex.: cancelar aluguel pago"
        aria-label="Buscar na ajuda"
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-primary-gold/35 ${big ? "text-base" : "text-sm"}`}
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Limpar a busca" className="cursor-pointer text-primary-gold/50 hover:text-primary-gold">
          <LuX size={16} />
        </button>
      ) : (
        <kbd className="hidden rounded-md border border-primary-gold/25 px-1.5 text-[11px] text-primary-gold/45 sm:block">/</kbd>
      )}
    </label>
  );
}

/* ─── Vistas ─── */

function Home({ onOpen, onArea }: { onOpen: (id: string) => void; onArea: (a: AreaId) => void }) {
  const popular = POPULAR.map((id) => guideById(id)).filter((g): g is Guide => !!g);
  return (
    <div className="flex flex-col gap-7">
      <section>
        <SectionLabel>Mais procurados</SectionLabel>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {popular.map((g) => (
            <GuideRow key={g.id} guide={g} onOpen={onOpen} />
          ))}
        </div>
      </section>
      <section>
        <SectionLabel>Por área</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {AREAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onArea(a.id)}
              className="group flex cursor-pointer flex-col items-start gap-2.5 rounded-2xl border border-primary-gold/10 bg-secondary-black/50 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary-gold/35 hover:bg-secondary-black/80"
            >
              <IconTile area={a.id} big />
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-primary-gold/90 group-hover:text-primary-gold">{a.label}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-primary-gold/45">{a.description}</span>
              </span>
              <span className="mt-auto text-[11px] text-primary-gold/35">
                {countByArea(a.id)} {countByArea(a.id) === 1 ? "guia" : "guias"}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Results({ query, onOpen }: { query: string; onOpen: (id: string) => void }) {
  const results = useMemo(() => searchGuides(GUIDES, query), [query]);
  if (!results.length)
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary-gold/15 px-4 py-10 text-center">
        <LuLifeBuoy size={26} className="text-primary-gold/35" />
        <p className="text-sm text-primary-gold/70">Nada encontrado para &ldquo;{query}&rdquo;.</p>
        <p className="text-xs text-primary-gold/40">Tente com outras palavras, ou escolha uma área abaixo da busca vazia.</p>
      </div>
    );
  return (
    <section>
      <SectionLabel>
        {results.length} {results.length === 1 ? "resultado" : "resultados"}
      </SectionLabel>
      <div className="flex flex-col gap-2">
        {results.map((g) => (
          <GuideRow key={g.id} guide={g} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function AreaView({ area, onOpen, onBack }: { area: AreaId; onOpen: (id: string) => void; onBack: () => void }) {
  const info = areaOf(area);
  const groups = guidesByArea(area);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackButton onClick={onBack}>Ajuda</BackButton>
        <div className="flex items-center gap-3">
          <IconTile area={area} big />
          <div className="flex min-w-0 flex-col">
            <h1 className="text-xl font-semibold text-primary-gold sm:text-2xl">{info.label}</h1>
            <p className="text-sm text-primary-gold/50">{info.description}</p>
          </div>
          {info.href && (
            <Link
              href={info.href}
              className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-lg border border-primary-gold/25 px-3 py-1.5 text-xs text-primary-gold/70 transition-colors hover:border-primary-gold/60 hover:text-primary-gold sm:flex"
            >
              Abrir {info.label} <LuArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>
      {groups.map((g) => (
        <section key={g.section}>
          <SectionLabel>{g.section}</SectionLabel>
          <div className="flex flex-col gap-2">
            {g.guides.map((guide) => (
              <GuideRow key={guide.id} guide={guide} onOpen={onOpen} showArea={false} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-primary-gold/55 transition-colors hover:text-primary-gold"
    >
      <LuArrowLeft size={14} /> {children}
    </button>
  );
}

function GuideView({ guide, onOpen, onArea, onHome }: { guide: Guide; onOpen: (id: string) => void; onArea: (a: AreaId) => void; onHome: () => void }) {
  const area = areaOf(guide.area);
  const related = (guide.related ?? []).map((id) => guideById(id)).filter((g): g is Guide => !!g);
  const external = guide.link?.href.startsWith("http");
  return (
    <article className="flex flex-col gap-5">
      {/* Caminho */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-primary-gold/50" aria-label="Caminho">
        <button type="button" onClick={onHome} className="cursor-pointer hover:text-primary-gold">
          Ajuda
        </button>
        <LuChevronRight size={12} />
        <button type="button" onClick={() => onArea(guide.area)} className="flex cursor-pointer items-center gap-1 hover:text-primary-gold">
          <AreaIcon area={guide.area} size={13} /> {area.label}
        </button>
        <LuChevronRight size={12} />
        <span>{guide.section}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold leading-snug text-primary-gold sm:text-2xl">{guide.title}</h1>
        <p className="text-sm leading-relaxed text-primary-gold/60">
          <Rich text={guide.summary} />
        </p>
      </header>

      {guide.steps?.length ? (
        <ol className="flex flex-col gap-3">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-gold text-xs font-bold text-primary-black">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm leading-relaxed text-primary-white/85">
                <Rich text={s} />
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {guide.points?.length ? (
        <ul className="flex flex-col gap-2 rounded-2xl border border-primary-gold/10 bg-secondary-black/40 p-4">
          {guide.points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-primary-white/80">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-primary-gold/60" aria-hidden="true" />
              <span>
                <Rich text={p} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {guide.warning ? (
        <div className="flex gap-2.5 rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-sm leading-relaxed text-orange-100/90">
          <LuTriangleAlert size={18} className="mt-0.5 shrink-0 text-orange-300" aria-hidden="true" />
          <span>
            <Rich text={guide.warning} />
          </span>
        </div>
      ) : null}

      {guide.tips?.length ? (
        <div className="flex gap-2.5 rounded-xl border border-primary-gold/20 bg-primary-gold/5 px-4 py-3 text-sm leading-relaxed text-primary-white/80">
          <LuLightbulb size={18} className="mt-0.5 shrink-0 text-primary-gold" aria-hidden="true" />
          <div className="flex flex-col gap-1.5">
            {guide.tips.map((t, i) => (
              <span key={i}>
                <Rich text={t} />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {guide.link ? (
        external ? (
          <a
            href={guide.link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-2 rounded-xl bg-gradient-to-b from-[#f0d382] to-primary-gold px-4 py-2.5 text-sm font-semibold text-primary-black transition-all hover:brightness-105"
          >
            {guide.link.label} <LuExternalLink size={15} />
          </a>
        ) : (
          <Link
            href={guide.link.href}
            className="flex w-fit items-center gap-2 rounded-xl bg-gradient-to-b from-[#f0d382] to-primary-gold px-4 py-2.5 text-sm font-semibold text-primary-black shadow-[0_10px_26px_-10px_rgba(230,197,107,0.55)] transition-all hover:brightness-105"
          >
            {guide.link.label} <LuArrowRight size={15} />
          </Link>
        )
      ) : null}

      {related.length ? (
        <section className="mt-2 border-t border-primary-gold/10 pt-5">
          <SectionLabel>Relacionados</SectionLabel>
          <div className="flex flex-col gap-2">
            {related.map((g) => (
              <GuideRow key={g.id} guide={g} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

/* ─── Página ─── */

function AjudaContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const guide = guideById(params.get("guia"));
  const areaParam = params.get("area") as AreaId | null;
  const area = areaParam && AREAS.some((a) => a.id === areaParam) ? areaParam : null;
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const go = (search: string) => {
    router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
    topRef.current?.scrollIntoView({ block: "start" });
  };
  const openGuide = (id: string) => go(`guia=${id}`);
  const openArea = (a: AreaId) => go(`area=${a}`);
  const home = () => go("");

  // "/" vai direto para a busca (fora de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || t?.closest("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      if (guide || area) home();
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guide, area]);

  // Ao digitar numa área ou num guia, volta para a entrada com os resultados
  const onSearch = (v: string) => {
    setQuery(v);
    if (v && (guide || area)) home();
  };

  const showHome = !guide && !area;

  return (
    <div ref={topRef} className="mx-auto flex w-full max-w-[920px] flex-col gap-7 pb-16 pt-2 text-primary-gold">
      {showHome ? (
        <header className="flex flex-col items-center gap-3 pt-4 text-center sm:pt-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-primary-gold/25 to-primary-gold/5 ring-1 ring-primary-gold/20">
            <LuLifeBuoy size={24} />
          </span>
          <h1 className="text-2xl font-semibold tracking-wide sm:text-3xl">Como podemos ajudar?</h1>
          <p className="max-w-md text-sm text-primary-gold/50">
            Pergunte do seu jeito: &ldquo;estornar&rdquo;, &ldquo;devolver dinheiro&rdquo; e &ldquo;reembolsar&rdquo; levam ao mesmo lugar.
          </p>
          <div className="mt-2 w-full max-w-[620px]">
            <SearchBox value={query} onChange={onSearch} big inputRef={inputRef} />
          </div>
        </header>
      ) : (
        <SearchBox value={query} onChange={onSearch} inputRef={inputRef} />
      )}

      {guide ? (
        <GuideView guide={guide} onOpen={openGuide} onArea={openArea} onHome={home} />
      ) : area ? (
        <AreaView area={area} onOpen={openGuide} onBack={home} />
      ) : query.trim() ? (
        <Results query={query} onOpen={openGuide} />
      ) : (
        <Home onOpen={openGuide} onArea={openArea} />
      )}
    </div>
  );
}

export default function AjudaPage() {
  return (
    <Suspense fallback={null}>
      <AjudaContent />
    </Suspense>
  );
}
