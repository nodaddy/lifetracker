import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export const GOAL_API_COLUMNS =
  "id,user_id,title,target_amount,current_amount,target_date,notes,sort_order,created_at,updated_at";

export const GOAL_API_COLUMNS_LEGACY =
  "id,user_id,title,target_amount,current_amount,target_date,notes,created_at,updated_at";

export const GOAL_LIST_COLUMNS =
  "id,title,target_amount,current_amount,target_date,notes,sort_order,updated_at";

export const GOAL_LIST_COLUMNS_LEGACY =
  "id,title,target_amount,current_amount,target_date,notes,updated_at";

export type GoalListItem = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  notes: string | null;
  sort_order: number;
  updated_at: string;
};

type AppSupabase = SupabaseClient<Database>;

export async function fetchUserGoalsForList(supabase: AppSupabase, userId: string) {
  const withSort = await supabase
    .from("financial_goals")
    .select(GOAL_LIST_COLUMNS)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!withSort.error) {
    return {
      data: (withSort.data ?? []).map((goal) => ({
        ...goal,
        sort_order: Number(goal.sort_order ?? 0),
      })) as GoalListItem[],
      error: null,
    };
  }

  const legacy = await supabase
    .from("financial_goals")
    .select(GOAL_LIST_COLUMNS_LEGACY)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (legacy.error) {
    return { data: null, error: legacy.error };
  }

  return {
    data: (legacy.data ?? []).map((goal, index) => ({
      ...goal,
      sort_order: index,
    })) as GoalListItem[],
    error: null,
  };
}

export async function fetchUserGoalsForApi(supabase: AppSupabase, userId: string) {
  const withSort = await supabase
    .from("financial_goals")
    .select(GOAL_API_COLUMNS)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!withSort.error) {
    return {
      data: (withSort.data ?? []).map((goal) => ({
        ...goal,
        sort_order: Number(goal.sort_order ?? 0),
      })),
      error: null,
      supportsSortOrder: true,
    };
  }

  const legacy = await supabase
    .from("financial_goals")
    .select(GOAL_API_COLUMNS_LEGACY)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (legacy.error) {
    return { data: null, error: legacy.error, supportsSortOrder: false };
  }

  return {
    data: (legacy.data ?? []).map((goal, index) => ({
      ...goal,
      sort_order: index,
    })),
    error: null,
    supportsSortOrder: false,
  };
}
