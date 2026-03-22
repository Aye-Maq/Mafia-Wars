"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import TimerControls from "@/components/TimerControls";
import { VOTING_TIMER } from "@/lib/constants";
import { getVoteCounts, submitVote } from "@/lib/voteUtils";
import { supabase } from "@/lib/supabase";

type VotingTarget = {
  id: string;
  name: string;
};

type VoteCount = {
  targetId: string;
  targetName: string;
  count: number;
};

type VotingPanelProps = {
  roomCode: string;
  playerId: string;
  round: number;
  isAlive: boolean;
  onVotingComplete: () => void;
};

export default function VotingPanel({
  roomCode,
  playerId,
  round,
  isAlive,
  onVotingComplete,
}: VotingPanelProps) {
  const [targets, setTargets] = useState<VotingTarget[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(VOTING_TIMER);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const hasCompletedRef = useRef(false);

  const completeVoting = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    onVotingComplete();
  }, [onVotingComplete]);

  useEffect(() => {
    let isMounted = true;

    async function loadVotingData() {
      const [{ data: players, error: playersError }, countsResult] =
        await Promise.all([
          supabase
            .from("players")
            .select("id, name")
            .eq("room_code", roomCode)
            .eq("is_alive", true),
          getVoteCounts(roomCode, round),
        ]);

      if (!isMounted) {
        return;
      }

      if (playersError) {
        setErrorMessage(`Could not load voting targets: ${playersError.message}`);
        setIsLoading(false);
        return;
      }

      setTargets((players ?? []) as VotingTarget[]);
      setVoteCounts(countsResult);
      setIsLoading(false);
    }

    async function refreshVoteCounts() {
      try {
        const counts = await getVoteCounts(roomCode, round);

        if (!isMounted) {
          return;
        }

        setVoteCounts(counts);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Could not refresh vote counts."
        );
      }
    }

    void loadVotingData();

    const channel = supabase
      .channel(`votes:${roomCode}:${round}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          void refreshVoteCounts();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [roomCode, round]);

  useEffect(() => {
      const interval = window.setInterval(() => {
      setSecondsRemaining((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(interval);
          completeVoting();

          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [completeVoting]);

  async function handleVote(targetId: string) {
    setErrorMessage("");

    try {
      await submitVote(roomCode, playerId, targetId, round);
      setHasVoted(true);
      const counts = await getVoteCounts(roomCode, round);
      setVoteCounts(counts);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not submit the vote."
      );
    }
  }

  const votesCast = voteCounts.reduce(
    (totalVotes, voteCount) => totalVotes + voteCount.count,
    0
  );
  const livingPlayerCount = targets.length;

  if (!isAlive) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Voting Phase</h1>
        <p>You have been eliminated. Watch the vote.</p>
        <p>
          {Math.floor(secondsRemaining / 60)}:
          {(secondsRemaining % 60).toString().padStart(2, "0")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Voting Phase</h1>
      <p>
        {Math.floor(secondsRemaining / 60)}:
        {(secondsRemaining % 60).toString().padStart(2, "0")}
      </p>
      <p>
        {votesCast} of {livingPlayerCount} players have voted
      </p>
      {isLoading ? <p>Loading voting targets...</p> : null}
      {hasVoted ? <p>Vote cast. Waiting for others...</p> : null}
      {errorMessage ? <p className="text-red-600">{errorMessage}</p> : null}
      <div className="space-y-2">
        {targets.map((target) => (
          <button
            key={target.id}
            className="block w-full rounded border px-4 py-2 text-left disabled:opacity-60"
            type="button"
            onClick={() => {
              void handleVote(target.id);
            }}
            disabled={hasVoted}
          >
            {target.name}
          </button>
        ))}
      </div>
      <TimerControls
        roomCode={roomCode}
        playerId={playerId}
        phase="vote"
        round={round}
        livingPlayerCount={livingPlayerCount}
        onSkipApproved={completeVoting}
        onExtend={() => {
          setSecondsRemaining((currentSeconds) => currentSeconds + 60);
        }}
      />
    </div>
  );
}
