"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { motion } from "framer-motion";
import { FaWhatsapp, FaSmokingBan } from "react-icons/fa";
import {
  FiClipboard,
  FiFacebook,
  FiInstagram,
  FiMapPin,
  FiArrowLeft,
  FiAlertTriangle,
  FiCreditCard,
} from "react-icons/fi";

const STAR = (
  <svg
    width="7"
    height="7"
    viewBox="0 0 10 10"
    className="text-primary-gold/50 shrink-0"
  >
    <polygon
      points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
      fill="currentColor"
    />
  </svg>
);

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <h2 className="font-cinzel text-xl sm:text-2xl text-center text-shimmer-gold tracking-widest uppercase">
        {children}
      </h2>
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
        {STAR}
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
      </div>
    </div>
  );
}

export default function RulesPage() {
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
        .hex-bg-rules {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
        .contact-link {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(230,197,107,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          transition: all 0.2s;
          background: rgba(26,26,26,0.4);
        }
        .contact-link:hover {
          border-color: rgba(230,197,107,0.55);
          background: rgba(26,26,26,0.7);
        }
      `}</style>

      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="relative min-h-screen text-primary-gold flex flex-col items-center px-4 sm:px-8 pb-14 pt-6 gap-10"
      >
        {/* Background */}
        <div className="hex-bg-rules fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Back button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ x: -3 }}
          onClick={() => router.back()}
          className="self-start relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-colors duration-200 backdrop-blur-sm bg-primary-black/30"
        >
          <FiArrowLeft size={15} />
          <span className="text-sm font-medium">Voltar</span>
        </motion.button>

        {/* Contact section */}
        <motion.div
          variants={containerVariants}
          className="relative z-10 flex flex-col items-center gap-5 w-full max-w-md"
        >
          <motion.div variants={itemVariants} className="w-full">
            <SectionTitle>Contato</SectionTitle>
          </motion.div>

          <div className="flex flex-col gap-2.5 w-full">
            <motion.a
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="https://wa.me/5561999684186"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <FaWhatsapp size={16} className="text-primary-gold/70 shrink-0" />
              <span>(61) 99968-4186</span>
            </motion.a>
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/reserve")}
              className="contact-link w-full text-left"
            >
              <FiClipboard
                size={16}
                className="text-primary-gold/70 shrink-0"
              />
              <span>Faça sua reserva</span>
            </motion.button>
            <motion.a
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="https://www.facebook.com/CARCASSONNEPUB"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <FiFacebook size={16} className="text-primary-gold/70 shrink-0" />
              <span>/CARCASSONNEPUB</span>
            </motion.a>
            <motion.a
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="https://www.instagram.com/CARCASSONNEPUB"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <FiInstagram
                size={16}
                className="text-primary-gold/70 shrink-0"
              />
              <span>@CARCASSONNEPUB</span>
            </motion.a>
            <motion.a
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="https://www.google.com/maps/place/CLN+407+Bloco+E+-+Loja+37+-+Asa+Norte,+Brasília+-+DF"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <FiMapPin size={16} className="text-primary-gold/70 shrink-0" />
              <span>CLN 407 BLOCO E LOJA 37 — ASA NORTE</span>
            </motion.a>
          </div>
        </motion.div>

        {/* Legal section */}
        <motion.div
          variants={containerVariants}
          className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl"
        >
          <motion.div variants={itemVariants} className="w-full">
            <SectionTitle>Avisos Legais & Políticas</SectionTitle>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-primary-gold/35"
            >
              <div className="flex items-center gap-2">
                <FaSmokingBan size={14} className="text-primary-gold/50 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">
                  Proibição
                </span>
              </div>
              <p className="text-sm text-primary-gold/80 leading-relaxed">
                É proibido o uso de cigarros, cigarrilhas, charutos, cachimbos
                ou qualquer outro produto fumígeno, derivado ou não do tabaco,
                em recinto coletivo fechado, privado ou público.
              </p>
              <span className="text-xs text-primary-gold/40 mt-auto">
                Lei 9.294/1996 Art. 2º
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-primary-gold/35"
            >
              <div className="flex items-center gap-2">
                <FiAlertTriangle size={14} className="text-primary-gold/50 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">
                  Menores de Idade
                </span>
              </div>
              <p className="text-sm text-primary-gold/80 leading-relaxed">
                É proibido vender, fornecer, servir, ministrar ou entregar,
                ainda que gratuitamente, de qualquer forma, a criança ou o
                adolescente, bebida alcoólica ou produtos que causem
                dependência.
              </p>
              <span className="text-xs text-primary-gold/40 mt-auto">
                Lei 8.069/1990, Art. 243
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-primary-gold/35"
            >
              <div className="flex items-center gap-2">
                <FiCreditCard size={14} className="text-primary-gold/50 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">
                  Pagamento
                </span>
              </div>
              <ul className="text-sm text-primary-gold/80 flex flex-col gap-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary-gold/50 shrink-0" />{" "}
                  Dinheiro
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary-gold/50 shrink-0" />{" "}
                  Cartões de crédito e débito
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary-gold/50 shrink-0" />{" "}
                  Mastercard, Visa, Elo
                </li>
              </ul>
              <p className="text-xs text-primary-gold/50 mt-auto">
                Não aceitamos cheque.
              </p>
            </motion.div>
          </div>

          {/* Extra notes */}
          <motion.div
            variants={itemVariants}
            className="w-full bg-primary-black/40 border border-primary-gold/10 rounded-xl p-4 flex flex-col gap-2"
          >
            {[
              "Cobramos taxa de rolha. Contate um de nossos atendentes.",
              "Proibido o consumo de produtos alimentícios não fornecidos pela casa.",
              "Os preços praticados são em Reais (BRL, R$).",
              "Se beber, não dirija. Disque Saúde: 136.",
            ].map((text, i) => (
              <p
                key={i}
                className="text-sm text-primary-gold/65 flex items-start gap-2 leading-relaxed"
              >
                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-gold/35 shrink-0" />
                {text}
              </p>
            ))}
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="text-xs text-primary-gold/35 tracking-widest uppercase"
          >
            PROCON 151
          </motion.p>
        </motion.div>
      </motion.div>
    </>
  );
}
