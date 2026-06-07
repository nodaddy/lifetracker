import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "A valid date is required." }, { status: 400 });
  }

  const [{ data: closure, error: closureError }, { data: completions, error: completionsError }] =
    await Promise.all([
      supabase
        .from("routine_day_closures")
        .select("id,closure_date")
        .eq("user_id", user.id)
        .eq("closure_date", date)
        .maybeSingle(),
      supabase
        .from("routine_habit_completions")
        .select("habit_id,completed")
        .eq("user_id", user.id)
        .eq("completion_date", date),
    ]);

  if (closureError || completionsError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? closureError?.message ?? completionsError?.message ?? "Failed to load day status."
            : "Failed to load day status.",
      },
      { status: 500 },
    );
  }

  const completionMap: Record<string, boolean> = {};
  for (const entry of completions ?? []) {
    completionMap[entry.habit_id] = entry.completed;
  }

  return NextResponse.json({
    ok: true,
    date,
    closed: Boolean(closure),
    completions: completionMap,
  });
}
