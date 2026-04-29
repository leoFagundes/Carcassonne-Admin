"use client";

import Loader from "@/components/loader";
import LinksRepository from "@/services/repositories/LinksRepository";
import { LinkType } from "@/types";
import { getLucideIcon } from "@/utils/utilFunctions";
import { useEffect, useMemo, useState } from "react";

// const LINKS: LinkItem[] = [
//   {
//     id: "1",
//     name: "Instagram",
//     url: "https://instagram.com/carcassonnepub",
//     icon: "instagram",
//     description: "Fotos, eventos e novidades",
//   },
//   {
//     id: "2",
//     name: "WhatsApp",
//     url: "https://wa.me/5500000000000",
//     icon: "message-circle",
//     description: "Fale conosco diretamente",
//   },
//   {
//     id: "3",
//     name: "Cardápio",
//     url: "https://carcassonnepub.com/cardapio",
//     icon: "book-open",
//     description: "Drinks, petiscos e combos",
//   },
//   {
//     id: "4",
//     name: "Reserve uma Mesa",
//     url: "https://carcassonnepub.com/reservas",
//     icon: "calendar",
//     description: "Garanta seu lugar na partida",
//   },
//   {
//     id: "5",
//     name: "Ludoteca — Catálogo de Jogos",
//     url: "https://carcassonnepub.com/jogos",
//     icon: "dice-5",
//     description: "+200 jogos disponíveis",
//   },
//   {
//     id: "6",
//     name: "Eventos & Torneios",
//     url: "https://carcassonnepub.com/eventos",
//     icon: "trophy",
//     description: "Campeonatos e noites temáticas",
//   },
// ];

// Minimal SVG icons map
// const ICONS: Record<string, React.FC<{ size?: number }>> = {
//   instagram: ({ size = 20 }) => (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
//       <circle cx="12" cy="12" r="4" />
//       <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
//     </svg>
//   ),
//   "message-circle": ({ size = 20 }) => (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
//     </svg>
//   ),
//   "book-open": ({ size = 20 }) => (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
//       <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
//     </svg>
//   ),
//   calendar: ({ size = 20 }) => (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
//       <line x1="16" y1="2" x2="16" y2="6" />
//       <line x1="8" y1="2" x2="8" y2="6" />
//       <line x1="3" y1="10" x2="21" y2="10" />
//     </svg>
//   ),
//   "dice-5": ({ size = 20 }) => (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <rect x="2" y="2" width="20" height="20" rx="3" ry="3" />
//       <circle cx="7" cy="7" r="1" fill="currentColor" />
//       <circle cx="17" cy="7" r="1" fill="currentColor" />
//       <circle cx="12" cy="12" r="1" fill="currentColor" />
//       <circle cx="7" cy="17" r="1" fill="currentColor" />
//       <circle cx="17" cy="17" r="1" fill="currentColor" />
//     </svg>
//   ),
//   trophy: ({ size = 20 }) => (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
//       <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
//       <path d="M4 22h16" />
//       <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
//       <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
//       <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
//     </svg>
//   ),
// };

function LinkCard({ link, index }: { link: LinkType; index: number }) {
  const [hovered, setHovered] = useState(false);
  //   const Icon = ICONS[link.icon] ?? ICONS["dice-5"];
  const Icon = getLucideIcon(link.icon);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        animationDelay: `${index * 80}ms`,
      }}
      className="group relative flex items-center gap-4 w-full px-5 py-4 rounded-xl border border-primary-gold/20 bg-secondary-black/60 backdrop-blur-sm transition-all duration-300 hover:border-primary-gold/70 hover:bg-secondary-black hover:shadow-[0_0_24px_rgba(230,197,107,0.12)] animate-fade-in-up"
    >
      {/* Left glow line */}
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[2px] rounded-full transition-all duration-300"
        style={{
          background: hovered
            ? "linear-gradient(to bottom, #e6c56b, #d4af37)"
            : "transparent",
        }}
      />

      {/* Icon */}
      {Icon && (
        <span className="flex items-center justify-center w-10 h-10 rounded-lg border border-primary-gold/20 bg-primary-black/50 text-primary-gold/60 group-hover:text-primary-gold group-hover:border-primary-gold/50 transition-all duration-300 shrink-0">
          <Icon size={18} />
        </span>
      )}

      {/* Text */}
      <span className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-primary-white text-sm font-medium tracking-wide group-hover:text-primary-gold transition-colors duration-200">
          {link.name}
        </span>
        {link.description && (
          <span className="text-primary-white/35 text-xs truncate group-hover:text-primary-white/55 transition-colors duration-200">
            {link.description}
          </span>
        )}
      </span>

      {/* Arrow */}
      <span className="text-primary-gold/30 group-hover:text-primary-gold/80 transition-all duration-300 group-hover:translate-x-0.5 shrink-0">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
    </a>
  );
}

export default function LinktreePage() {
  const [mounted, setMounted] = useState(false);
  const [links, setLinks] = useState<LinkType[]>([]);

  const fetchLinks = async () => {
    try {
      const fetchedLinks = await LinksRepository.getAll();
      setLinks(fetchedLinks);
      setMounted(true);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const sortedLinks = useMemo(() => {
    return [...links].sort((a, b) => {
      return (a.order ?? 9999) - (b.order ?? 9999);
    });
  }, [links]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Raleway:wght@300;400;500&display=swap');

        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-raleway { font-family: 'Raleway', sans-serif; }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease both;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease both;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .text-gradient-gold {
          background: linear-gradient(135deg, #e6c56b 0%, #f5e09a 40%, #d4af37 70%, #e6c56b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        /* Hex grid texture */
        .hex-bg {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.04' stroke-width='1'/%3E%3C/svg%3E");
        }

        .crown-glow {
          filter: drop-shadow(0 0 12px rgba(230, 197, 107, 0.5));
        }
      `}</style>

      <main className="relative min-h-screen bg-primary-black font-raleway overflow-hidden flex items-center justify-center py-16 px-4">
        {/* Hex texture overlay */}
        <div className="hex-bg absolute inset-0 pointer-events-none" />

        {/* Radial gold glow center */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Bottom vignette */}
        <div
          className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(10,10,10,0.9), transparent)",
          }}
        />

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
          {/* Logo / Avatar */}
          <div
            className="animate-fade-in flex flex-col items-center gap-4"
            style={{ animationDelay: "0ms" }}
          >
            <div className="animate-float relative">
              {/* Outer ring */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #e6c56b 0%, #d4af37 50%, #8B6914 100%)",
                  padding: "2px",
                }}
              >
                <div className="w-full h-full rounded-full bg-primary-black flex items-center justify-center overflow-hidden">
                  {/* Crown SVG as logo */}
                  <img src={"images/logo-gold-2.png"} alt="logo" />
                </div>
              </div>

              {/* Glow pulse */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  boxShadow: "0 0 32px rgba(230, 197, 107, 0.2)",
                }}
              />
            </div>

            {/* Name */}
            <div className="text-center">
              <h1 className="font-cinzel text-2xl font-semibold text-gradient-gold tracking-widest uppercase">
                Carcassonne
              </h1>
              <p className="font-cinzel text-xs tracking-[0.4em] uppercase text-primary-gold/50 mt-0.5">
                Pub & Luderia
              </p>
            </div>

            {/* Tagline */}
            <p className="text-primary-white/40 text-xs text-center tracking-wide max-w-[220px] leading-relaxed">
              Coma, jogue, repita
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 w-48">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/30" />
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="text-primary-gold/50"
              >
                <polygon
                  points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
                  fill="currentColor"
                />
              </svg>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/30" />
            </div>
          </div>

          {/* Links */}
          {/* <div className="flex flex-col gap-3 w-full">
            {mounted &&
              LINKS.map((link, i) => (
                <LinkCard key={link.id} link={link} index={i} />
              ))}
          </div> */}

          <div className="flex flex-col items-center gap-3 w-full">
            {mounted ? (
              sortedLinks.map((link, i) => (
                <LinkCard key={link.id} link={link} index={i} />
              ))
            ) : (
              <Loader />
            )}
          </div>

          {/* Footer */}
          <p
            className="text-primary-white/20 text-[10px] tracking-widest uppercase animate-fade-in"
            style={{ animationDelay: "600ms" }}
          >
            © Carcassonne Pub
          </p>
        </div>
      </main>
    </>
  );
}
