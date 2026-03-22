import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/constants";
import { assignRoles } from "@/lib/gameLogic";
import { supabase } from "@/lib/supabase";
import type { Phase, Player } from "@/lib/types";

export async function startGame(roomCode: string): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const updatedAt = new Date().toISOString();

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, room_code, name, role, is_alive, is_host")
    .eq("room_code", normalizedRoomCode);

  if (playersError) {
    throw new Error(`Failed to load players for this room: ${playersError.message}`);
  }

  const roomPlayers = (players ?? []) as Player[];

  if (roomPlayers.length < MIN_PLAYERS || roomPlayers.length > MAX_PLAYERS) {
    throw new Error(
      `This room needs between ${MIN_PLAYERS} and ${MAX_PLAYERS} players to start.`
    );
  }

  const roleAssignments = assignRoles(roomPlayers);

  for (const player of roomPlayers) {
    const role = roleAssignments[player.id];

    const { error: playerUpdateError } = await supabase
      .from("players")
      .update({ role })
      .eq("id", player.id);

    if (playerUpdateError) {
      throw new Error(
        `Failed to assign role for ${player.name}: ${playerUpdateError.message}`
      );
    }
  }

  const { error: gameStateError } = await supabase
    .from("game_state")
    .update({
      phase: "role-reveal",
      updated_at: updatedAt,
    })
    .eq("room_code", normalizedRoomCode);

  if (gameStateError) {
    throw new Error(
      `Roles were assigned, but updating the game phase failed: ${gameStateError.message}`
    );
  }

  const { error: roomStatusError } = await supabase
    .from("rooms")
    .update({ status: "playing" })
    .eq("room_code", normalizedRoomCode);

  if (roomStatusError) {
    throw new Error(
      `Roles were assigned and the phase changed, but updating the room status failed: ${roomStatusError.message}`
    );
  }
}

export async function updatePhase(roomCode: string, phase: Phase): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { error } = await supabase
    .from("game_state")
    .update({
      phase,
      updated_at: new Date().toISOString(),
    })
    .eq("room_code", normalizedRoomCode);

  if (error) {
    throw new Error(`Failed to update the game phase: ${error.message}`);
  }
}
