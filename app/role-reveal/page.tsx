"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import RoleCard from "@/components/role-reveal/RoleCard";
import { supabase } from "@/lib/supabase";

type RoleRevealState = {
  playerName: string;
  role: string;
  mafiaTeammates: string[];
};

function RoleRevealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("roomCode") ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [roleRevealState, setRoleRevealState] = useState<RoleRevealState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadRoleData() {
      if (!roomCode || !playerId) {
        setErrorMessage("Missing room or player information.");
        setIsLoading(false);
        return;
      }

      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, room_code, name, role")
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
      });
      setIsLoading(false);
    }

    void loadRoleData();
  }, [playerId, roomCode]);

  function handleRevealComplete() {
    router.push("/night");
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

  return (
    <RoleCard
      role={roleRevealState.role}
      playerName={roleRevealState.playerName}
      mafiaTeammates={roleRevealState.mafiaTeammates}
      onRevealComplete={handleRevealComplete}
    />
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
