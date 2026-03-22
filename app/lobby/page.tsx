"use client";

import { useState } from "react";

import CreateRoom from "@/components/lobby/CreateRoom";
import JoinRoom from "@/components/lobby/JoinRoom";
import PlayerList from "@/components/lobby/PlayerList";

type LobbyView = "choosing" | "creating" | "joining" | "waiting";

type LobbySession = {
  roomCode: string;
  playerId: string;
  isHost: boolean;
};

const EMPTY_SESSION: LobbySession = {
  roomCode: "",
  playerId: "",
  isHost: false,
};

export default function LobbyPage() {
  const [view, setView] = useState<LobbyView>("choosing");
  const [session, setSession] = useState<LobbySession>(EMPTY_SESSION);

  function handleRoomCreated(roomCode: string, playerId: string) {
    setSession({ roomCode, playerId, isHost: true });
    setView("waiting");
  }

  function handleRoomJoined(roomCode: string, playerId: string) {
    setSession({ roomCode, playerId, isHost: false });
    setView("waiting");
  }

  function handleStartGame() {
    console.log("Starting game...");
  }

  function renderCurrentView() {
    if (view === "creating") {
      return <CreateRoom onRoomCreated={handleRoomCreated} />;
    }

    if (view === "joining") {
      return <JoinRoom onRoomJoined={handleRoomJoined} />;
    }

    if (view === "waiting" && session.roomCode && session.playerId) {
      return (
        <PlayerList
          roomCode={session.roomCode}
          isHost={session.isHost}
          onStartGame={handleStartGame}
        />
      );
    }

    return (
      <div className="space-y-4">
        <button
          className="w-full rounded-md bg-black px-4 py-2 text-white"
          type="button"
          onClick={() => setView("creating")}
        >
          Create Room
        </button>
        <button
          className="w-full rounded-md border px-4 py-2"
          type="button"
          onClick={() => setView("joining")}
        >
          Join Room
        </button>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md space-y-6 rounded-lg border p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Mafia Wars Lobby</h1>
          <p className="text-sm text-gray-600">
            Create a room for your group or join an existing one.
          </p>
        </div>

        {renderCurrentView()}

        {view !== "choosing" && view !== "waiting" ? (
          <button
            className="text-sm text-gray-600 underline"
            type="button"
            onClick={() => setView("choosing")}
          >
            Back
          </button>
        ) : null}
      </section>
    </main>
  );
}
