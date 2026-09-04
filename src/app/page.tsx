"use client";

import { useEffect, useState } from "react";
import { JoinForm } from "@/components/JoinForm";
import { MarketApp } from "@/components/MarketApp";
import type { Player } from "@/lib/types";

const STORAGE_KEY = "admissions-market-player-id";

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setBooting(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/player/${id}`);
        if (!res.ok) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        const data = await res.json();
        setPlayer(data.player);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  function handleJoined(p: Player) {
    localStorage.setItem(STORAGE_KEY, p.id);
    setPlayer(p);
  }

  function handleSignOut() {
    localStorage.removeItem(STORAGE_KEY);
    setPlayer(null);
  }

  if (booting) {
    return (
      <main className="min-h-screen bg-zinc-100 flex items-center justify-center text-zinc-500 text-sm">
        Loading…
      </main>
    );
  }

  if (!player) {
    return <JoinForm onJoined={handleJoined} />;
  }

  return (
    <MarketApp
      player={player}
      onPlayerUpdate={setPlayer}
      onSignOut={handleSignOut}
    />
  );
}
