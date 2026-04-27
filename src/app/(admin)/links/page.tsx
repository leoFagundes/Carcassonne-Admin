"use client";

import LinksForms from "@/components/linksForms";
import LoaderFullscreen from "@/components/loaderFullscreen";
import Modal from "@/components/modal";
import Tooltip from "@/components/Tooltip";
import LinksRepository from "@/services/repositories/LinksRepository";
import { LinkType } from "@/types";
import { patternLink } from "@/utils/patternValues";
import { getLucideIcon } from "@/utils/utilFunctions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LuChevronDown,
  LuChevronUp,
  LuExternalLink,
  LuGitBranchPlus,
  LuLink,
  LuPencil,
  LuUnlink,
} from "react-icons/lu";

export default function LinksPage() {
  const [loading, setLoading] = useState(false);
  const [linkFormsModal, setlinkFormsModal] = useState(false);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [currentLink, setCurrentLink] = useState<LinkType>(patternLink);
  const [savingOrder, setSavingOrder] = useState(false);

  const router = useRouter();

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const fetchedLinks = await LinksRepository.getAll();
      // Sort by order field if available, fallback to original array order
      const sorted = [...fetchedLinks].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      setLinks(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const createlink = params.get("createlink");
    if (createlink === "true") {
      setlinkFormsModal(true);
    }
  }, []);

  // ── Move handlers ──────────────────────────────────────────────
  const moveLink = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const updated = [...links];
    [updated[index], updated[targetIndex]] = [
      updated[targetIndex],
      updated[index],
    ];
    setLinks(updated);

    setSavingOrder(true);
    try {
      const updates = updated.map((link, i) => ({ id: link.id!, order: i }));
      await LinksRepository.updateOrder(updates);
    } catch (error) {
      console.error("Erro ao salvar ordem:", error);
    } finally {
      setSavingOrder(false);
    }
  };

  // ── Empty state ────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-secondary-black border border-white/10">
        <LuUnlink size={34} className="text-white/20" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-white/60">
          Nenhum link cadastrado
        </p>
        <p className="text-sm text-white/30 max-w-[260px]">
          Adicione seu primeiro link clicando no botão{" "}
          <span className="text-primary-gold">+</span> acima.
        </p>
      </div>
      <button
        onClick={() => {
          setCurrentLink(patternLink);
          setlinkFormsModal(true);
        }}
        className="mt-1 px-5 py-2 rounded-lg bg-primary-gold/10 border border-primary-gold/30 text-primary-gold text-sm font-medium hover:bg-primary-gold/20 transition-all duration-200 cursor-pointer"
      >
        Criar primeiro link
      </button>
    </div>
  );

  return (
    <section className="flex flex-col gap-8 w-full h-full px-3 overflow-y-scroll">
      {loading && <LoaderFullscreen />}

      {/* Header */}
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuExternalLink size={"42px"} className="min-w-[48px]" />
        <h2 className="sm:text-5xl text-3xl text-primary-gold text-center">
          Gerenciamento de Links
        </h2>
        <Tooltip direction="bottom" content="Criar um novo Link">
          <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
            <LuGitBranchPlus
              onClick={() => {
                setCurrentLink(patternLink);
                setlinkFormsModal(true);
              }}
              size={"16px"}
              className="min-w-[16px]"
            />
          </div>
        </Tooltip>
        <Tooltip direction="bottom" content="Ir para visão do cliente">
          <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
            <LuLink
              onClick={() => router.push("/linktree")}
              size={"16px"}
              className="min-w-[16px]"
            />
          </div>
        </Tooltip>
      </section>

      {/* Saving order indicator */}
      {savingOrder && (
        <p className="text-center text-xs text-white/40 animate-pulse">
          Salvando nova ordem...
        </p>
      )}

      {/* Links list */}
      <section className="flex flex-col items-center gap-4">
        {links.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          links.map((link, index) => {
            const Icon = getLucideIcon(link.icon);

            return (
              <div
                key={link.id}
                className="w-full max-w-[400px] group relative flex items-center gap-4 p-4 rounded-xl bg-secondary-black border border-white/10 hover:border-primary-gold transition-all duration-200 shadow-card"
              >
                {/* Up / Down arrows */}
                <div className="flex flex-col gap-0.5">
                  <Tooltip content="Mover para cima">
                    <button
                      onClick={() => moveLink(index, "up")}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all duration-150"
                    >
                      <LuChevronUp size={15} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Mover para baixo">
                    <button
                      onClick={() => moveLink(index, "down")}
                      disabled={index === links.length - 1}
                      className="p-1 rounded hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all duration-150"
                    >
                      <LuChevronDown size={15} />
                    </button>
                  </Tooltip>
                </div>

                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/5">
                  {Icon ? (
                    <Icon size={22} className="text-primary-gold" />
                  ) : (
                    <LuExternalLink size={22} className="text-gray-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-sm font-semibold truncate">
                    {link.name}
                  </span>
                  <a
                    href={link.url}
                    target="_blank"
                    className="text-xs text-blue-400 truncate hover:underline"
                  >
                    {link.url}
                  </a>
                </div>

                {/* Edit button */}
                <Tooltip content="Editar">
                  <button
                    onClick={() => {
                      setCurrentLink(link);
                      setlinkFormsModal(true);
                    }}
                    className="transition-opacity p-2 rounded-md hover:bg-white/10 cursor-pointer"
                  >
                    <LuPencil size={16} />
                  </button>
                </Tooltip>
              </div>
            );
          })
        )}
      </section>

      <Modal isOpen={linkFormsModal} onClose={() => setlinkFormsModal(false)}>
        <LinksForms
          currentLink={currentLink}
          setCurrentLink={setCurrentLink}
          formType={currentLink.id ? "edit" : "add"}
          closeForms={() => {
            setCurrentLink(patternLink);
            setlinkFormsModal(false);
            fetchLinks();
          }}
        />
      </Modal>
    </section>
  );
}
