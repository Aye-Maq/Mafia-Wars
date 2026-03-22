import { checkWinCondition } from "@/lib/gameLogic";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";

export async function eliminatePlayer(
  playerId: string,
  roomCode: string
): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { error } = await supabase
    .from("players")
    .update({ is_alive: false })
    .eq("id", playerId)
    .eq("room_code", normalizedRoomCode);

  if (error) {
    throw new Error(`Failed to eliminate the player: ${error.message}`);
  }
}

export async function checkAndFinalizeWin(
  roomCode: string
): Promise<{ winner: "mafia" | "civilians" | null }> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, room_code, name, role, is_alive, is_host")
    .eq("room_code", normalizedRoomCode);

  if (playersError) {
    throw new Error(`Failed to load players for win check: ${playersError.message}`);
  }

  const winner = checkWinCondition((players ?? []) as Player[]);

  if (!winner) {
    return { winner: null };
  }

  const updatedAt = new Date().toISOString();

  const { error: roomError } = await supabase
    .from("rooms")
    .update({ status: "finished" })
    .eq("room_code", normalizedRoomCode);

  if (roomError) {
    throw new Error(`Winner found, but room could not be finished: ${roomError.message}`);
  }

  const { error: gameStateError } = await supabase
    .from("game_state")
    .update({
      phase: "end",
      night_sub_phase: "none",
      updated_at: updatedAt,
    })
    .eq("room_code", normalizedRoomCode);

  if (gameStateError) {
    throw new Error(
      `Winner found, but game state could not move to end: ${gameStateError.message}`
    );
  }

  return { winner };
}

export async function startNextRound(
  roomCode: string,
  currentRound: number
): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { error } = await supabase
    .from("game_state")
    .update({
      round_number: currentRound + 1,
      phase: "night",
      night_sub_phase: "none",
      night_result: null,
      updated_at: new Date().toISOString(),
    })
    .eq("room_code", normalizedRoomCode);

  if (error) {
    throw new Error(`Failed to start the next round: ${error.message}`);
  }
}
