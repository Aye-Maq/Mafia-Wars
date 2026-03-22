"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import PhaseWatcher from "@/components/PhaseWatcher";
import VotingPanel from "@/components/vote/VotingPanel";
import {
  checkAndFinalizeWin,
  eliminatePlayer,
  startNextRound,
} from "@/lib/eliminationUtils";
import { supabase } from "@/lib/supabase";
import { getVoteCounts, resolveVote } from "@/lib/voteUtils";

type VotePageState = {
  roomCode: string;
  playerId: string;
  round: number;
  isAlive: boolean;
};

type VoteBreakdown = {
  targetId: string;
  targetName: string;
  count: number;
};

const VOTE_RESULT_DELAY_MS = 3000;

function VoteContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("roomCode") ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [voteState, setVoteState] = useState<VotePageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [voteBreakdown, setVoteBreakdown] = useState<VoteBreakdown[]>([]);
  const [hasResolvedVote, setHasResolvedVote] = useState(false);
  const hasAdvancedRef = useRef(false);

  useEffect(() => {
    async function loadVoteState() {
      if (!roomCode || !playerId) {
        setErrorMessage("Missing room or player information.");
        setIsLoading(false);
        return;
      }

      const [
        { data: player, error: playerError },
        { data: gameState, error: gameStateError },
      ] = await Promise.all([
        supabase
          .from("players")
          .select("is_alive")
          .eq("id", playerId)
          .eq("room_code", roomCode)
          .maybeSingle(),
        supabase
          .from("game_state")
          .select("round_number")
          .eq("room_code", roomCode)
          .maybeSingle(),
      ]);

      if (playerError) {
        setErrorMessage(`Could not load player data: ${playerError.message}`);
        setIsLoading(false);
        return;
      }

      if (gameStateError) {
        setErrorMessage(`Could not load vote state: ${gameStateError.message}`);
        setIsLoading(false);
        return;
      }

      if (!player || !gameState) {
        setErrorMessage("Could not find the voting data for this player.");
        setIsLoading(false);
        return;
      }

      setVoteState({
        roomCode,
        playerId,
        round: gameState.round_number as number,
        isAlive: Boolean(player.is_alive),
      });
      setIsLoading(false);
    }

    void loadVoteState();
  }, [playerId, roomCode]);

  async function handleVotingComplete() {
    if (!voteState || hasAdvancedRef.current) {
      return;
    }

    hasAdvancedRef.current = true;
    setErrorMessage("");

    try {
      const counts = await getVoteCounts(voteState.roomCode, voteState.round);
      setVoteBreakdown(counts);
      setHasResolvedVote(true);

      const voteResult = await resolveVote(voteState.roomCode, voteState.round);

      if (voteResult.isTie || !voteResult.eliminatedPlayerId) {
        setResultMessage("It's a tie. No one is eliminated.");
        await new Promise((resolve) => window.setTimeout(resolve, VOTE_RESULT_DELAY_MS));
        await startNextRound(voteState.roomCode, voteState.round);
        return;
      }

      const { data: eliminatedPlayer, error: eliminatedPlayerError } = await supabase
        .from("players")
        .select("name, role")
        .eq("id", voteResult.eliminatedPlayerId)
        .maybeSingle();

      if (eliminatedPlayerError || !eliminatedPlayer) {
        throw new Error(
          `Could not load eliminated player details: ${
            eliminatedPlayerError?.message ?? "Unknown error."
          }`
        );
      }

      await eliminatePlayer(voteResult.eliminatedPlayerId, voteState.roomCode);
      setResultMessage(
        `${eliminatedPlayer.name} was eliminated. They were ${eliminatedPlayer.role}.`
      );
      await new Promise((resolve) => window.setTimeout(resolve, VOTE_RESULT_DELAY_MS));

      const { winner } = await checkAndFinalizeWin(voteState.roomCode);

      if (!winner) {
        await startNextRound(voteState.roomCode, voteState.round);
      }
    } catch (error) {
      hasAdvancedRef.current = false;
      setErrorMessage(
        error instanceof Error ? error.message : "Could not resolve the vote."
      );
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Loading voting phase...</p>
      </main>
    );
  }

  if (errorMessage || !voteState) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-red-600">
          {errorMessage || "Could not load the voting phase."}
        </p>
      </main>
    );
  }

  return (
    <>
      <PhaseWatcher
        roomCode={voteState.roomCode}
        playerId={voteState.playerId}
        currentPhase="vote"
      />
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-2xl space-y-4">
          <VotingPanel
            roomCode={voteState.roomCode}
            playerId={voteState.playerId}
            round={voteState.round}
            isAlive={voteState.isAlive}
            onVotingComplete={() => {
              void handleVotingComplete();
            }}
          />
          {hasResolvedVote ? (
            <div className="space-y-2">
              <h2 className="text-center text-lg font-semibold">Vote Results</h2>
              {voteBreakdown.length === 0 ? (
                <p className="text-center">No votes were cast.</p>
              ) : (
                <ul className="space-y-1 text-center">
                  {voteBreakdown.map((voteCount) => (
                    <li key={voteCount.targetId}>
                      {voteCount.targetName}: {voteCount.count}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          {resultMessage ? <p className="text-center">{resultMessage}</p> : null}
        </section>
      </main>
    </>
  );
}

export default function VotePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <p>Loading voting phase...</p>
        </main>
      }
    >
      <VoteContent />
    </Suspense>
  );
}
