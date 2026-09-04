import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const trimmed = typeof name === "string" ? name.trim() : "";

    if (!trimmed || trimmed.length > 40) {
      return NextResponse.json(
        { error: "Name is required (max 40 characters)." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: existing, error: findError } = await supabase
      .from("players")
      .select("*")
      .eq("name", trimmed)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ player: existing, created: false });
    }

    const { data: created, error: createError } = await supabase
      .from("players")
      .insert({ name: trimmed, balance: 100 })
      .select("*")
      .single();

    if (createError) {
      // Race: another request created the same name
      if (createError.code === "23505") {
        const { data: raced } = await supabase
          .from("players")
          .select("*")
          .eq("name", trimmed)
          .single();
        return NextResponse.json({ player: raced, created: false });
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ player: created, created: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Join failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
