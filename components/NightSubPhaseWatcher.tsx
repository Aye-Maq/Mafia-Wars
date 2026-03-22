"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import type { NightSubPhase } from "@/lib/types";

type NightSubPhaseWatcherProps = {
  roomCode: string;
  onSubPhaseChange: (subPhase: NightSubPhase) => void;
};

export default function NightSubPhaseWatcher({
  roomCode,
  onSubPhaseChange,
}: NightSubPhaseWatcherProps) {
  useEffect(() => {
    if (!roomCode) {
      return;
    }

    let isMounted = true;

    const channel = supabase
      .channel(`night-sub-phase:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const nextNightSubPhase = payload.new.night_sub_phase as NightSubPhase;

          if (!nextNightSubPhase) {
            return;
          }

          onSubPhaseChange(nextNightSubPhase);
        }
      )
      .subscribe();

    async function syncCurrentSubPhase() {
      const { data: gameState, error } = await supabase
        .from("game_state")
        .select("night_sub_phase")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (!isMounted || error) {
        return;
      }

      const currentSubPhase = gameState?.night_sub_phase as NightSubPhase | undefined;

      if (currentSubPhase && currentSubPhase !== "none") {
        onSubPhaseChange(currentSubPhase);
      }
    }

    void syncCurrentSubPhase();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [onSubPhaseChange, roomCode]);

  return null;
}
