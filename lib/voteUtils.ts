import { supabase } from "@/lib/supabase";

export async function submitVote(
  roomCode: string,
  voterId: string,
  targetId: string,
  round: number
): Promise<void> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data: existingVote, error: existingVoteError } = await supabase
    .from("votes")
    .select("id")
    .eq("room_code", normalizedRoomCode)
    .eq("voter_id", voterId)
    .eq("round", round)
    .maybeSingle();

  if (existingVoteError) {
    throw new Error(`Could not check existing votes: ${existingVoteError.message}`);
  }

  if (existingVote) {
    throw new Error("You have already voted this round.");
  }

  const { error } = await supabase.from("votes").insert({
    room_code: normalizedRoomCode,
    voter_id: voterId,
    target_id: targetId,
    round,
  });

  if (error) {
    throw new Error(`Failed to submit the vote: ${error.message}`);
  }
}

export async function getVoteCounts(
  roomCode: string,
  round: number
): Promise<{ targetId: string; targetName: string; count: number }[]> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("target_id")
    .eq("room_code", normalizedRoomCode)
    .eq("round", round);

  if (votesError) {
    throw new Error(`Failed to load votes: ${votesError.message}`);
  }

  const targetIds = Array.from(
    new Set((votes ?? []).map((vote) => vote.target_id as string))
  );

  if (targetIds.length === 0) {
    return [];
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name")
    .eq("room_code", normalizedRoomCode)
    .in("id", targetIds);

  if (playersError) {
    throw new Error(`Failed to load vote targets: ${playersError.message}`);
  }

  const playerNames = new Map(
    (players ?? []).map((player) => [player.id as string, player.name as string])
  );
  const voteCounts = new Map<string, number>();

  (votes ?? []).forEach((vote) => {
    const targetId = vote.target_id as string;
    voteCounts.set(targetId, (voteCounts.get(targetId) ?? 0) + 1);
  });

  return Array.from(voteCounts, ([targetId, count]) => ({
    targetId,
    targetName: playerNames.get(targetId) ?? "Unknown Player",
    count,
  })).sort((leftVote, rightVote) => rightVote.count - leftVote.count);
}

export async function resolveVote(
  roomCode: string,
  round: number
): Promise<{ eliminatedPlayerId: string | null; isTie: boolean }> {
  const voteCounts = await getVoteCounts(roomCode, round);

  if (voteCounts.length === 0) {
    return { eliminatedPlayerId: null, isTie: true };
  }

  const topVote = voteCounts[0];
  const tiedTopVotes = voteCounts.filter(
    (voteCount) => voteCount.count === topVote.count
  );

  if (tiedTopVotes.length > 1) {
    return { eliminatedPlayerId: null, isTie: true };
  }

  return {
    eliminatedPlayerId: topVote.targetId,
    isTie: false,
  };
}
