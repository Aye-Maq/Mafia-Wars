"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import NightSubPhaseWatcher from "@/components/NightSubPhaseWatcher";
import PhaseWatcher from "@/components/PhaseWatcher";
import DetectiveAction from "@/components/night/DetectiveAction";
import DoctorAction from "@/components/night/DoctorAction";
import MafiaAction from "@/components/night/MafiaAction";
import {
  advanceNightSubPhase,
  finalizeNight,
  updatePhase,
} from "@/lib/gameUtils";
import { supabase } from "@/lib/supabase";
import type { NightSubPhase } from "@/lib/types";

type NightState = {
  role: string;
  round: number;
  isHost: boolean;
};

const NIGHT_TRANSITION_DELAY_MS = 3000;

function NightContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("roomCode") ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [nightState, setNightState] = useState<NightState | null>(null);
  const [nightSubPhase, setNightSubPhase] = useState<NightSubPhase>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const hasAdvancedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    async function loadNightState() {
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
          .select("role, is_host")
          .eq("id", playerId)
          .eq("room_code", roomCode)
          .maybeSingle(),
        supabase
          .from("game_state")
          .select("round_number, night_sub_phase")
          .eq("room_code", roomCode)
          .maybeSingle(),
      ]);

      if (playerError) {
        setErrorMessage(`Could not load player role: ${playerError.message}`);
        setIsLoading(false);
        return;
      }

      if (gameStateError) {
        setErrorMessage(
          `Could not load the current night state: ${gameStateError.message}`
        );
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
        isHost: Boolean(player.is_host),
      });
      setNightSubPhase((gameState.night_sub_phase as NightSubPhase) ?? "none");
      setIsLoading(false);
    }

    void loadNightState();
  }, [playerId, roomCode]);

  const runAdvanceOnce = useCallback(
    async (key: string, action: () => Promise<void>) => {
      if (hasAdvancedRef.current[key]) {
        return;
      }

      hasAdvancedRef.current[key] = true;

      try {
        await action();
      } catch (error) {
        delete hasAdvancedRef.current[key];
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    if (!nightState?.isHost || nightSubPhase !== "none") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void runAdvanceOnce("night-start", async () => {
        await advanceNightSubPhase(roomCode, "mafia_acting");
      }).catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not start the mafia step."
        );
      });
    }, NIGHT_TRANSITION_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [nightState?.isHost, nightSubPhase, roomCode, runAdvanceOnce]);

  async function handleAdvance(
    key: string,
    action: () => Promise<void>,
    fallbackMessage: string
  ) {
    setErrorMessage("");

    try {
      await runAdvanceOnce(key, action);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    }
  }

  function renderPrompt(message: string) {
    return (
      <div className="space-y-4 text-center text-white">
        <p className="text-2xl">{message}</p>
      </div>
    );
  }

  function renderNightScreen(currentNightState: NightState) {
    if (nightSubPhase === "mafia_acting") {
      if (currentNightState.role === "mafia") {
        return (
          <MafiaAction
            roomCode={roomCode}
            playerId={playerId}
            round={currentNightState.round}
            onActionSubmitted={() => {
              void handleAdvance(
                "mafia-to-doctor",
                async () => {
                  await advanceNightSubPhase(roomCode, "doctor_acting");
                },
                "Could not advance to the doctor step."
              );
            }}
          />
        );
      }

      return renderPrompt("Mafia, open your eyes.");
    }

    if (nightSubPhase === "doctor_acting") {
      if (currentNightState.role === "doctor") {
        return (
          <DoctorAction
            roomCode={roomCode}
            playerId={playerId}
            round={currentNightState.round}
            onActionSubmitted={() => {
              void handleAdvance(
                "doctor-to-detective",
                async () => {
                  await advanceNightSubPhase(roomCode, "detective_acting");
                },
                "Could not advance to the detective step."
              );
            }}
          />
        );
      }

      return renderPrompt("Doctor, open your eyes.");
    }

    if (nightSubPhase === "detective_acting") {
      if (currentNightState.role === "detective") {
        return (
          <DetectiveAction
            roomCode={roomCode}
            playerId={playerId}
            round={currentNightState.round}
            onActionSubmitted={() => {
              void handleAdvance(
                "detective-to-day",
                async () => {
                  await advanceNightSubPhase(roomCode, "night_complete");
                  await new Promise((resolve) =>
                    window.setTimeout(resolve, NIGHT_TRANSITION_DELAY_MS)
                  );
                  await finalizeNight(roomCode, currentNightState.round);
                  await updatePhase(roomCode, "day", "none");
                },
                "Could not finish the night phase."
              );
            }}
          />
        );
      }

      return renderPrompt("Detective, open your eyes.");
    }

    if (nightSubPhase === "night_complete") {
      return renderPrompt("Everyone open your eyes. Dawn has arrived.");
    }

    return renderPrompt("Night has fallen. Everyone close your eyes.");
  }

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

  return (
    <>
      <PhaseWatcher roomCode={roomCode} playerId={playerId} currentPhase="night" />
      <NightSubPhaseWatcher
        roomCode={roomCode}
        onSubPhaseChange={(subPhase) => {
          setNightSubPhase(subPhase);
        }}
      />
      <main className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-md space-y-4">
          {renderNightScreen(nightState)}
          {errorMessage ? (
            <p className="text-center text-sm text-red-400">{errorMessage}</p>
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
