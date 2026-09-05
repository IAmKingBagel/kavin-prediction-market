import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function assertAdmin(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  const expected = process.env.ADMIN_PIN;
  return Boolean(expected && pin === expected);
}

/**
 * Reset a player to 100 points / 0-0 record and delete all their bets on
 * open markets so those odds no longer include them.
 */
export async function POST(req: NextRequest) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playerId } = await req.json();
    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .maybeSingle();

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const { data: openColleges, error: collegesError } = await supabase
      .from("colleges")
      .select("id")
      .eq("status", "open");

    if (collegesError) {
      return NextResponse.json({ error: collegesError.message }, { status: 500 });
    }

    const openIds = (openColleges ?? []).map((c) => c.id);

    if (openIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("bets")
        .delete()
        .eq("player_id", playerId)
        .in("college_id", openIds);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("players")
      .update({
        balance: 100,
        correct_count: 0,
        wrong_count: 0,
      })
      .eq("id", playerId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      player: updated,
      clearedOpenBets: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
