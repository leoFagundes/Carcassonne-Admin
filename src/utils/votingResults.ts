export type RankedGroup = {
  rank: number; // 1-based, "denso": cada grupo (por maior que seja) ocupa 1 posição
  entryIds: string[]; // mais de um id = empate nessa posição
  votes: number;
};

/**
 * Agrupa as fantasias por posição, juntando quem empatou na mesma posição
 * (ex: 2 fantasias com 10 votos dividem o 1º lugar, a próxima com 8 votos
 * fica em 2º). Se `championId` for informado e estiver dentro do grupo
 * empatado do topo, esse grupo é separado: o campeão sozinho fica em 1º e o
 * restante do empate passa a ocupar a posição seguinte.
 */
export function computeRankedGroups(
  entries: { id: string }[],
  voteCountByEntry: Record<string, number>,
  championId?: string
): RankedGroup[] {
  const sorted = [...entries].sort(
    (a, b) => (voteCountByEntry[b.id] ?? 0) - (voteCountByEntry[a.id] ?? 0)
  );

  const rawGroups: { entryIds: string[]; votes: number }[] = [];
  let i = 0;
  while (i < sorted.length) {
    const votes = voteCountByEntry[sorted[i].id] ?? 0;
    const groupEntryIds: string[] = [];
    while (i < sorted.length && (voteCountByEntry[sorted[i].id] ?? 0) === votes) {
      groupEntryIds.push(sorted[i].id);
      i++;
    }
    rawGroups.push({ entryIds: groupEntryIds, votes });
  }

  if (
    championId &&
    rawGroups.length > 0 &&
    rawGroups[0].entryIds.length > 1 &&
    rawGroups[0].entryIds.includes(championId)
  ) {
    const first = rawGroups[0];
    const remainingTied = first.entryIds.filter((id) => id !== championId);
    // Substitui o grupo empatado do topo por dois: o campeão sozinho (1º) e
    // o resto do empate (que passa a ocupar a posição seguinte).
    rawGroups.splice(
      0,
      1,
      { entryIds: [championId], votes: first.votes },
      { entryIds: remainingTied, votes: first.votes }
    );
  }

  return rawGroups.map((g, index) => ({
    rank: index + 1,
    entryIds: g.entryIds,
    votes: g.votes,
  }));
}

/** Ids empatados no topo (2+ com o maior nº de votos), ignorando o campeão já escolhido. */
export function getTopTiedEntryIds(
  entries: { id: string }[],
  voteCountByEntry: Record<string, number>
): string[] {
  if (entries.length === 0) return [];
  const topVotes = Math.max(...entries.map((e) => voteCountByEntry[e.id] ?? 0));
  if (topVotes === 0) return [];
  const tied = entries.filter((e) => (voteCountByEntry[e.id] ?? 0) === topVotes);
  return tied.length > 1 ? tied.map((e) => e.id) : [];
}
