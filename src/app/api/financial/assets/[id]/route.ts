import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const updateAssetSchema = z.object({
  name: z.string().trim().min(1, "Asset name is required").max(120, "Name is too long"),
  category: z.enum([
    "stocks",
    "mutual_funds",
    "crypto",
    "fixed_deposit",
    "real_estate",
    "gold",
    "cash",
    "other",
  ]),
  currentValue: z.coerce.number().finite().nonnegative(),
  notes: z.string().trim().max(500, "Notes are too long").optional(),
});

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

  const parse = updateAssetSchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { data: existingAsset, error: existingError } = await supabase
    .from("financial_assets")
    .select("id,user_id,name,category,current_value,goal_id,notes,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (existingError || !existingAsset) {
    return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
  }

  const payload = parse.data;
  const { data, error } = await supabase
    .from("financial_assets")
    .update({
      name: payload.name,
      category: payload.category,
      current_value: payload.currentValue,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,user_id,name,category,current_value,goal_id,notes,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" ? error.message : "Failed to update asset.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, asset: data });
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

  const { data: existingAsset, error: existingError } = await supabase
    .from("financial_assets")
    .select("id,user_id,name,category,current_value,goal_id,notes,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (existingError || !existingAsset) {
    return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("financial_assets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" ? error.message : "Failed to delete asset.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
