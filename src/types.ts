export interface BoardgameType {
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  image: string;
  type: string;
}
