"use client";

import { useRouter } from "next/navigation";
import { FiSkipBack } from "react-icons/fi";

export default function NotFound() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }

        @keyframes shimmer-gold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shimmer-gold {
          background: linear-gradient(135deg, #e6c56b 0%, #f5e09a 40%, #d4af37 70%, #e6c56b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-gold 4s linear infinite;
        }
        .hex-bg-404 {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .float { animation: float 4s ease-in-out infinite; }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fade-in-up 0.6s ease both; }
      `}</style>

      <div className="relative flex flex-col items-center justify-center min-h-screen text-primary-gold px-6 text-center">
        {/* Background */}
        <div className="hex-bg-404 fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-all duration-200 backdrop-blur-sm bg-primary-black/30"
        >
          <FiSkipBack size={15} />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm fade-in-up">
          {/* 404 number */}
          <span
            className="font-cinzel font-bold text-shimmer-gold float select-none"
            style={{ fontSize: "clamp(5rem, 20vw, 8rem)", lineHeight: 1 }}
          >
            404
          </span>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
            <svg width="8" height="8" viewBox="0 0 10 10" className="text-primary-gold/50 shrink-0">
              <polygon points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5" fill="currentColor" />
            </svg>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
          </div>

          {/* Title */}
          <h1 className="font-cinzel text-xl sm:text-2xl font-semibold tracking-wide text-primary-gold/90">
            Casa Não Encontrada
          </h1>

          {/* Message */}
          <p className="text-sm sm:text-base text-primary-gold/60 leading-relaxed">
            Parece que você se aventurou além do tabuleiro. Essa página não existe — ou foi removida do mapa.
            <br /><br />
            Volte ao abrigo antes que a próxima peça seja jogada.
          </p>

          {/* CTA */}
          <button
            onClick={() => router.push("/")}
            className="mt-2 px-6 py-2.5 rounded-xl border border-primary-gold/30 hover:border-primary-gold/70 bg-primary-gold/5 hover:bg-primary-gold/10 text-primary-gold/80 hover:text-primary-gold text-sm font-medium transition-all duration-200"
          >
            Voltar ao início
          </button>

          <p className="text-xs text-primary-gold/25 tracking-widest uppercase">
            Carcassonne Pub
          </p>
        </div>
      </div>
    </>
  );
}
