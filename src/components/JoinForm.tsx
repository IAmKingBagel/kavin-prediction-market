"use client";

import { FormEvent, useState } from "react";
import type { Player } from "@/lib/types";

type Props = {
  onJoined: (player: Player) => void;
};

export function JoinForm({ onJoined }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not log in");
      onJoined(data.player);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 border border-zinc-300 bg-white p-8 shadow-sm"
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Admissions Market
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Log in with your name
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed">
            No password. Use the same name as before to get back to your balance
            and record. A new name creates a new player with 100 points.
          </p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-zinc-300 px-3 py-2.5 text-base outline-none focus:border-zinc-800"
          maxLength={40}
          required
          autoComplete="username"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-zinc-900 text-white py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Loading…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
