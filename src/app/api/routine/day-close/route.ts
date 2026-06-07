import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const closeDaySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  completions: z
    .array(
      z.object({
        habitId: z.string().uuid(),
        completed: z.boolean(),
      }),
    )
    .min(1, "At least one habit completion is required"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parse = closeDaySchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { date, completions } = parse.data;

  const { data: existingClosure, error: closureLookupError } = await supabase
    .from("routine_day_closures")
    .select("id")
    .eq("user_id", user.id)
    .eq("closure_date", date)
    .maybeSingle();

  if (closureLookupError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? closureLookupError.message
            : "Failed to close the day.",
      },
      { status: 500 },
    );
  }

  if (existingClosure) {
    return NextResponse.json(
      { ok: false, error: "This day has already been logged." },
      { status: 409 },
    );
  }

  const habitIds = completions.map((entry) => entry.habitId);
  const { data: habits, error: habitsError } = await supabase
    .from("routine_habits")
    .select("id")
    .eq("user_id", user.id)
    .in("id", habitIds);

  if (habitsError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" ? habitsError.message : "Failed to close the day.",
      },
      { status: 500 },
    );
  }

  const validIds = new Set((habits ?? []).map((habit) => habit.id));
  if (validIds.size !== habitIds.length) {
    return NextResponse.json({ ok: false, error: "One or more habits are invalid." }, { status: 400 });
  }

  const { error: insertCompletionsError } = await supabase.from("routine_habit_completions").insert(
    completions.map(({ habitId, completed }) => ({
      user_id: user.id,
      habit_id: habitId,
      completion_date: date,
      completed,
    })),
  );

  if (insertCompletionsError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? insertCompletionsError.message
            : "Failed to save habit completions.",
      },
      { status: 500 },
    );
  }

  const { error: insertClosureError } = await supabase.from("routine_day_closures").insert({
    user_id: user.id,
    closure_date: date,
  });

  if (insertClosureError) {
    await supabase
      .from("routine_habit_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("completion_date", date);

    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? insertClosureError.message
            : "Failed to close the day.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, date });
}
