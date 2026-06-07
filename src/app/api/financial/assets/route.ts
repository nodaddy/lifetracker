import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createAssetSchema = z.object({
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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("financial_assets")
    .select("id,user_id,name,category,current_value,goal_id,notes,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to load assets. Ensure financial_assets table exists.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, assets: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parse = createAssetSchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const payload = parse.data;
  const { data, error } = await supabase
    .from("financial_assets")
    .insert({
      user_id: user.id,
      name: payload.name,
      category: payload.category,
      current_value: payload.currentValue,
      notes: payload.notes?.trim() || null,
    })
    .select("id,user_id,name,category,current_value,goal_id,notes,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to add asset. Check schema and policies.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, asset: data });
}
