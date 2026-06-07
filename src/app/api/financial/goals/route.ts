import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Goal title is required").max(120, "Title is too long"),
  targetAmount: z.coerce.number().finite().positive("Target must be greater than 0"),
  targetDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500, "Notes are too long").optional(),
  assetIds: z.array(z.string().uuid()).optional(),
});

const GOAL_COLUMNS =
  "id,user_id,title,target_amount,current_amount,target_date,notes,created_at,updated_at";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("financial_goals")
    .select(GOAL_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to load goals. Ensure financial_goals table exists.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, goals: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parse = createGoalSchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const payload = parse.data;
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({
      user_id: user.id,
      title: payload.title,
      target_amount: payload.targetAmount,
      target_date: payload.targetDate ? payload.targetDate : null,
      notes: payload.notes?.trim() || null,
    })
    .select(GOAL_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to add goal. Check schema and policies.",
      },
      { status: 500 },
    );
  }

  if (payload.assetIds && payload.assetIds.length > 0) {
    const { error: linkError } = await supabase
      .from("financial_assets")
      .update({ goal_id: data.id })
      .eq("user_id", user.id)
      .in("id", payload.assetIds);

    if (linkError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === "development"
              ? linkError.message
              : "Goal created but linking assets failed.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, goal: data });
}
