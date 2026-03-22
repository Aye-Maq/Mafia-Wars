"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import PhaseWatcher from "@/components/PhaseWatcher";
import DayAnnouncement from "@/components/day/DayAnnouncement";
import { updatePhase } from "@/lib/gameUtils";
import { supabase } from "@/lib/supabase";

type DayPageState = {
  roomCode: string;
  playerId: string;
  round: number;
  nightResult: string | null;
  timerMinutes: number;
  livingPlayerCount: number;
  isAlive: boolean;
};

function DayContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("roomCode") ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [dayState, setDayState] = useState<DayPageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const hasAdvancedRef = useRef(false);

  useEffect(() => {
    async function loadDayState() {
      if (!roomCode || !playerId) {
        setErrorMessage("Missing room or player information.");
        setIsLoading(false);
        return;
      }

      const [
        { data: player, error: playerError },
        { data: gameState, error: gameStateError },
        { data: room, error: roomError },
        { count: livingPlayerCount, error: livingPlayerCountError },
      ] = await Promise.all([
        supabase
          .from("players")
          .select("id, is_alive")
          .eq("id", playerId)
          .eq("room_code", roomCode)
          .maybeSingle(),
        supabase
          .from("game_state")
          .select("night_result, round_number")
          .eq("room_code", roomCode)
          .maybeSingle(),
        supabase
          .from("rooms")
          .select("timer_config")
          .eq("room_code", roomCode)
          .maybeSingle(),
        supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("room_code", roomCode)
          .eq("is_alive", true),
      ]);

      if (playerError) {
        setErrorMessage(`Could not load player data: ${playerError.message}`);
        setIsLoading(false);
        return;
      }

      if (gameStateError) {
        setErrorMessage(`Could not load day state: ${gameStateError.message}`);
        setIsLoading(false);
        return;
      }

      if (roomError) {
        setErrorMessage(`Could not load room settings: ${roomError.message}`);
        setIsLoading(false);
        return;
      }

      if (livingPlayerCountError) {
        setErrorMessage(
          `Could not load living player count: ${livingPlayerCountError.message}`
        );
        setIsLoading(false);
        return;
      }

      if (!player || !gameState || !room) {
        setErrorMessage("Could not find the day phase data for this player.");
        setIsLoading(false);
        return;
      }

      setDayState({
        roomCode,
        playerId,
        round: Number(gameState.round_number),
        nightResult: (gameState.night_result as string | null) ?? null,
        timerMinutes: Number(room.timer_config),
        livingPlayerCount: livingPlayerCount ?? 0,
        isAlive: Boolean(player.is_alive),
      });
      setIsLoading(false);
    }

    void loadDayState();
  }, [playerId, roomCode]);

  async function handleTimerComplete() {
    if (hasAdvancedRef.current || !dayState) {
      return;
    }

    hasAdvancedRef.current = true;

    try {
      await updatePhase(dayState.roomCode, "vote");
    } catch (error) {
      hasAdvancedRef.current = false;
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start the vote phase."
      );
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Loading day phase...</p>
      </main>
    );
  }

  if (errorMessage || !dayState) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-red-600">
          {errorMessage || "Could not load the day phase."}
        </p>
      </main>
    );
  }

  return (
    <>
      <PhaseWatcher
        roomCode={dayState.roomCode}
        playerId={dayState.playerId}
        currentPhase="day"
      />
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-2xl">
          <DayAnnouncement
            roomCode={dayState.roomCode}
            playerId={dayState.playerId}
            round={dayState.round}
            nightResult={dayState.nightResult}
            timerMinutes={dayState.timerMinutes}
            livingPlayerCount={dayState.livingPlayerCount}
            isAlive={dayState.isAlive}
            onTimerComplete={() => {
              void handleTimerComplete();
            }}
          />
        </section>
      </main>
    </>
  );
}

export default function DayPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <p>Loading day phase...</p>
        </main>
      }
    >
      <DayContent />
    </Suspense>
  );
}
