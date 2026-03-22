import type { Player } from "@/lib/types";

export function getMafiaCount(totalPlayers: number): number {
  return Math.max(1, Math.min(Math.floor(totalPlayers / 5), 4));
}

function shufflePlayers(players: Player[]): Player[] {
  const shuffledPlayers = [...players];

  for (let index = shuffledPlayers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentPlayer = shuffledPlayers[index];

    shuffledPlayers[index] = shuffledPlayers[swapIndex];
    shuffledPlayers[swapIndex] = currentPlayer;
  }

  return shuffledPlayers;
}

export function assignRoles(players: Player[]): Record<string, string> {
  const shuffledPlayers = shufflePlayers(players);
  const roleAssignments: Record<string, string> = {};
  const mafiaCount = getMafiaCount(shuffledPlayers.length);

  shuffledPlayers.forEach((player, index) => {
    if (index < mafiaCount) {
      roleAssignments[player.id] = "mafia";
      return;
    }

    if (index === mafiaCount) {
      roleAssignments[player.id] = "doctor";
      return;
    }

    if (index === mafiaCount + 1) {
      roleAssignments[player.id] = "detective";
      return;
    }

    roleAssignments[player.id] = "civilian";
  });

  return roleAssignments;
}

export function checkWinCondition(
  players: Player[]
): "mafia" | "civilians" | null {
  const livingPlayers = players.filter((player) => player.is_alive);
  const livingMafiaCount = livingPlayers.filter(
    (player) => player.role === "mafia"
  ).length;
  const livingNonMafiaCount = livingPlayers.length - livingMafiaCount;

  if (livingMafiaCount === 0) {
    return "civilians";
  }

  if (livingMafiaCount >= livingNonMafiaCount) {
    return "mafia";
  }

  return null;
}
