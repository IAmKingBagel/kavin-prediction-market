import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function assertAdmin(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  const expected = process.env.ADMIN_PIN;
  return Boolean(expected && pin === expected);
}

export async function POST(req: NextRequest) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body.id ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    const name = String(body.name ?? "").trim();
    const seedYes = Number(body.seed_yes ?? 50);

    if (!id || !name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }
    if (!Number.isInteger(seedYes) || seedYes < 0 || seedYes > 100) {
      return NextResponse.json(
        { error: "seed_yes must be an integer 0–100" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("colleges")
      .insert({
        id,
        name,
        status: "open",
        seed_yes: seedYes,
        seed_no: 100 - seedYes,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ college: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = body.id as string;
    const seedYes = Number(body.seed_yes);

    if (!id || !Number.isInteger(seedYes) || seedYes < 0 || seedYes > 100) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("colleges")
      .update({ seed_yes: seedYes, seed_no: 100 - seedYes })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ college: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("colleges").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
