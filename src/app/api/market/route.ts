import { NextRequest, NextResponse } from "next/server";
import { computeOdds } from "@/lib/odds";
import { displayName } from "@/lib/pseudonym";
import { getSupabase } from "@/lib/supabase";
import type { Bet, BetWithPlayer, College } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId");
    const adminMode = req.nextUrl.searchParams.get("admin") === "1";
    const supabase = getSupabase();

    const { data: colleges, error: collegesError } = await supabase
      .from("colleges")
      .select("*")
      .order("name");

    if (collegesError) {
      return NextResponse.json({ error: collegesError.message }, { status: 500 });
    }

    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("*, players(id, name)")
      .order("created_at", { ascending: false });

    if (betsError) {
      return NextResponse.json({ error: betsError.message }, { status: 500 });
    }

    const allBets = (bets ?? []) as BetWithPlayer[];

    const markets = (colleges as College[]).map((college) => {
      const collegeBets = allBets.filter((b) => b.college_id === college.id);
      const odds = computeOdds(college, collegeBets);
      const recentLimit = adminMode ? collegeBets.length : 4;
      const recent = collegeBets.slice(0, recentLimit).map((b) => ({
        id: b.id,
        side: b.side,
        amount: b.amount,
        payout_rate: Number(b.payout_rate),
        created_at: b.created_at,
        player_id: b.player_id,
        label: displayName(
          b.player_id,
          b.players?.name ?? "Unknown",
          playerId,
          adminMode
        ),
      }));

      return { college, odds, recent };
    });

    return NextResponse.json({ markets });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load market";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const playerId = body.playerId as string;
    const collegeId = body.collegeId as string;
    const side = body.side as "yes" | "no";
    const amount = Number(body.amount);

    if (!playerId || !collegeId || (side !== "yes" && side !== "no")) {
      return NextResponse.json({ error: "Invalid bet payload" }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive integer" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (amount > player.balance) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const { data: college, error: collegeError } = await supabase
      .from("colleges")
      .select("*")
      .eq("id", collegeId)
      .single();

    if (collegeError || !college) {
      return NextResponse.json({ error: "College not found" }, { status: 404 });
    }
    if (college.status !== "open") {
      return NextResponse.json({ error: "Market is already resolved" }, { status: 400 });
    }

    const { data: existingBets, error: betsError } = await supabase
      .from("bets")
      .select("side, amount")
      .eq("college_id", collegeId);

    if (betsError) {
      return NextResponse.json({ error: betsError.message }, { status: 500 });
    }

    const odds = computeOdds(college as College, (existingBets ?? []) as Pick<Bet, "side" | "amount">[]);
    const payout_rate = side === "yes" ? odds.noFraction : odds.yesFraction;

    const { error: deductError } = await supabase
      .from("players")
      .update({ balance: player.balance - amount })
      .eq("id", playerId)
      .eq("balance", player.balance);

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }

    const { data: bet, error: insertError } = await supabase
      .from("bets")
      .insert({
        college_id: collegeId,
        player_id: playerId,
        side,
        amount,
        payout_rate,
      })
      .select("*")
      .single();

    if (insertError) {
      // Refund on failure
      await supabase
        .from("players")
        .update({ balance: player.balance })
        .eq("id", playerId);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: updatedPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();

    return NextResponse.json({ bet, player: updatedPlayer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bet failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
