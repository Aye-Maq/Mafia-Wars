"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import PhaseWatcher from "@/components/PhaseWatcher";
import RoleCard from "@/components/role-reveal/RoleCard";
import { updatePhase } from "@/lib/gameUtils";
import { supabase } from "@/lib/supabase";

type RoleRevealState = {
  playerName: string;
  role: string;
  mafiaTeammates: string[];
  isHost: boolean;
};

function RoleRevealContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("roomCode") ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [roleRevealState, setRoleRevealState] = useState<RoleRevealState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isWaitingForNight, setIsWaitingForNight] = useState(false);

  useEffect(() => {
    async function loadRoleData() {
      if (!roomCode || !playerId) {
        setErrorMessage("Missing room or player information.");
        setIsLoading(false);
        return;
      }

      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, room_code, name, role, is_host")
        .eq("id", playerId)
        .eq("room_code", roomCode)
        .maybeSingle();

      if (playerError) {
        setErrorMessage(`Could not load player data: ${playerError.message}`);
        setIsLoading(false);
        return;
      }

      if (!player || !player.role) {
        setErrorMessage("Could not find this player's role.");
        setIsLoading(false);
        return;
      }

      let mafiaTeammates: string[] = [];

      if (player.role === "mafia") {
        const { data: mafiaPlayers, error: mafiaError } = await supabase
          .from("players")
          .select("name")
          .eq("room_code", roomCode)
          .eq("role", "mafia")
          .neq("id", playerId);

        if (mafiaError) {
          setErrorMessage(
            `Could not load mafia teammates: ${mafiaError.message}`
          );
          setIsLoading(false);
          return;
        }

        mafiaTeammates = (mafiaPlayers ?? []).map(
          (mafiaPlayer) => mafiaPlayer.name as string
        );
      }

      setRoleRevealState({
        playerName: player.name as string,
        role: player.role as string,
        mafiaTeammates,
        isHost: Boolean(player.is_host),
      });
      setIsLoading(false);
    }

    void loadRoleData();
  }, [playerId, roomCode]);

  async function handleRevealComplete() {
    setIsWaitingForNight(true);

    if (!roleRevealState?.isHost) {
      return;
    }

    try {
      await updatePhase(roomCode, "night");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start the night phase."
      );
      setIsWaitingForNight(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Loading role...</p>
      </main>
    );
  }

  if (errorMessage || !roleRevealState) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-red-600">
          {errorMessage || "Could not load the role reveal screen."}
        </p>
      </main>
    );
  }

  if (isWaitingForNight) {
    return (
      <>
        <PhaseWatcher
          roomCode={roomCode}
          playerId={playerId}
          currentPhase="role-reveal"
        />
        <main className="flex min-h-screen items-center justify-center p-6">
          <p>Waiting for night to begin...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <PhaseWatcher
        roomCode={roomCode}
        playerId={playerId}
        currentPhase="role-reveal"
      />
      <RoleCard
        role={roleRevealState.role}
        playerName={roleRevealState.playerName}
        mafiaTeammates={roleRevealState.mafiaTeammates}
        onRevealComplete={() => {
          void handleRevealComplete();
        }}
      />
    </>
  );
}

export default function RoleRevealPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <p>Loading role...</p>
        </main>
      }
    >
      <RoleRevealContent />
    </Suspense>
  );
}
