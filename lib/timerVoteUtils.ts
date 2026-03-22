import { supabase } from "@/lib/supabase";

export async function submitSkipVote(
  roomCode: string,
  playerId: string,
  phase: string,
  round: number
): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data: existingVote, error: existingVoteError } = await supabase
    .from("timer_votes")
    .select("id")
    .eq("room_code", normalizedRoomCode)
    .eq("player_id", playerId)
    .eq("phase", phase)
    .eq("vote_type", "skip")
    .eq("round", round)
    .maybeSingle();

  if (existingVoteError) {
    throw new Error(
      `Could not check existing skip votes: ${existingVoteError.message}`
    );
  }

  if (existingVote) {
    throw new Error("You have already voted to skip.");
  }

  const { error } = await supabase.from("timer_votes").insert({
    room_code: normalizedRoomCode,
    player_id: playerId,
    phase,
    vote_type: "skip",
    round,
  });

  if (error) {
    throw new Error(`Failed to submit the skip vote: ${error.message}`);
  }
}

export async function submitExtendVote(
  roomCode: string,
  playerId: string,
  phase: string,
  round: number
): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { error } = await supabase.from("timer_votes").insert({
    room_code: normalizedRoomCode,
    player_id: playerId,
    phase,
    vote_type: "extend",
    round,
  });

  if (error) {
    throw new Error(`Failed to submit the extend vote: ${error.message}`);
  }
}

export async function getTimerVoteCounts(
  roomCode: string,
  phase: string,
  round: number
): Promise<{ skip: number; extend: number }> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("timer_votes")
    .select("vote_type")
    .eq("room_code", normalizedRoomCode)
    .eq("phase", phase)
    .eq("round", round);

  if (error) {
    throw new Error(`Failed to load timer votes: ${error.message}`);
  }

  return (data ?? []).reduce(
    (counts, vote) => {
      if (vote.vote_type === "skip") {
        counts.skip += 1;
      }

      if (vote.vote_type === "extend") {
        counts.extend += 1;
      }

      return counts;
    },
    { skip: 0, extend: 0 }
  );
}

export async function hasPlayerSkipped(
  roomCode: string,
  playerId: string,
  phase: string,
  round: number
): Promise<boolean> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("timer_votes")
    .select("id")
    .eq("room_code", normalizedRoomCode)
    .eq("player_id", playerId)
    .eq("phase", phase)
    .eq("vote_type", "skip")
    .eq("round", round)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load player timer votes: ${error.message}`);
  }

  return Boolean(data);
}
