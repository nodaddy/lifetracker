import { NextResponse } from "next/server";

import { HABIT_COLUMNS, habitInputSchema } from "@/lib/routine/habit-schema";
import {
  scheduleDaysForFrequency,
  type HabitFrequency,
  type HabitTimeOfDay,
} from "@/lib/routine/habits";
import { createClient } from "@/lib/supabase/server";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
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

  const { data, error } = await supabase
    .from("routine_habits")
    .update({
      name: payload.name,
      frequency: payload.frequency,
      schedule_days: scheduleDays,
      time_of_day: (payload.timeOfDay ?? "anytime") as HabitTimeOfDay,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(HABIT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" ? error.message : "Failed to update habit.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, habit: data });
}
