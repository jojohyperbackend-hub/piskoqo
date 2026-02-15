import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { error, count } = await supabase
      .from("chats")
      .delete({ count: "exact" })
      .eq("user_id", user_id);

    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      deleted_rows: count || 0
    });

  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
