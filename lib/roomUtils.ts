import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";

const ROOM_CODE_WORDS = [
  "SHADOW",
  "RAVEN",
  "GHOST",
  "DAGGER",
  "VENOM",
  "HOLLOW",
  "CRIMSON",
  "SPECTRE",
] as const;

const ROOM_CODE_ATTEMPTS = 5;

export function generateRoomCode(): string {
  const word =
    ROOM_CODE_WORDS[Math.floor(Math.random() * ROOM_CODE_WORDS.length)];
  const number = Math.floor(1000 + Math.random() * 9000);

  return `${word}-${number}`;
}

export async function createRoom(
  hostName: string,
  timerConfig: number
): Promise<{ roomCode: string; playerId: string }> {
  const trimmedHostName = hostName.trim();

  if (!trimmedHostName) {
    throw new Error("Host name is required.");
  }

  for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = generateRoomCode();

    const { error: roomInsertError } = await supabase.from("rooms").insert({
      room_code: roomCode,
      host_id: "pending-host",
      status: "lobby",
      timer_config: timerConfig,
    });

    if (roomInsertError) {
      if (roomInsertError.code === "23505") {
        continue;
      }

      throw new Error(`Failed to create room: ${roomInsertError.message}`);
    }

    const { data: playerData, error: playerInsertError } = await supabase
      .from("players")
      .insert({
        room_code: roomCode,
        name: trimmedHostName,
        is_host: true,
      })
      .select("id")
      .single();

    if (playerInsertError || !playerData) {
      throw new Error(
        `Room was created, but adding the host failed: ${
          playerInsertError?.message ?? "Unknown error."
        }`
      );
    }

    const playerId = playerData.id as string;

    const { error: hostUpdateError } = await supabase
      .from("rooms")
      .update({ host_id: playerId })
      .eq("room_code", roomCode);

    if (hostUpdateError) {
      throw new Error(
        `Room and host were created, but linking the host failed: ${hostUpdateError.message}`
      );
    }

    const { error: gameStateInsertError } = await supabase
      .from("game_state")
      .insert({
        room_code: roomCode,
        phase: "lobby",
      });

    if (gameStateInsertError) {
      throw new Error(
        `Room and host were created, but initializing game state failed: ${gameStateInsertError.message}`
      );
    }

    return { roomCode, playerId };
  }

  throw new Error("Could not generate a unique room code after 5 attempts.");
}

export async function joinRoom(
  roomCode: string,
  playerName: string
): Promise<{ playerId: string } | { error: string }> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const trimmedPlayerName = playerName.trim();

  if (!normalizedRoomCode) {
    return { error: "Room code is required." };
  }

  if (!trimmedPlayerName) {
    return { error: "Player name is required." };
  }

  const { data: room, error: roomFetchError } = await supabase
    .from("rooms")
    .select("room_code, status")
    .eq("room_code", normalizedRoomCode)
    .maybeSingle();

  if (roomFetchError) {
    return { error: "Could not check that room. Please try again." };
  }

  if (!room) {
    return { error: "Room not found." };
  }

  if (room.status !== "lobby") {
    return { error: "This room has already started." };
  }

  const { data: playerData, error: playerInsertError } = await supabase
    .from("players")
    .insert({
      room_code: normalizedRoomCode,
      name: trimmedPlayerName,
      is_host: false,
    })
    .select("id")
    .single();

  if (playerInsertError || !playerData) {
    return { error: "Could not join the room. Please try again." };
  }

  return { playerId: playerData.id as string };
}

export async function getRoomPlayers(roomCode: string): Promise<Player[]> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("players")
    .select("id, room_code, name, role, is_alive, is_host")
    .eq("room_code", normalizedRoomCode)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load players: ${error.message}`);
  }

  return (data ?? []) as Player[];
}
