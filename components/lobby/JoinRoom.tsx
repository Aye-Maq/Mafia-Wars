"use client";

import { useState, type FormEvent } from "react";

import { joinRoom } from "@/lib/roomUtils";

type JoinRoomProps = {
  onRoomJoined: (roomCode: string, playerId: string) => void;
};

export default function JoinRoom({ onRoomJoined }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    const normalizedRoomCode = roomCode.trim().toUpperCase();

    try {
      const result = await joinRoom(normalizedRoomCode, playerName);

      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }

      onRoomJoined(normalizedRoomCode, result.playerId);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="room-code">
          Room Code
        </label>
        <input
          id="room-code"
          className="w-full rounded-md border px-3 py-2 uppercase"
          type="text"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          placeholder="SHADOW-7743"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="player-name">
          Your Name
        </label>
        <input
          id="player-name"
          className="w-full rounded-md border px-3 py-2"
          type="text"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Enter your first name"
          disabled={isLoading}
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <button
        className="w-full rounded-md bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Joining Room..." : "Join Room"}
      </button>
    </form>
  );
}
