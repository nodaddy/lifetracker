import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const reorderGoalsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, "At least one goal id is required"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parse = reorderGoalsSchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const orderedIds = parse.data.orderedIds;

  const { data: existingGoals, error: fetchError } = await supabase
    .from("financial_goals")
    .select("id")
    .eq("user_id", user.id);

  if (fetchError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? fetchError.message
            : "Failed to reorder goals.",
      },
      { status: 500 },
    );
  }

  const existingIds = new Set((existingGoals ?? []).map((goal) => goal.id));
  if (orderedIds.length !== existingIds.size) {
    return NextResponse.json(
      { ok: false, error: "Ordered list must include every goal exactly once." },
      { status: 400 },
    );
  }

  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      return NextResponse.json({ ok: false, error: "Invalid goal in ordered list." }, { status: 400 });
    }
  }

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from("financial_goals")
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderedIds[index])
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === "development" ? error.message : "Failed to reorder goals.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
