"use client";

import { useCallback, useState } from "react";
import { LuGauge, LuTrophy, LuX } from "react-icons/lu";
import SnakeGame from "./SnakeGame";
import { speedMultiplierForScore, speedPercentForScore } from "./gameLogic";
import { useSnakeLeaderboard } from "./useSnakeLeaderboard";
import { useAlert } from "@/contexts/alertProvider";

export default function SnakePage() {
  const { addAlert } = useAlert();
  const [score, setScore] = useState(0);
  const [pendingRecordScore, setPendingRecordScore] = useState<number | null>(
    null,
  );
  const [nameInput, setNameInput] = useState("");
  const [submittingName, setSubmittingName] = useState(false);

  const { leaderboard, topScore, loading, isNewRecord, submitScore } =
    useSnakeLeaderboard();

  const speedMultiplier = speedMultiplierForScore(score);
  const speedPercent = speedPercentForScore(score);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      if (isNewRecord(finalScore)) {
        setPendingRecordScore(finalScore);
      }
    },
    [isNewRecord],
  );

  async function handleSubmitName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pendingRecordScore == null || submittingName) return;
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    setSubmittingName(true);
    try {
      const ok = await submitScore(trimmed, pendingRecordScore);
      if (ok) {
        addAlert(`Novo recorde salvo: ${pendingRecordScore} pontos!`);
        setPendingRecordScore(null);
        setNameInput("");
      } else {
        addAlert("Erro ao salvar sua pontuação.");
      }
    } finally {
      setSubmittingName(false);
    }
  }

  return (
    <section className="flex flex-col gap-6 w-full items-center text-primary-gold pb-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <img
          src="/images/mascote-feliz.png"
          alt="mascote feliz"
          className="w-[90px]"
        />
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-gold/50">
          Sessão secreta
        </span>
        <span className="text-2xl sm:text-3xl font-bold text-gradient-gold">
          Você encontrou o easter egg!
        </span>
        <p className="text-sm text-primary-gold/50 max-w-md">
          Já que chegou até aqui, que tal uma partida de Snake?
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-5 sm:gap-8 w-full px-4">
        <SnakeGame
          onScoreChange={setScore}
          onGameOver={handleGameOver}
          inputDisabled={pendingRecordScore != null}
        />

        <div className="flex flex-col gap-5 w-full max-w-xs text-center sm:max-w-none sm:w-64 sm:text-left">
          <div className="flex gap-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary-gold/40">
                Pontuação
              </p>
              <p className="text-2xl font-bold text-primary-gold">{score}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary-gold/40">
                Recorde
              </p>
              <p className="text-2xl font-bold text-secondary-gold">
                {Math.max(topScore, score)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary-gold/40 flex items-center gap-1">
                <LuGauge size={11} /> Velocidade
              </p>
              <span className="text-xs font-semibold text-primary-gold">
                {speedMultiplier.toFixed(2)}x
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-primary-black/60 border border-primary-gold/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-secondary-gold to-primary-gold transition-[width] duration-300"
                style={{ width: `${speedPercent}%` }}
              />
            </div>
          </div>

          {pendingRecordScore != null ? (
            <form
              onSubmit={handleSubmitName}
              className="flex flex-col gap-3 rounded-xl px-4 py-4 bg-primary-gold/10 border border-primary-gold/40"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-primary-gold">
                  <LuTrophy size={16} /> Novo recorde!
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingRecordScore(null);
                    setNameInput("");
                  }}
                  title="Não entrar no placar"
                  className="p-1 rounded-md text-primary-gold/40 hover:text-primary-gold transition-colors cursor-pointer"
                >
                  <LuX size={14} />
                </button>
              </div>
              <p className="text-xs text-primary-gold/60">
                {pendingRecordScore} pontos — digite seu nome pro placar.
              </p>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                placeholder="Seu nome"
                autoFocus
                className="w-full h-10 px-3 rounded-lg bg-primary-black/60 border border-primary-gold/25 text-sm text-primary-gold placeholder:text-primary-gold/30 outline-none focus:border-primary-gold/60 transition-colors"
              />
              <button
                type="submit"
                disabled={!nameInput.trim() || submittingName}
                className="w-full h-10 rounded-lg bg-primary-gold text-primary-black text-sm font-semibold disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {submittingName ? "Salvando..." : "Salvar no placar"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl px-3 py-3 bg-secondary-black/40 border border-primary-gold/15">
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-1.5 text-primary-gold/40">
                <LuTrophy size={11} /> Melhores
              </p>
              {loading ? (
                <p className="text-xs text-primary-gold/40 italic">
                  Carregando...
                </p>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-primary-gold/40 italic">
                  Ninguém bateu recorde ainda. Seja o primeiro!
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-xs text-primary-gold/70"
                    >
                      <span className="truncate">
                        {i + 1}. {entry.name}
                      </span>
                      <span className="shrink-0 ml-2 font-semibold text-primary-gold">
                        {entry.score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
