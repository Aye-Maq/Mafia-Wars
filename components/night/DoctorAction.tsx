"use client";

import { useEffect, useState } from "react";

import TimerControls from "@/components/TimerControls";
import { NIGHT_ACTION_TIMER } from "@/lib/constants";
import { submitNightAction } from "@/lib/nightUtils";
import { supabase } from "@/lib/supabase";

type TargetPlayer = {
  id: string;
  name: string;
};

type DoctorActionProps = {
  roomCode: string;
  playerId: string;
  round: number;
  livingPlayerCount: number;
  onActionSubmitted: () => void;
};

export default function DoctorAction({
  roomCode,
  playerId,
  round,
  livingPlayerCount,
  onActionSubmitted,
}: DoctorActionProps) {
  const [targets, setTargets] = useState<TargetPlayer[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(NIGHT_ACTION_TIMER);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTargets() {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("room_code", roomCode)
        .eq("is_alive", true);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(`Could not load save targets: ${error.message}`);
        setIsLoading(false);
        return;
      }

      setTargets((data ?? []) as TargetPlayer[]);
      setIsLoading(false);
    }

    void loadTargets();

    return () => {
      isMounted = false;
    };
  }, [roomCode]);

  useEffect(() => {
    if (hasSubmitted) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(interval);
          setHasSubmitted(true);
          onActionSubmitted();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [hasSubmitted, onActionSubmitted]);

  function completeAction() {
    if (hasSubmitted) {
      return;
    }

    setHasSubmitted(true);
    onActionSubmitted();
  }

  async function handleSubmitSave() {
    if (!selectedTargetId) {
      setErrorMessage("Select a player before saving.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await submitNightAction(
        roomCode,
        playerId,
        "doctor_save",
        selectedTargetId,
        round
      );
      completeAction();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not submit the save."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (hasSubmitted) {
    return (
      <div className="space-y-4 text-white">
        <h1 className="text-2xl font-semibold">Doctor Save</h1>
        <p>Saved. Waiting...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-white">
      <h1 className="text-2xl font-semibold">Doctor Save</h1>
      <p>{secondsRemaining} seconds remaining</p>
      {isLoading ? <p>Loading players...</p> : null}
      {errorMessage ? <p className="text-red-400">{errorMessage}</p> : null}
      <div className="space-y-2">
        {targets.map((target) => (
          <button
            key={target.id}
            className={`block w-full rounded border px-4 py-2 text-left ${
              selectedTargetId === target.id ? "border-white" : "border-gray-600"
            }`}
            type="button"
            onClick={() => setSelectedTargetId(target.id)}
            disabled={isSubmitting}
          >
            {target.name}
          </button>
        ))}
      </div>
      <button
        className="w-full rounded bg-white px-4 py-2 text-black disabled:opacity-60"
        type="button"
        onClick={handleSubmitSave}
        disabled={isSubmitting || !selectedTargetId}
      >
        {isSubmitting ? "Submitting..." : "Submit Save"}
      </button>
      <TimerControls
        roomCode={roomCode}
        playerId={playerId}
        phase="doctor"
        round={round}
        livingPlayerCount={livingPlayerCount}
        onSkipApproved={completeAction}
        onExtend={() => {
          setSecondsRemaining((currentSeconds) => currentSeconds + 60);
        }}
      />
    </div>
  );
}
