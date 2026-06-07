import { z } from "zod";

import { isValidScheduleDay } from "@/lib/routine/habits";

export const habitInputSchema = z
  .object({
    name: z.string().trim().min(1, "Habit name is required").max(120, "Name is too long"),
    frequency: z.enum(["daily", "weekdays", "weekends", "custom"]),
    customDays: z.array(z.coerce.number().int()).optional(),
    timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]).optional(),
    notes: z.string().trim().max(500, "Notes are too long").optional(),
  })
  .superRefine((value, context) => {
    if (value.frequency !== "custom") {
      return;
    }

    const customDays = value.customDays ?? [];
    if (!customDays.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one day for a custom schedule.",
        path: ["customDays"],
      });
      return;
    }

    if (customDays.some((day) => !isValidScheduleDay(day))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom days must be valid weekdays.",
        path: ["customDays"],
      });
    }
  });

export const HABIT_COLUMNS =
  "id,user_id,name,frequency,schedule_days,time_of_day,notes,sort_order,created_at,updated_at";
