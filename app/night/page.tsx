"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import PhaseWatcher from "@/components/PhaseWatcher";
import DetectiveAction from "@/components/night/DetectiveAction";
import DoctorAction from "@/components/night/DoctorAction";
import MafiaAction from "@/components/night/MafiaAction";
import { NIGHT_ACTION_TIMER } from "@/lib/constants";
import { finalizeNight } from "@/lib/gameUtils";
import { checkAllNightActionsSubmitted } from "@/lib/nightUtils";
import { supabase } from "@/lib/supabase";

type NightState = {
  role: string;
  round: number;
};

function NightContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("roomCode") ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [nightState, setNightState] = useState<NightState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasTriggeredNightEnd, setHasTriggeredNightEnd] = useState(false);
  const [isFinalizingNight, setIsFinalizingNight] = useState(false);

  useEffect(() => {
    async function loadNightState() {
      if (!roomCode || !playerId) {
        setErrorMessage("Missing room or player information.");
        setIsLoading(false);
        return;
      }

      const [{ data: player, error: playerError }, { data: gameState, error: gameStateError }] =
        await Promise.all([
          supabase
            .from("players")
            .select("role")
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
        setErrorMessage(`Could not load player role: ${playerError.message}`);
        setIsLoading(false);
        return;
      }

      if (gameStateError) {
        setErrorMessage(`Could not load the current round: ${gameStateError.message}`);
        setIsLoading(false);
        return;
      }

      if (!player?.role || !gameState) {
        setErrorMessage("Could not find the night phase data for this player.");
        setIsLoading(false);
        return;
      }

      setNightState({
        role: player.role as string,
        round: gameState.round_number as number,
      });
      setIsLoading(false);
    }

    void loadNightState();
  }, [playerId, roomCode]);

  const handleNightActionSubmitted = useCallback(
    async (forceAdvance = false) => {
      if (!nightState || hasTriggeredNightEnd || isFinalizingNight) {
        return;
      }

      setIsFinalizingNight(true);
      setErrorMessage("");

      try {
        const allSubmitted = forceAdvance
          ? false
          : await checkAllNightActionsSubmitted(roomCode, nightState.round);

        if (forceAdvance || allSubmitted) {
          setHasTriggeredNightEnd(true);
          await finalizeNight(roomCode, nightState.round);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not finish the night phase."
        );
        setHasTriggeredNightEnd(false);
      } finally {
        setIsFinalizingNight(false);
      }
    },
    [hasTriggeredNightEnd, isFinalizingNight, nightState, roomCode]
  );

  useEffect(() => {
    if (!nightState || hasTriggeredNightEnd) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void handleNightActionSubmitted(true);
    }, NIGHT_ACTION_TIMER * 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [handleNightActionSubmitted, hasTriggeredNightEnd, nightState]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <p>Loading night phase...</p>
      </main>
    );
  }

  if (errorMessage || !nightState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <p className="text-red-400">
          {errorMessage || "Could not load the night phase."}
        </p>
      </main>
    );
  }

  function renderNightScreen(currentNightState: NightState) {
    if (currentNightState.role === "mafia") {
      return (
        <MafiaAction
          roomCode={roomCode}
          playerId={playerId}
          round={currentNightState.round}
          onActionSubmitted={() => {
            void handleNightActionSubmitted();
          }}
        />
      );
    }

    if (currentNightState.role === "doctor") {
      return (
        <DoctorAction
          roomCode={roomCode}
          playerId={playerId}
          round={currentNightState.round}
          onActionSubmitted={() => {
            void handleNightActionSubmitted();
          }}
        />
      );
    }

    if (currentNightState.role === "detective") {
      return (
        <DetectiveAction
          roomCode={roomCode}
          playerId={playerId}
          round={currentNightState.round}
          onActionSubmitted={() => {
            void handleNightActionSubmitted();
          }}
        />
      );
    }

    return (
      <div className="space-y-4 text-center text-white">
        <h1 className="text-3xl font-semibold">Night has fallen.</h1>
        <p>Close your eyes.</p>
        {isFinalizingNight ? <p>Waiting for night to end...</p> : null}
      </div>
    );
  }

  return (
    <>
      <PhaseWatcher roomCode={roomCode} playerId={playerId} currentPhase="night" />
      <main className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-md space-y-4">
          {renderNightScreen(nightState)}
          {isFinalizingNight ? (
            <p className="text-center text-sm text-gray-300">
              Checking whether the night is complete...
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}

export default function NightPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
          <p>Loading night phase...</p>
        </main>
      }
    >
      <NightContent />
    </Suspense>
  );
}
