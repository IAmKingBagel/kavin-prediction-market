"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Odds, Player } from "@/lib/types";

type RecentBet = {
  id: string;
  side: "yes" | "no";
  amount: number;
  payout_rate: number;
  created_at: string;
  label: string;
};

type Market = {
  college: {
    id: string;
    name: string;
    status: string;
    seed_yes: number;
    seed_no: number;
  };
  odds: Odds;
  recent: RecentBet[];
};

type LeaderRow = {
  id: string;
  label: string;
  balance: number;
  record: string;
};

type Props = {
  player: Player;
  onPlayerUpdate: (player: Player) => void;
  onSignOut: () => void;
};

const ACTIVITIES = [
  "Hack United",
  "Independent finance research paper",
  "Asian Food Markets — finance internship",
  "RetailTraderz — analyst",
  "Beacon — church sound/AV role",
  "Anica — finance internship",
  "Pristine Auto",
  "Second smaller independent paper",
  "Adult film star",
];

export function MarketApp({ player, onPlayerUpdate, onSignOut }: Props) {
  const [tab, setTab] = useState<"market" | "leaderboard">("market");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminPinInput, setAdminPinInput] = useState("");
  const [busyCollege, setBusyCollege] = useState<string | null>(null);
  const [newCollege, setNewCollege] = useState({ id: "", name: "", seed_yes: "50" });
  const [seedEdits, setSeedEdits] = useState<Record<string, string>>({});

  async function refresh() {
    setError(null);
    const adminQ = adminMode ? "&admin=1" : "";
    const [marketRes, boardRes, playerRes] = await Promise.all([
      fetch(`/api/market?playerId=${player.id}${adminQ}`),
      fetch(`/api/leaderboard?playerId=${player.id}${adminQ}`),
      fetch(`/api/player/${player.id}`),
    ]);

    const marketData = await marketRes.json();
    const boardData = await boardRes.json();
    const playerData = await playerRes.json();

    if (!marketRes.ok) throw new Error(marketData.error || "Market load failed");
    if (!boardRes.ok) throw new Error(boardData.error || "Leaderboard load failed");
    if (!playerRes.ok) throw new Error(playerData.error || "Player load failed");

    setMarkets(marketData.markets);
    setLeaders(boardData.players);
    onPlayerUpdate(playerData.player);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id, adminMode]);

  async function placeBet(collegeId: string, side: "yes" | "no") {
    const raw = amounts[collegeId] ?? "";
    const amount = Number(raw);
    setBusyCollege(collegeId);
    setError(null);
    try {
      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          collegeId,
          side,
          amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bet failed");
      onPlayerUpdate(data.player);
      setAmounts((prev) => ({ ...prev, [collegeId]: "" }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bet failed");
    } finally {
      setBusyCollege(null);
    }
  }

  async function unlockAdmin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: adminPinInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Wrong PIN");
      return;
    }
    setAdminPin(adminPinInput);
    setAdminMode(true);
    setAdminPinInput("");
    sessionStorage.setItem("adminPin", adminPinInput);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("adminPin");
    if (!saved) return;
    (async () => {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: saved }),
      });
      if (res.ok) {
        setAdminPin(saved);
        setAdminMode(true);
      } else {
        sessionStorage.removeItem("adminPin");
      }
    })();
  }, []);

  async function resolveCollege(collegeId: string, outcome: "yes" | "no") {
    setBusyCollege(collegeId);
    setError(null);
    try {
      const res = await fetch("/api/admin/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({ collegeId, outcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolve failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusyCollege(null);
    }
  }

  async function addCollege(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/colleges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": adminPin,
      },
      body: JSON.stringify({
        id: newCollege.id,
        name: newCollege.name,
        seed_yes: Number(newCollege.seed_yes),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not add college");
      return;
    }
    setNewCollege({ id: "", name: "", seed_yes: "50" });
    await refresh();
  }

  async function updateSeed(collegeId: string) {
    const seedYes = Number(seedEdits[collegeId]);
    setError(null);
    const res = await fetch("/api/admin/colleges", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": adminPin,
      },
      body: JSON.stringify({ id: collegeId, seed_yes: seedYes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update seed");
      return;
    }
    await refresh();
  }

  async function removeCollege(collegeId: string) {
    if (!confirm(`Remove ${collegeId}? This deletes its bets too.`)) return;
    setError(null);
    const res = await fetch("/api/admin/colleges", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": adminPin,
      },
      body: JSON.stringify({ id: collegeId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not remove college");
      return;
    }
    await refresh();
  }

  const openMarkets = markets.filter((m) => m.college.status === "open");
  const resolvedMarkets = markets.filter((m) => m.college.status !== "open");

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-300 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Admissions Market
            </p>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">
              Will he get in?
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Top of the leaderboard when all decisions are in gets{" "}
              <span className="font-semibold text-zinc-900">$100</span>.
            </p>
          </div>
          <div className="border border-zinc-300 bg-white px-4 py-3 min-w-[180px]">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">You</p>
            <p className="font-semibold">{player.name}</p>
            <p className="text-sm tabular-nums">
              {player.balance} pts · {player.correct_count}-{player.wrong_count}
            </p>
            <button
              type="button"
              onClick={onSignOut}
              className="mt-2 text-xs text-zinc-500 underline"
            >
              Switch player
            </button>
          </div>
        </header>

        <section className="border border-zinc-300 bg-white p-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Applicant snapshot
          </h2>
          <p className="text-sm">
            <span className="font-medium">GPA:</span> 4.25 ·{" "}
            <span className="font-medium">SAT:</span> 1510 (retaking Sept 12,
            aiming 1540–1550)
          </p>
          <div>
            <p className="text-sm font-medium mb-1">
              Common App activities{" "}
              <span className="font-normal text-zinc-500">
                (self-reported, some creative liberties taken)
              </span>
            </p>
            <ul className="text-sm text-zinc-700 list-disc pl-5 space-y-0.5">
              {ACTIVITIES.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="border border-zinc-300 bg-white p-4">
            <h2 className="font-semibold text-sm">How much should I bet?</h2>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
              Bet more when confident, less when guessing. Don&apos;t put it all
              on one school.
            </p>
          </section>
          <section className="border border-zinc-300 bg-white p-4">
            <h2 className="font-semibold text-sm">How does the payout work?</h2>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
              Starting odds come from my own read; real bets shift them. Your
              rate locks in when you bet. Right = stake back plus that rate.
              Wrong = lose the stake.
            </p>
          </section>
        </div>

        <nav className="flex gap-2 border-b border-zinc-300">
          <button
            type="button"
            onClick={() => setTab("market")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "market"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500"
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setTab("leaderboard")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "leaderboard"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500"
            }`}
          >
            Leaderboard
          </button>
        </nav>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : tab === "leaderboard" ? (
          <section className="border border-zinc-300 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                  <th className="px-3 py-2 font-medium">Record</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((row, i) => (
                  <tr key={row.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2 tabular-nums text-zinc-500">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">{row.label}</td>
                    <td className="px-3 py-2 tabular-nums">{row.balance}</td>
                    <td className="px-3 py-2 tabular-nums">{row.record}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <div className="space-y-4">
            {openMarkets.map(({ college, odds, recent }) => {
              const amt = amounts[college.id] ?? "";
              const n = Number(amt);
              const labelAmt = Number.isInteger(n) && n > 0 ? String(n) : "…";
              return (
                <article
                  key={college.id}
                  className="border border-zinc-300 bg-white p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-lg">{college.name}</h3>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      Right now: yes pays +{odds.yesPaysPercent}%, no pays +
                      {odds.noPaysPercent}%
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex h-3 w-full overflow-hidden bg-zinc-200">
                      <div
                        className="bg-emerald-700"
                        style={{ width: `${odds.yesPercent}%` }}
                      />
                      <div
                        className="bg-rose-700"
                        style={{ width: `${odds.noPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs tabular-nums text-zinc-600">
                      <span>Yes {odds.yesPercent}%</span>
                      <span>No {odds.noPercent}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      placeholder="Points"
                      value={amt}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [college.id]: e.target.value,
                        }))
                      }
                      className="w-24 border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={busyCollege === college.id}
                      onClick={() => placeBet(college.id, "yes")}
                      className="bg-emerald-800 text-white text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      Bet {labelAmt} on yes
                    </button>
                    <button
                      type="button"
                      disabled={busyCollege === college.id}
                      onClick={() => placeBet(college.id, "no")}
                      className="bg-rose-800 text-white text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      Bet {labelAmt} on no
                    </button>
                  </div>

                  {recent.length > 0 && (
                    <ul className="text-xs text-zinc-600 space-y-1 border-t border-zinc-200 pt-2">
                      {recent.map((b) => (
                        <li key={b.id}>
                          <span className="font-medium text-zinc-800">
                            {b.label}
                          </span>{" "}
                          bet {b.amount} on {b.side} (locks +
                          {Math.round(Number(b.payout_rate) * 100)}%)
                        </li>
                      ))}
                    </ul>
                  )}

                  {adminMode && (
                    <div className="border-t border-zinc-200 pt-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resolveCollege(college.id, "yes")}
                          className="text-xs border border-emerald-800 text-emerald-900 px-2 py-1"
                        >
                          Resolve: admitted
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveCollege(college.id, "no")}
                          className="text-xs border border-rose-800 text-rose-900 px-2 py-1"
                        >
                          Resolve: not admitted
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCollege(college.id)}
                          className="text-xs border border-zinc-400 text-zinc-600 px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <label>
                          seed_yes{" "}
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="w-16 border border-zinc-300 px-1 py-0.5 ml-1"
                            value={
                              seedEdits[college.id] ?? String(college.seed_yes)
                            }
                            onChange={(e) =>
                              setSeedEdits((prev) => ({
                                ...prev,
                                [college.id]: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => updateSeed(college.id)}
                          className="underline"
                        >
                          Save seed
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}

            {resolvedMarkets.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Resolved
                </h3>
                {resolvedMarkets.map(({ college, odds }) => (
                  <div
                    key={college.id}
                    className="border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm flex justify-between gap-2"
                  >
                    <span className="font-medium">{college.name}</span>
                    <span className="text-zinc-600">
                      {college.status === "resolved-yes"
                        ? "Admitted"
                        : "Not admitted"}{" "}
                      · last odds {odds.yesPercent}% / {odds.noPercent}%
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        <section className="border border-dashed border-zinc-400 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Admin</h2>
          {!adminMode ? (
            <form onSubmit={unlockAdmin} className="flex flex-wrap gap-2">
              <input
                type="password"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                placeholder="PIN"
                className="border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="bg-zinc-800 text-white text-sm px-3 py-1.5"
              >
                Unlock
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-emerald-800">
                Admin unlocked — real names shown. Resolve / edit controls are on
                each open market.
              </p>
              <form onSubmit={addCollege} className="flex flex-wrap gap-2 text-sm">
                <input
                  placeholder="id (e.g. cornell)"
                  value={newCollege.id}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, id: e.target.value }))
                  }
                  className="border border-zinc-300 px-2 py-1.5"
                  required
                />
                <input
                  placeholder="Name"
                  value={newCollege.name}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, name: e.target.value }))
                  }
                  className="border border-zinc-300 px-2 py-1.5"
                  required
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="seed_yes"
                  value={newCollege.seed_yes}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, seed_yes: e.target.value }))
                  }
                  className="w-24 border border-zinc-300 px-2 py-1.5"
                  required
                />
                <button
                  type="submit"
                  className="bg-zinc-800 text-white px-3 py-1.5"
                >
                  Add college
                </button>
              </form>
              <button
                type="button"
                className="text-xs underline text-zinc-500"
                onClick={() => {
                  setAdminMode(false);
                  setAdminPin("");
                  sessionStorage.removeItem("adminPin");
                }}
              >
                Lock admin
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
