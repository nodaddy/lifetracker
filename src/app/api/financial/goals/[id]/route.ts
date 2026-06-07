import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const updateGoalSchema = z.object({
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

  const parse = updateGoalSchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const payload = parse.data;
  const { data, error } = await supabase
    .from("financial_goals")
    .update({
      title: payload.title,
      target_amount: payload.targetAmount,
      target_date: payload.targetDate ? payload.targetDate : null,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(GOAL_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" ? error.message : "Failed to update goal.",
      },
      { status: 500 },
    );
  }

  if (payload.assetIds) {
    const assetIds = payload.assetIds;

    // Unlink assets that were on this goal but are no longer selected.
    let unlinkQuery = supabase
      .from("financial_assets")
      .update({ goal_id: null })
      .eq("user_id", user.id)
      .eq("goal_id", id);

    if (assetIds.length > 0) {
      unlinkQuery = unlinkQuery.not("id", "in", `(${assetIds.join(",")})`);
    }

    const { error: unlinkError } = await unlinkQuery;

    if (unlinkError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === "development"
              ? unlinkError.message
              : "Goal updated but unlinking assets failed.",
        },
        { status: 500 },
      );
    }

    // Link the selected assets to this goal (reassigns from any other goal).
    if (assetIds.length > 0) {
      const { error: linkError } = await supabase
        .from("financial_assets")
        .update({ goal_id: id })
        .eq("user_id", user.id)
        .in("id", assetIds);

      if (linkError) {
        return NextResponse.json(
          {
            ok: false,
            error:
              process.env.NODE_ENV === "development"
                ? linkError.message
                : "Goal updated but linking assets failed.",
          },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ ok: true, goal: data });
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("financial_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" ? error.message : "Failed to delete goal.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
