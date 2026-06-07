import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fetchUserGoalsForApi, GOAL_API_COLUMNS, GOAL_API_COLUMNS_LEGACY } from "@/lib/financial/goals";

const optionalGoalDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional(),
);

const assetAllocationSchema = z.object({
  assetId: z.string().uuid(),
  allocatedAmount: z.coerce.number().finite().nonnegative(),
});

const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Goal title is required").max(120, "Title is too long"),
  targetAmount: z.coerce.number().finite().positive("Target must be greater than 0"),
  targetDate: optionalGoalDate,
  notes: z.string().trim().max(500, "Notes are too long").optional(),
  assetAllocations: z.array(assetAllocationSchema).optional(),
});
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await fetchUserGoalsForApi(supabase, user.id);

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

  const { data: goalAssetLinks, error: linksError } = await supabase
    .from("financial_goal_assets")
    .select("goal_id,asset_id,allocated_amount")
    .eq("user_id", user.id);

  if (linksError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? linksError.message
            : "Failed to load goal asset links.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    goals: data ?? [],
    goalAssetLinks: goalAssetLinks ?? [],
  });
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

  let nextSortOrder = 0;
  const { data: firstGoal, error: orderError } = await supabase
    .from("financial_goals")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const supportsSortOrder = !orderError;
  if (supportsSortOrder) {
    nextSortOrder =
      firstGoal?.sort_order !== undefined && firstGoal.sort_order !== null
        ? Number(firstGoal.sort_order) - 1
        : 0;
  }

  const baseInsert = {
    user_id: user.id,
    title: payload.title,
    target_amount: payload.targetAmount,
    target_date: payload.targetDate ? payload.targetDate : null,
    notes: payload.notes?.trim() || null,
  };

  let goal:
    | {
        id: string;
        user_id: string;
        title: string;
        target_amount: number;
        current_amount: number;
        target_date: string | null;
        notes: string | null;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }
    | null = null;

  if (supportsSortOrder) {
    const sortedInsert = await supabase
      .from("financial_goals")
      .insert({ ...baseInsert, sort_order: nextSortOrder })
      .select(GOAL_API_COLUMNS)
      .single();

    if (!sortedInsert.error && sortedInsert.data) {
      goal = {
        ...sortedInsert.data,
        sort_order: Number(sortedInsert.data.sort_order ?? 0),
      };
    }
  }

  if (!goal) {
    const legacyInsert = await supabase
      .from("financial_goals")
      .insert(baseInsert)
      .select(GOAL_API_COLUMNS_LEGACY)
      .single();

    if (legacyInsert.error || !legacyInsert.data) {
      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === "development"
              ? legacyInsert.error?.message ?? "Failed to add goal."
              : "Failed to add goal. Check schema and policies.",
        },
        { status: 500 },
      );
    }

    goal = {
      ...legacyInsert.data,
      sort_order: 0,
    };
  }

  if (payload.assetAllocations && payload.assetAllocations.length > 0) {
    const { data: existingLinks, error: linksError } = await supabase
      .from("financial_goal_assets")
      .select("asset_id,allocated_amount")
      .eq("user_id", user.id);

    if (linksError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === "development"
              ? linksError.message
              : "Failed to validate asset allocations.",
        },
        { status: 500 },
      );
    }

    const { data: assetRows, error: assetsError } = await supabase
      .from("financial_assets")
      .select("id,current_value")
      .eq("user_id", user.id);

    if (assetsError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === "development"
              ? assetsError.message
              : "Failed to validate asset allocations.",
        },
        { status: 500 },
      );
    }

    const allocatedByAsset = new Map<string, number>();
    for (const link of existingLinks ?? []) {
      const current = allocatedByAsset.get(link.asset_id) ?? 0;
      allocatedByAsset.set(link.asset_id, current + Number(link.allocated_amount ?? 0));
    }

    for (const { assetId, allocatedAmount } of payload.assetAllocations) {
      const asset = (assetRows ?? []).find((item) => item.id === assetId);
      if (!asset) {
        return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 400 });
      }

      const totalAllocated = allocatedByAsset.get(assetId) ?? 0;
      const idle = Math.max(0, Number(asset.current_value) - totalAllocated);

      if (allocatedAmount > idle) {
        return NextResponse.json(
          {
            ok: false,
            error: `Cannot allocate ${allocatedAmount} — only ${idle} is unallocated for this asset.`,
          },
          { status: 400 },
        );
      }
    }

    const { error: linkError } = await supabase.from("financial_goal_assets").insert(
      payload.assetAllocations
        .filter(({ allocatedAmount }) => allocatedAmount > 0)
        .map(({ assetId, allocatedAmount }) => ({
          user_id: user.id,
          goal_id: goal.id,
          asset_id: assetId,
          allocated_amount: allocatedAmount,
        })),
    );

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

  return NextResponse.json({ ok: true, goal });
}
