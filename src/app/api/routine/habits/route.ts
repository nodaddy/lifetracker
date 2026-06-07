import { NextResponse } from "next/server";

import { HABIT_COLUMNS, habitInputSchema } from "@/lib/routine/habit-schema";
import {
  scheduleDaysForFrequency,
  type HabitFrequency,
  type HabitTimeOfDay,
} from "@/lib/routine/habits";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("routine_habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to load habits. Ensure routine_habits table exists.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, habits: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parse = habitInputSchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const payload = parse.data;
  const scheduleDays = scheduleDaysForFrequency(
    payload.frequency as HabitFrequency,
    payload.customDays ?? [],
  );

  const { data: lastHabit, error: orderError } = await supabase
    .from("routine_habits")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" ? orderError.message : "Failed to add habit.",
      },
      { status: 500 },
    );
  }

  const nextSortOrder = (lastHabit?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("routine_habits")
    .insert({
      user_id: user.id,
      name: payload.name,
      frequency: payload.frequency,
      schedule_days: scheduleDays,
      time_of_day: (payload.timeOfDay ?? "anytime") as HabitTimeOfDay,
      notes: payload.notes?.trim() || null,
      sort_order: nextSortOrder,
    })
    .select(HABIT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to add habit. Check schema and policies.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, habit: data });
}
