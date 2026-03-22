"use client";

import { useState, type FormEvent } from "react";

import { DISCUSSION_TIMER_OPTIONS } from "@/lib/constants";
import { createRoom } from "@/lib/roomUtils";

type CreateRoomProps = {
  onRoomCreated: (roomCode: string, playerId: string) => void;
};

export default function CreateRoom({ onRoomCreated }: CreateRoomProps) {
  const [hostName, setHostName] = useState("");
  const [timerConfig, setTimerConfig] = useState<number>(
    DISCUSSION_TIMER_OPTIONS[1]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await createRoom(hostName, timerConfig);
      onRoomCreated(result.roomCode, result.playerId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create the room."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="host-name">
          Your Name
        </label>
        <input
          id="host-name"
          className="w-full rounded-md border px-3 py-2"
          type="text"
          value={hostName}
          onChange={(event) => setHostName(event.target.value)}
          placeholder="Enter your first name"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="timer-config">
          Discussion Timer
        </label>
        <select
          id="timer-config"
          className="w-full rounded-md border px-3 py-2"
          value={timerConfig}
          onChange={(event) => setTimerConfig(Number(event.target.value))}
          disabled={isLoading}
        >
          {DISCUSSION_TIMER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} minutes
            </option>
          ))}
        </select>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <button
        className="w-full rounded-md bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Creating Room..." : "Create Room"}
      </button>
    </form>
  );
}
