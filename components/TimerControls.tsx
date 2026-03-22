"use client";

import { useEffect, useRef, useState } from "react";

import {
  getTimerVoteCounts,
  hasPlayerSkipped,
  submitExtendVote,
  submitSkipVote,
} from "@/lib/timerVoteUtils";
import { supabase } from "@/lib/supabase";

type TimerControlsProps = {
  roomCode: string;
  playerId: string;
  phase: string;
  round: number;
  livingPlayerCount: number;
  onSkipApproved: () => void;
  onExtend: () => void;
};

export default function TimerControls({
  roomCode,
  playerId,
  phase,
  round,
  livingPlayerCount,
  onSkipApproved,
  onExtend,
}: TimerControlsProps) {
  const [skipCount, setSkipCount] = useState(0);
  const [hasSkipped, setHasSkipped] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const approvedSkipRef = useRef(false);
  const knownExtendCountRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function syncTimerVotes() {
      try {
        const [counts, skipped] = await Promise.all([
          getTimerVoteCounts(roomCode, phase, round),
          hasPlayerSkipped(roomCode, playerId, phase, round),
        ]);

        if (!isMounted) {
          return;
        }

        setSkipCount(counts.skip);
        setHasSkipped(skipped);

        const extendDelta = counts.extend - knownExtendCountRef.current;

        if (extendDelta > 0) {
          for (let index = 0; index < extendDelta; index += 1) {
            onExtend();
          }
        }

        knownExtendCountRef.current = counts.extend;

        if (
          !approvedSkipRef.current &&
          counts.skip > livingPlayerCount / 2
        ) {
          approvedSkipRef.current = true;
          onSkipApproved();
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Could not load timer votes."
        );
      }
    }

    void syncTimerVotes();

    const channel = supabase
      .channel(`timer-votes:${roomCode}:${phase}:${round}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "timer_votes",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const nextVote = payload.new;

          if (nextVote.phase !== phase || nextVote.round !== round) {
            return;
          }

          void syncTimerVotes();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [
    livingPlayerCount,
    onExtend,
    onSkipApproved,
    phase,
    playerId,
    roomCode,
    round,
  ]);

  async function handleSkip() {
    setErrorMessage("");

    try {
      await submitSkipVote(roomCode, playerId, phase, round);
      setHasSkipped(true);
      const counts = await getTimerVoteCounts(roomCode, phase, round);
      setSkipCount(counts.skip);

      if (!approvedSkipRef.current && counts.skip > livingPlayerCount / 2) {
        approvedSkipRef.current = true;
        onSkipApproved();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not vote to skip."
      );
    }
  }

  async function handleExtend() {
    setErrorMessage("");

    try {
      await submitExtendVote(roomCode, playerId, phase, round);
      knownExtendCountRef.current += 1;
      onExtend();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not extend the timer."
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          className="rounded border px-4 py-2 disabled:opacity-60"
          type="button"
          onClick={() => {
            void handleSkip();
          }}
          disabled={hasSkipped}
        >
          Skip
        </button>
        <button
          className="rounded border px-4 py-2"
          type="button"
          onClick={() => {
            void handleExtend();
          }}
        >
          + 1 Min
        </button>
      </div>
      <p>{skipCount} players want to skip</p>
      {errorMessage ? <p className="text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
