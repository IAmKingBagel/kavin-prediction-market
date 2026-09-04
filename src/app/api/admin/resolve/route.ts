import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function assertAdmin(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  const expected = process.env.ADMIN_PIN;
  if (!expected || pin !== expected) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { collegeId, outcome } = await req.json();
    if (!collegeId || (outcome !== "yes" && outcome !== "no")) {
      return NextResponse.json({ error: "Invalid resolve payload" }, { status: 400 });
    }

    const supabase = getSupabase();
    const status = outcome === "yes" ? "resolved-yes" : "resolved-no";

    const { data: college, error: collegeError } = await supabase
      .from("colleges")
      .select("*")
      .eq("id", collegeId)
      .single();

    if (collegeError || !college) {
      return NextResponse.json({ error: "College not found" }, { status: 404 });
    }
    if (college.status !== "open") {
      return NextResponse.json({ error: "Already resolved" }, { status: 400 });
    }

    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("*")
      .eq("college_id", collegeId);

    if (betsError) {
      return NextResponse.json({ error: betsError.message }, { status: 500 });
    }

    const { error: statusError } = await supabase
      .from("colleges")
      .update({ status })
      .eq("id", collegeId);

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    type Acc = { payoutAdd: number; correct: number; wrong: number };
    const byPlayer = new Map<string, Acc>();

    for (const bet of bets ?? []) {
      const prev = byPlayer.get(bet.player_id) ?? {
        payoutAdd: 0,
        correct: 0,
        wrong: 0,
      };
      if (bet.side === outcome) {
        prev.payoutAdd += bet.amount + bet.amount * Number(bet.payout_rate);
        prev.correct += 1;
      } else {
        prev.wrong += 1;
      }
      byPlayer.set(bet.player_id, prev);
    }

    for (const [playerId, acc] of Array.from(byPlayer.entries())) {
      const { data: player } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();

      if (!player) continue;

      await supabase
        .from("players")
        .update({
          balance: player.balance + Math.round(acc.payoutAdd),
          correct_count: player.correct_count + acc.correct,
          wrong_count: player.wrong_count + acc.wrong,
        })
        .eq("id", playerId);
    }

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
