"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { MIN_PLAYERS } from "@/lib/constants";
import { getRoomPlayers } from "@/lib/roomUtils";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";

type PlayerListProps = {
  roomCode: string;
  isHost: boolean;
  onStartGame: () => void;
};

export default function PlayerList({
  roomCode,
  isHost,
  onStartGame,
}: PlayerListProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPlayers() {
      try {
        const nextPlayers = await getRoomPlayers(roomCode);

        if (!isMounted) {
          return;
        }

        setPlayers(nextPlayers);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Could not load players."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPlayers();

    const channel = supabase
      .channel(`players:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          void loadPlayers();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [roomCode]);

  function handleStartGameClick() {
    onStartGame();
    router.push("/role-reveal");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Room {roomCode}</h2>
        <p className="text-sm text-gray-600">
          {isHost
            ? "Waiting for players to join before starting the game."
            : "Waiting for the host to start the game..."}
        </p>
      </div>

      {isLoading ? <p>Loading players...</p> : null}
      {errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <ul className="space-y-1">
        {players.map((player) => (
          <li key={player.id}>
            {player.name}
            {player.is_host ? " (Host)" : ""}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="w-full rounded-md bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleStartGameClick}
          disabled={players.length < MIN_PLAYERS}
        >
          Start Game
        </button>
      ) : null}

      {isHost && players.length < MIN_PLAYERS ? (
        <p className="text-sm text-gray-600">
          At least {MIN_PLAYERS} players are required to start.
        </p>
      ) : null}
    </div>
  );
}
