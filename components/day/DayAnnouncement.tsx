"use client";

import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

type EliminatedPlayer = {
  id: string;
  name: string;
  role: string | null;
};

type NightResultPayload = {
  killedPlayerId: string | null;
  savedPlayerId: string | null;
  round: number;
};

type DayAnnouncementProps = {
  roomCode: string;
  nightResult: string | null;
  timerMinutes: number;
  onTimerComplete: () => void;
};

export default function DayAnnouncement({
  roomCode,
  nightResult,
  timerMinutes,
  onTimerComplete,
}: DayAnnouncementProps) {
  const [announcementText, setAnnouncementText] = useState("Dawn has arrived.");
  const [eliminatedPlayers, setEliminatedPlayers] = useState<EliminatedPlayer[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(timerMinutes * 60);
  const [errorMessage, setErrorMessage] = useState("");
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    setSecondsRemaining(timerMinutes * 60);
  }, [timerMinutes]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnnouncementData() {
      const { data: deadPlayers, error: deadPlayersError } = await supabase
        .from("players")
        .select("id, name, role")
        .eq("room_code", roomCode)
        .eq("is_alive", false);

      if (!isMounted) {
        return;
      }

      if (deadPlayersError) {
        setErrorMessage(
          `Could not load eliminated players: ${deadPlayersError.message}`
        );
      } else {
        setEliminatedPlayers((deadPlayers ?? []) as EliminatedPlayer[]);
      }

      if (!nightResult) {
        setAnnouncementText("Dawn has arrived.");
        return;
      }

      try {
        const parsedNightResult = JSON.parse(nightResult) as NightResultPayload;

        if (!parsedNightResult.killedPlayerId) {
          setAnnouncementText("The doctor saved someone. No one died tonight.");
          return;
        }

        const { data: killedPlayer, error: killedPlayerError } = await supabase
          .from("players")
          .select("name")
          .eq("id", parsedNightResult.killedPlayerId)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (killedPlayerError || !killedPlayer?.name) {
          setAnnouncementText("Dawn has arrived.");
          return;
        }

        setAnnouncementText(`${killedPlayer.name} was found dead this morning.`);
      } catch {
        setAnnouncementText("Dawn has arrived.");
      }
    }

    void loadAnnouncementData();

    return () => {
      isMounted = false;
    };
  }, [nightResult, roomCode]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(interval);

          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onTimerComplete();
          }

          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [onTimerComplete]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{announcementText}</h1>
        <p>Discuss and find the Mafia among you.</p>
        <p className="text-xl">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
      </div>

      {errorMessage ? <p className="text-red-600">{errorMessage}</p> : null}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Players eliminated so far:</h2>
        {eliminatedPlayers.length === 0 ? (
          <p>None yet.</p>
        ) : (
          <ul className="space-y-1">
            {eliminatedPlayers.map((player) => (
              <li key={player.id}>
                {player.name} - {player.role ?? "Unknown role"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
