"use client";

import LoaderFullscreen from "@/components/loaderFullscreen";
import MenuPDF from "@/components/menupdf";
import { useAlert } from "@/contexts/alertProvider";
import ComboRepository from "@/services/repositories/ComboRepository";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import {
  InfoType,
  ComboType,
  MenuItemType,
  DescriptionTypeProps,
  TypeOrderType,
} from "@/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LuDownload, LuFileText, LuPrinter } from "react-icons/lu";
import Loader from "@/components/loader";
import { FiSkipBack } from "react-icons/fi";

export default function PDFPage() {
  const [loading, setLoading] = useState(false);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [combos, setCombos] = useState<ComboType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [descriptions, setDescriptions] = useState<DescriptionTypeProps[]>([]);
  const [typesOrder, setTypesOrder] = useState<TypeOrderType[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { addAlert } = useAlert();
  const router = useRouter();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [
          fetchedTypesOrder,
          fetchedItems,
          fetchedCombos,
          fetchedInfos,
          fetchedDescriptions,
        ] = await Promise.all([
          TypesOrderRepository.getAll(),
          MenuItemRepository.getAll(),
          ComboRepository.getAll(),
          InfoRepository.getAll(),
          DescriptionRepository.getAll(),
        ]);
        setTypesOrder(fetchedTypesOrder);
        setMenuItems(fetchedItems);
        setCombos(fetchedCombos);
        setInfos(fetchedInfos);
        setDescriptions(fetchedDescriptions);
      } catch (error) {
        addAlert(`Erro ao carregar dados: ${error}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  function printPDF(): void {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  }

  async function fetchBase64(src: string): Promise<string> {
    // Usa proxy server-side para evitar CORS com URLs externas (ex: Firebase Storage)
    const isExternal = src.startsWith("http");
    const fetchUrl = isExternal
      ? `/api/proxy-image?url=${encodeURIComponent(src)}`
      : src;

    const res = await fetch(fetchUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function downloadPDF(): Promise<void> {
    const element = document.getElementById("cardapio-pdf");
    if (!element) {
      addAlert("Erro ao localizar o cardápio. Recarregue a página.");
      return;
    }
    setDownloading(true);

    // Converte todas as imagens para base64 para evitar CORS no canvas
    const imgs = Array.from(element.querySelectorAll("img")) as HTMLImageElement[];
    const originalSrcs = imgs.map((img) => img.src);

    await Promise.all(
      imgs.map(async (img, i) => {
        try {
          img.src = await fetchBase64(originalSrcs[i]);
        } catch {
          // mantém src original se falhar — imagem pode não aparecer mas não quebra
        }
      })
    );

    // Pequena pausa para garantir que as imagens foram renderizadas
    await new Promise((r) => setTimeout(r, 400));

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = (await import("html2pdf.js" as any)).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: "cardapio-carcassonne.pdf",
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#121111",
            logging: false,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(element)
        .save();
    } catch (err) {
      console.error(err);
      addAlert("Erro ao gerar PDF. Tente o botão de impressão como alternativa.");
    } finally {
      // Restaura os srcs originais
      imgs.forEach((img, i) => { img.src = originalSrcs[i]; });
      setDownloading(false);
    }
  }

  const itemCount = menuItems.filter((i) => i.isVisible).length;

  return (
    <div className="flex flex-col items-center bg-primary-black text-primary-gold">
      {loading && <LoaderFullscreen />}

      {/* ── CONTROLES (escondidos na impressão) ── */}
      <div className={`${isPrinting ? "hidden" : "flex"} flex-col items-center w-full max-w-[900px] px-6 py-6 gap-4 print:hidden`}>

        {/* Header */}
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all text-sm cursor-pointer"
              >
                <FiSkipBack size={14} /> Voltar
              </button>
              <LuFileText size={20} className="text-primary-gold/70" />
              <h1 className="text-lg sm:text-xl font-semibold text-primary-gold">
                Visualizador de Cardápio PDF
              </h1>
              <span className="text-xs text-primary-gold/35">
                ({itemCount} itens visíveis)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-gold/40 hover:border-primary-gold/70 bg-primary-gold/10 hover:bg-primary-gold/15 text-primary-gold text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                {downloading ? <Loader /> : <LuDownload size={15} />}
                {downloading ? "Gerando..." : "Baixar PDF"}
              </button>
              <button
                onClick={printPDF}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/40 text-primary-gold/60 hover:text-primary-gold text-sm transition-all cursor-pointer"
                title="Imprimir / Ctrl+P"
              >
                <LuPrinter size={15} />
              </button>
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
        </div>

        {/* Print instructions */}
        <div className="w-full bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
            Como gerar o PDF
          </span>
          <div className="flex flex-col gap-4">
            {/* Opção 1 — Download direto */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-gold/15 border border-primary-gold/30 text-[10px] font-bold text-primary-gold flex items-center justify-center shrink-0">1</span>
                <span className="text-sm font-medium text-primary-gold/80">Download direto (recomendado)</span>
              </div>
              <p className="text-xs text-primary-gold/55 ml-7 leading-relaxed">
                Clique em <strong className="text-primary-gold/80">Baixar PDF</strong> — o arquivo é gerado e baixado automaticamente, sem diálogos.
              </p>
            </div>
            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-primary-gold/10" />
              <span className="text-[10px] text-primary-gold/25">ou</span>
              <div className="flex-1 h-px bg-primary-gold/10" />
            </div>
            {/* Opção 2 — Imprimir */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-gold/15 border border-primary-gold/30 text-[10px] font-bold text-primary-gold flex items-center justify-center shrink-0">2</span>
                <span className="text-sm font-medium text-primary-gold/80">Via impressão <kbd className="bg-primary-black/60 border border-primary-gold/20 rounded px-1.5 py-0.5 text-[10px]">Ctrl+P</kbd></span>
              </div>
              <ul className="text-xs text-primary-gold/55 ml-7 flex flex-col gap-1 leading-relaxed">
                <li>• Destino: <strong className="text-primary-gold/75">Salvar como PDF</strong></li>
                <li>• Marcar: <strong className="text-primary-gold/75">Gráficos de plano de fundo</strong></li>
                <li>• Papel: <strong className="text-primary-gold/75">A4</strong> · Margens: <strong className="text-primary-gold/75">Nenhuma</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview label */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-primary-gold/10" />
          <span className="text-[10px] uppercase tracking-widest text-primary-gold/30">
            Pré-visualização
          </span>
          <div className="flex-1 h-px bg-primary-gold/10" />
        </div>
      </div>

      {/* ── CARDÁPIO PDF ── */}
      <div className={`${isPrinting ? "" : "shadow-2xl border border-primary-gold/10 mb-10"}`}>
        <MenuPDF
          items={menuItems}
          combos={combos}
          infos={infos}
          descriptions={descriptions}
          typesOrder={typesOrder}
        />
      </div>
    </div>
  );
}
