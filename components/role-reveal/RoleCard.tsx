"use client";

import { useEffect, useState } from "react";

import { ROLE_REVEAL_DURATION } from "@/lib/constants";

type RoleCardProps = {
  role: string;
  playerName: string;
  mafiaTeammates: string[];
  onRevealComplete: () => void;
};

export default function RoleCard({
  role,
  playerName,
  mafiaTeammates,
  onRevealComplete,
}: RoleCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(ROLE_REVEAL_DURATION);

  useEffect(() => {
    if (!isRevealed) {
      return;
    }

    setSecondsRemaining(ROLE_REVEAL_DURATION);

    const countdownInterval = window.setInterval(() => {
      setSecondsRemaining((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(countdownInterval);
          onRevealComplete();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [isRevealed, onRevealComplete]);

  if (!isRevealed) {
    return (
      <button
        className="flex min-h-screen w-full items-center justify-center bg-black px-6 text-center text-xl text-white"
        type="button"
        onClick={() => setIsRevealed(true)}
      >
        Tap to reveal your role
      </button>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
      <div className="space-y-4">
        <p className="text-lg">{playerName}</p>
        <h1 className="text-4xl font-bold uppercase">{role}</h1>
        {role === "mafia" && mafiaTeammates.length > 0 ? (
          <p>Your team: {mafiaTeammates.join(", ")}</p>
        ) : null}
        <p>{secondsRemaining} seconds remaining</p>
      </div>
    </div>
  );
}
