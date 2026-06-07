import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const optionalGoalDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional(),
);

const allocationDeltaSchema = z.object({
  assetId: z.string().uuid(),
  delta: z.coerce.number().finite().refine((value) => value !== 0, "Delta cannot be zero"),
});

const updateGoalSchema = z.object({
  title: z.string().trim().min(1, "Goal title is required").max(120, "Title is too long"),
  targetAmount: z.coerce.number().finite().positive("Target must be greater than 0"),
  targetDate: optionalGoalDate,
  notes: z.string().trim().max(500, "Notes are too long").optional(),
  allocationDeltas: z.array(allocationDeltaSchema).optional(),
});

const GOAL_COLUMNS =
  "id,user_id,title,target_amount,current_amount,target_date,notes,sort_order,created_at,updated_at";

interface RouteProps {
  params: Promise<{ id: string }>;
}

function totalAllocatedForAsset(
  links: { goal_id: string; asset_id: string; allocated_amount: number }[],
  assetId: string,
) {
  return links
    .filter((link) => link.asset_id === assetId)
    .reduce((sum, link) => sum + Number(link.allocated_amount ?? 0), 0);
}

function allocationForGoalAsset(
  links: { goal_id: string; asset_id: string; allocated_amount: number }[],
  goalId: string,
  assetId: string,
) {
  const link = links.find((item) => item.goal_id === goalId && item.asset_id === assetId);
  return Number(link?.allocated_amount ?? 0);
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

  if (payload.allocationDeltas?.length) {
    const [{ data: allLinks, error: linksError }, { data: assetRows, error: assetsError }] =
      await Promise.all([
        supabase
          .from("financial_goal_assets")
          .select("id,goal_id,asset_id,allocated_amount")
          .eq("user_id", user.id),
        supabase.from("financial_assets").select("id,current_value").eq("user_id", user.id),
      ]);

    if (linksError || assetsError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === "development"
              ? linksError?.message ?? assetsError?.message ?? "Failed to load allocations."
              : "Goal updated but allocation changes failed.",
        },
        { status: 500 },
      );
    }

    const links = allLinks ?? [];
    const assets = assetRows ?? [];

    for (const { assetId, delta } of payload.allocationDeltas) {
      const asset = assets.find((item) => item.id === assetId);
      if (!asset) {
        return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 400 });
      }

      const currentGoalAllocation = allocationForGoalAsset(links, id, assetId);
      const totalAllocated = totalAllocatedForAsset(links, assetId);
      const idle = Math.max(0, Number(asset.current_value) - totalAllocated);

      if (delta > 0 && delta > idle) {
        return NextResponse.json(
          {
            ok: false,
            error: `Cannot add ${delta} — only ${idle} is unallocated for this asset.`,
          },
          { status: 400 },
        );
      }

      if (delta < 0 && Math.abs(delta) > currentGoalAllocation) {
        return NextResponse.json(
          {
            ok: false,
            error: `Cannot remove ${Math.abs(delta)} — only ${currentGoalAllocation} is allocated to this goal.`,
          },
          { status: 400 },
        );
      }

      const nextAllocation = Math.max(0, currentGoalAllocation + delta);
      const existingLink = links.find((item) => item.goal_id === id && item.asset_id === assetId);

      if (nextAllocation === 0) {
        if (existingLink) {
          const { error: deleteError } = await supabase
            .from("financial_goal_assets")
            .delete()
            .eq("id", existingLink.id)
            .eq("user_id", user.id);

          if (deleteError) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  process.env.NODE_ENV === "development"
                    ? deleteError.message
                    : "Goal updated but allocation changes failed.",
              },
              { status: 500 },
            );
          }

          const index = links.findIndex((item) => item.id === existingLink.id);
          if (index >= 0) {
            links.splice(index, 1);
          }
        }
        continue;
      }

      if (existingLink) {
        const { error: updateError } = await supabase
          .from("financial_goal_assets")
          .update({ allocated_amount: nextAllocation })
          .eq("id", existingLink.id)
          .eq("user_id", user.id);

        if (updateError) {
          return NextResponse.json(
            {
              ok: false,
              error:
                process.env.NODE_ENV === "development"
                  ? updateError.message
                  : "Goal updated but allocation changes failed.",
            },
            { status: 500 },
          );
        }

        existingLink.allocated_amount = nextAllocation;
      } else {
        const { data: insertedLink, error: insertError } = await supabase
          .from("financial_goal_assets")
          .insert({
            user_id: user.id,
            goal_id: id,
            asset_id: assetId,
            allocated_amount: nextAllocation,
          })
          .select("id,goal_id,asset_id,allocated_amount")
          .single();

        if (insertError || !insertedLink) {
          return NextResponse.json(
            {
              ok: false,
              error:
                process.env.NODE_ENV === "development"
                  ? insertError?.message ?? "Failed to link asset."
                  : "Goal updated but allocation changes failed.",
            },
            { status: 500 },
          );
        }

        links.push(insertedLink);
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
