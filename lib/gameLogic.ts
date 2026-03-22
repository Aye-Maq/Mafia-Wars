export function getMafiaCount(totalPlayers: number): number {
  return Math.min(Math.floor(totalPlayers / 5), 4);
}

export function assignRoles(players: string[]): Record<string, string> {
  void players;

  // TODO: full role assignment logic coming in next step
  return {};
}

export function checkWinCondition(
  players: { role: string; is_alive: boolean }[]
): "mafia" | "civilians" | null {
  void players;

  // TODO: win condition logic coming in next step
  return null;
}
