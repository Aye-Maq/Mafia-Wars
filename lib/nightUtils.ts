import { supabase } from "@/lib/supabase";

type NightActionType =
  | "mafia_vote"
  | "doctor_save"
  | "detective_investigate";

type NightActionRow = {
  target_id: string;
};

export async function submitNightAction(
  roomCode: string,
  playerId: string,
  actionType: NightActionType,
  targetId: string,
  round: number
): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { error } = await supabase.from("night_actions").insert({
    room_code: normalizedRoomCode,
    player_id: playerId,
    action_type: actionType,
    target_id: targetId,
    round,
  });

  if (error) {
    throw new Error(`Failed to submit the night action: ${error.message}`);
  }
}

export async function getMafiaVotes(
  roomCode: string,
  round: number
): Promise<{ targetId: string; count: number }[]> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("night_actions")
    .select("target_id")
    .eq("room_code", normalizedRoomCode)
    .eq("round", round)
    .eq("action_type", "mafia_vote");

  if (error) {
    throw new Error(`Failed to load mafia votes: ${error.message}`);
  }

  const voteCounts = new Map<string, number>();

  (data as NightActionRow[] | null)?.forEach((vote) => {
    voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) ?? 0) + 1);
  });

  return Array.from(voteCounts, ([targetId, count]) => ({ targetId, count }))
    .sort((leftVote, rightVote) => rightVote.count - leftVote.count);
}

export async function checkAllNightActionsSubmitted(
  roomCode: string,
  round: number
): Promise<boolean> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("night_actions")
    .select("action_type")
    .eq("room_code", normalizedRoomCode)
    .eq("round", round);

  if (error) {
    throw new Error(`Failed to check night actions: ${error.message}`);
  }

  const submittedActionTypes = new Set(
    (data ?? []).map((action) => action.action_type as NightActionType)
  );

  return (
    submittedActionTypes.has("mafia_vote") &&
    submittedActionTypes.has("doctor_save") &&
    submittedActionTypes.has("detective_investigate")
  );
}

async function getSingleNightTarget(
  roomCode: string,
  round: number,
  actionType: "doctor_save" | "detective_investigate"
): Promise<string | null> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("night_actions")
    .select("target_id")
    .eq("room_code", normalizedRoomCode)
    .eq("round", round)
    .eq("action_type", actionType);

  if (error) {
    throw new Error(`Failed to load ${actionType}: ${error.message}`);
  }

  const firstAction = (data as NightActionRow[] | null)?.[0];

  return firstAction?.target_id ?? null;
}

export async function getDetectiveResult(
  roomCode: string,
  round: number
): Promise<"correct" | "incorrect" | null> {
  const targetId = await getSingleNightTarget(
    roomCode,
    round,
    "detective_investigate"
  );

  if (!targetId) {
    return null;
  }

  const { data: player, error } = await supabase
    .from("players")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load detective result: ${error.message}`);
  }

  return player?.role === "mafia" ? "correct" : "incorrect";
}

export async function resolveNight(
  roomCode: string,
  round: number
): Promise<{ killedPlayerId: string | null; savedPlayerId: string | null }> {
  const mafiaVotes = await getMafiaVotes(roomCode, round);
  const savedPlayerId = await getSingleNightTarget(
    roomCode,
    round,
    "doctor_save"
  );

  if (mafiaVotes.length === 0) {
    return {
      killedPlayerId: null,
      savedPlayerId,
    };
  }

  const highestVoteCount = mafiaVotes[0].count;
  const tiedTargets = mafiaVotes.filter(
    (vote) => vote.count === highestVoteCount
  );
  const selectedTarget =
    tiedTargets[Math.floor(Math.random() * tiedTargets.length)]?.targetId ?? null;

  if (!selectedTarget) {
    return {
      killedPlayerId: null,
      savedPlayerId,
    };
  }

  return {
    killedPlayerId: savedPlayerId === selectedTarget ? null : selectedTarget,
    savedPlayerId,
  };
}
