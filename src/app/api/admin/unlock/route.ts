import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const expected = process.env.ADMIN_PIN;

  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PIN is not set in .env.local" },
      { status: 500 }
    );
  }

  if (typeof pin !== "string" || pin !== expected) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
