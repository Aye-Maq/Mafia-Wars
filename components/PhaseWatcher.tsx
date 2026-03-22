"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import type { Phase } from "@/lib/types";

type PhaseWatcherProps = {
  roomCode: string;
  playerId: string;
  currentPhase: Phase;
};

const PHASE_ROUTE_MAP: Record<Phase, string> = {
  lobby: "/lobby",
  "role-reveal": "/role-reveal",
  night: "/night",
  day: "/day",
  vote: "/vote",
  end: "/end",
};

function getPhaseRoute(phase: Phase, roomCode: string, playerId: string): string {
  const searchParams = new URLSearchParams({
    roomCode,
    playerId,
  });

  return `${PHASE_ROUTE_MAP[phase]}?${searchParams.toString()}`;
}

export default function PhaseWatcher({
  roomCode,
  playerId,
  currentPhase,
}: PhaseWatcherProps) {
  const router = useRouter();

  useEffect(() => {
    if (!roomCode || !playerId) {
      return;
    }

    const channel = supabase
      .channel(`phase:${roomCode}:${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const nextPhase = payload.new.phase as Phase;

          if (!nextPhase || nextPhase === currentPhase) {
            return;
          }

          router.push(getPhaseRoute(nextPhase, roomCode, playerId));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentPhase, playerId, roomCode, router]);

  return null;
}
