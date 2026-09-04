import { NextRequest, NextResponse } from "next/server";
import { displayName } from "@/lib/pseudonym";
import { getSupabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId");
    const adminMode = req.nextUrl.searchParams.get("admin") === "1";
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("balance", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const players = ((data ?? []) as Player[]).map((p) => ({
      id: p.id,
      label: displayName(p.id, p.name, playerId, adminMode),
      balance: p.balance,
      correct_count: p.correct_count,
      wrong_count: p.wrong_count,
      record: `${p.correct_count}-${p.wrong_count}`,
    }));

    return NextResponse.json({ players });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load leaderboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
