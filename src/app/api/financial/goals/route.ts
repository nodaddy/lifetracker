import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

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
          goal_id: data.id,
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

  return NextResponse.json({ ok: true, goal: data });
}
