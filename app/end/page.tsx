"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PhaseWatcher from "@/components/PhaseWatcher";
import { resetGame } from "@/lib/gameUtils";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";

type EndPageState = {
  players: Player[];
  winner: "mafia" | "civilians";
  roomCode: string;
  playerId: string;
};

function EndContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("roomCode") ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [endState, setEndState] = useState<EndPageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const hasResetRef = useRef(false);

  useEffect(() => {
    async function loadEndState() {
      if (!roomCode) {
        setErrorMessage("Missing room information.");
        setIsLoading(false);
        return;
      }

      const [
        { data: players, error: playersError },
        { data: gameState, error: gameStateError },
        { data: room, error: roomError },
      ] = await Promise.all([
        supabase
          .from("players")
          .select("id, room_code, name, role, is_alive, is_host")
          .eq("room_code", roomCode),
        supabase
          .from("game_state")
          .select("phase")
          .eq("room_code", roomCode)
          .maybeSingle(),
        supabase
          .from("rooms")
          .select("status")
          .eq("room_code", roomCode)
          .maybeSingle(),
      ]);

      if (playersError) {
        setErrorMessage(`Could not load players: ${playersError.message}`);
        setIsLoading(false);
        return;
      }

      if (gameStateError) {
        setErrorMessage(`Could not load game state: ${gameStateError.message}`);
        setIsLoading(false);
        return;
      }

      if (roomError) {
        setErrorMessage(`Could not load room status: ${roomError.message}`);
        setIsLoading(false);
        return;
      }

      if (!gameState || !room || gameState.phase !== "end" || room.status !== "finished") {
        setErrorMessage("This game has not finished yet.");
        setIsLoading(false);
        return;
      }

      const roomPlayers = (players ?? []) as Player[];
      const winner = roomPlayers.some(
        (player) => player.is_alive && player.role === "mafia"
      )
        ? "mafia"
        : "civilians";

      setEndState({
        players: roomPlayers,
        winner,
        roomCode,
        playerId,
      });
      setIsLoading(false);
    }

    void loadEndState();
  }, [playerId, roomCode]);

  async function handlePlayAgain() {
    if (!endState || hasResetRef.current) {
      return;
    }

    hasResetRef.current = true;
    setIsResetting(true);
    setErrorMessage("");

    try {
      await resetGame(endState.roomCode);
      router.push(`/lobby?roomCode=${encodeURIComponent(endState.roomCode)}`);
    } catch (error) {
      hasResetRef.current = false;
      setIsResetting(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Could not reset the game."
      );
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Loading end screen...</p>
      </main>
    );
  }

  if (errorMessage || !endState) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-red-600">
          {errorMessage || "Could not load the end screen."}
        </p>
      </main>
    );
  }

  return (
    <>
      <PhaseWatcher
        roomCode={endState.roomCode}
        playerId={endState.playerId}
        currentPhase="end"
      />
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-2xl space-y-6">
          <h1 className="text-center text-3xl font-bold">
            {endState.winner === "mafia" ? "MAFIA WINS" : "CIVILIANS WIN"}
          </h1>

          <ul className="space-y-2">
            {endState.players.map((player) => (
              <li key={player.id}>
                {player.name} - {player.role ?? "Unknown role"} -{" "}
                {player.is_alive ? "Alive" : "Eliminated"}
              </li>
            ))}
          </ul>

          {errorMessage ? <p className="text-red-600">{errorMessage}</p> : null}

          <button
            className="w-full rounded border px-4 py-2"
            type="button"
            onClick={() => {
              void handlePlayAgain();
            }}
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Play Again"}
          </button>
        </section>
      </main>
    </>
  );
}

export default function EndPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <p>Loading end screen...</p>
        </main>
      }
    >
      <EndContent />
    </Suspense>
  );
}
