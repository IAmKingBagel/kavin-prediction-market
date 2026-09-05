import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function assertAdmin(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  const expected = process.env.ADMIN_PIN;
  return Boolean(expected && pin === expected);
}

/** Remove a single bet. If the market is still open, refunds the stake. */
export async function DELETE(req: NextRequest) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { betId } = await req.json();
    if (!betId) {
      return NextResponse.json({ error: "betId required" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: bet, error: betError } = await supabase
      .from("bets")
      .select("*")
      .eq("id", betId)
      .maybeSingle();

    if (betError) {
      return NextResponse.json({ error: betError.message }, { status: 500 });
    }
    if (!bet) {
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    const { data: college } = await supabase
      .from("colleges")
      .select("status")
      .eq("id", bet.college_id)
      .single();

    if (!college || college.status !== "open") {
      return NextResponse.json(
        { error: "Can only remove bets on open markets" },
        { status: 400 }
      );
    }

    const { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("id", bet.player_id)
      .single();

    const { error: deleteError } = await supabase
      .from("bets")
      .delete()
      .eq("id", betId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (player) {
      await supabase
        .from("players")
        .update({ balance: player.balance + bet.amount })
        .eq("id", player.id);
    }

    return NextResponse.json({ ok: true, refunded: bet.amount });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Remove bet failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
