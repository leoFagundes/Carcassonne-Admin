"use client";

import { useCallback, useEffect, useState } from "react";
import SnakeScoreRepository from "@/services/repositories/SnakeScoreRepository";
import { SnakeScoreType } from "@/types";

const LEADERBOARD_SIZE = 10;

type LeaderboardEntry = SnakeScoreType & { id: string };

interface UseSnakeLeaderboardResult {
  leaderboard: LeaderboardEntry[];
  topScore: number;
  loading: boolean;
  isNewRecord: (score: number) => boolean;
  submitScore: (name: string, score: number) => Promise<boolean>;
}

/**
 * Placar global do Snake — só ganha uma entrada nova quando alguém supera o
 * recorde atual (não é "top 10 de qualquer partida", é o histórico de quem
 * já foi #1 em algum momento).
 */
export function useSnakeLeaderboard(): UseSnakeLeaderboardResult {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    SnakeScoreRepository.getTopScores(LEADERBOARD_SIZE)
      .then(setLeaderboard)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const topScore = leaderboard[0]?.score ?? 0;

  const isNewRecord = useCallback(
    (score: number) => score > 0 && score > topScore,
    [topScore],
  );

  const submitScore = useCallback(
    async (name: string, score: number) => {
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed || score <= 0) return false;
      const ok = await SnakeScoreRepository.create({ name: trimmed, score });
      if (ok) refresh();
      return ok;
    },
    [refresh],
  );

  return { leaderboard, topScore, loading, isNewRecord, submitScore };
}
