"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import TimerControls from "@/components/TimerControls";
import { getDetectiveResult } from "@/lib/nightUtils";
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
  playerId: string;
  round: number;
  nightResult: string | null;
  timerMinutes: number;
  livingPlayerCount: number;
  isAlive: boolean;
  onTimerComplete: () => void;
};

export default function DayAnnouncement({
  roomCode,
  playerId,
  round,
  nightResult,
  timerMinutes,
  livingPlayerCount,
  isAlive,
  onTimerComplete,
}: DayAnnouncementProps) {
  const [announcementText, setAnnouncementText] = useState("Dawn has arrived.");
  const [eliminatedPlayers, setEliminatedPlayers] = useState<EliminatedPlayer[]>([]);
  const [detectiveAnnouncement, setDetectiveAnnouncement] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(timerMinutes * 60);
  const [errorMessage, setErrorMessage] = useState("");
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    setSecondsRemaining(timerMinutes * 60);
  }, [timerMinutes]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnnouncementData() {
      try {
        const [deadPlayersResult, detectiveResult] = await Promise.all([
          supabase
            .from("players")
            .select("id, name, role")
            .eq("room_code", roomCode)
            .eq("is_alive", false),
          getDetectiveResult(roomCode, round),
        ]);

        const { data: deadPlayers, error: deadPlayersError } = deadPlayersResult;

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

        if (detectiveResult === "correct") {
          setDetectiveAnnouncement("The detective detected the Mafia.");
        } else if (detectiveResult === "incorrect") {
          setDetectiveAnnouncement("The detective did not detect the Mafia.");
        } else {
          setDetectiveAnnouncement("");
        }

        if (!nightResult) {
          setAnnouncementText("Dawn has arrived.");
          return;
        }

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
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load the day announcement."
        );
        setAnnouncementText("Dawn has arrived.");
      }
    }

    void loadAnnouncementData();

    return () => {
      isMounted = false;
    };
  }, [nightResult, roomCode, round]);

  const completeTimer = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    onTimerComplete();
  }, [onTimerComplete]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(interval);
          completeTimer();

          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [completeTimer]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{announcementText}</h1>
        {detectiveAnnouncement ? <p>{detectiveAnnouncement}</p> : null}
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

      {isAlive ? (
        <TimerControls
          roomCode={roomCode}
          playerId={playerId}
          phase="day"
          round={round}
          livingPlayerCount={livingPlayerCount}
          onSkipApproved={completeTimer}
          onExtend={() => {
            setSecondsRemaining((currentSeconds) => currentSeconds + 60);
          }}
        />
      ) : null}
    </div>
  );
}
