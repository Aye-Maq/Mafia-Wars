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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onSubPhaseChange, roomCode]);

  return null;
}
