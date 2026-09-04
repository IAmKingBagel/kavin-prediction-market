import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ player: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
