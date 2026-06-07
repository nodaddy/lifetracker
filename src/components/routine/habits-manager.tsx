"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  clearDayyCooldown,
  DAYY_COOLDOWN_MS,
  frequencyLabel,
  getLocalDateString,
  HABIT_FREQUENCY_OPTIONS,
  HABIT_TIME_OPTIONS,
  isDayyOnCooldown,
  readDayyCooldownUntil,
  ROUTINE_DRAFT_STORAGE_KEY,
  timeOfDayLabel,
  WEEKDAY_OPTIONS,
  writeDayyCooldownUntil,
  type HabitFrequency,
  type HabitTimeOfDay,
} from "@/lib/routine/habits";

export type RoutineHabit = {
  id: string;
  name: string;
  frequency: HabitFrequency;
  schedule_days: number[];
  time_of_day: HabitTimeOfDay;
  notes: string | null;
  sort_order: number;
  updated_at: string;
};

const initialForm = {
  name: "",
  frequency: "daily" as HabitFrequency,
  customDays: [1, 2, 3, 4, 5] as number[],
  timeOfDay: "anytime" as HabitTimeOfDay,
  notes: "",
};

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function habitToForm(habit: RoutineHabit) {
  return {
    name: habit.name,
    frequency: habit.frequency,
    customDays:
      habit.frequency === "custom" ? [...habit.schedule_days] : [...initialForm.customDays],
    timeOfDay: habit.time_of_day,
    notes: habit.notes ?? "",
  };
}

function readDraft() {
  if (typeof window === "undefined") {
    return {} as Record<string, boolean>;
  }

  try {
    const raw = window.localStorage.getItem(ROUTINE_DRAFT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDraft(checkedHabits: Record<string, boolean>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ROUTINE_DRAFT_STORAGE_KEY, JSON.stringify(checkedHabits));
}

function clearDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ROUTINE_DRAFT_STORAGE_KEY);
}

interface HabitsManagerProps {
  initialHabits: RoutineHabit[];
}

export function HabitsManager({ initialHabits }: HabitsManagerProps) {
  const [habits, setHabits] = useState<RoutineHabit[]>(initialHabits);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [dayyAvailableAt, setDayyAvailableAt] = useState<number | null>(null);
  const [checkedHabits, setCheckedHabits] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const dayyOnCooldown = isDayyOnCooldown(dayyAvailableAt);

  useEffect(() => {
    setMounted(true);
    setCheckedHabits(readDraft());
    setDayyAvailableAt(readDayyCooldownUntil());
  }, []);

  useEffect(() => {
    if (!dayyAvailableAt || dayyAvailableAt <= Date.now()) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearDayyCooldown();
      setDayyAvailableAt(null);
    }, dayyAvailableAt - Date.now());

    return () => window.clearTimeout(timer);
  }, [dayyAvailableAt]);

  function openCreateEditor() {
    setEditingId(null);
    setForm(initialForm);
    setError(null);
    setEditorOpen(true);
  }

  function openEditEditor(habit: RoutineHabit) {
    setEditingId(habit.id);
    setForm(habitToForm(habit));
    setError(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) {
      return;
    }
    setEditorOpen(false);
    setEditingId(null);
    setError(null);
  }

  function handleEditorBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeEditor();
    }
  }

  function toggleCustomDay(day: number) {
    setForm((prev) => {
      const hasDay = prev.customDays.includes(day);
      const customDays = hasDay
        ? prev.customDays.filter((value) => value !== day)
        : [...prev.customDays, day].sort((a, b) => a - b);

      return { ...prev, customDays };
    });
  }

  function toggleHabitChecked(habitId: string, checked: boolean) {
    setCheckedHabits((prev) => {
      const next = { ...prev, [habitId]: checked };
      writeDraft(next);
      return next;
    });
  }

  async function handleCloseDay() {
    if (dayyOnCooldown || closingDay || !habits.length) {
      return;
    }

    setClosingDay(true);

    try {
      const response = await fetch("/api/routine/day-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getLocalDateString(),
          completions: habits.map((habit) => ({
            habitId: habit.id,
            completed: Boolean(checkedHabits[habit.id]),
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to close the day.");
      }

      const availableAt = Date.now() + DAYY_COOLDOWN_MS;
      writeDayyCooldownUntil(availableAt);
      setDayyAvailableAt(availableAt);
      setCheckedHabits({});
      clearDraft();
      toast.success("Day logged. Checkboxes reset.");
    } catch (requestError) {
      toast.error(
        requestError instanceof Error ? requestError.message : "Failed to close the day.",
      );
    } finally {
      setClosingDay(false);
    }
  }

  async function handleCreateOrUpdate() {
    if (!form.name.trim()) {
      setError("Habit name is required.");
      return;
    }

    if (form.frequency === "custom" && !form.customDays.length) {
      setError("Select at least one day for a custom schedule.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      frequency: form.frequency,
      customDays: form.frequency === "custom" ? form.customDays : undefined,
      timeOfDay: form.timeOfDay,
      notes: form.notes.trim() || undefined,
    };

    try {
      const response = await fetch(
        editingId ? `/api/routine/habits/${editingId}` : "/api/routine/habits",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? `Failed to ${editingId ? "update" : "add"} habit.`);
      }

      if (editingId) {
        setHabits((prev) => prev.map((habit) => (habit.id === editingId ? data.habit : habit)));
        toast.success("Habit updated.");
      } else {
        setHabits((prev) => [...prev, data.habit]);
        toast.success("Habit added.");
      }

      setEditorOpen(false);
      setEditingId(null);
      setForm(initialForm);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : `Failed to ${editingId ? "update" : "add"} habit.`;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const completedCount = habits.filter((habit) => checkedHabits[habit.id]).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="neon-title text-3xl font-semibold">Daily Routine</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleCloseDay()}
          disabled={dayyOnCooldown || closingDay || !habits.length}
        >
          {closingDay ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Saving…
            </span>
          ) : (
            "Dayy!"
          )}
        </Button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          {completedCount}/{habits.length} Done
        </h2>
        <Button variant="outline" size="sm" onClick={openCreateEditor} disabled={saving || closingDay}>
          + Add habit
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {habits.map((habit) => {
          const checked = Boolean(checkedHabits[habit.id]);

          return (
            <div
              key={habit.id}
              className={`retro-panel flex items-center gap-3 rounded-xl px-4 py-3 ${
                checked ? "border-cyan-300/20" : ""
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left transition-opacity duration-150 hover:opacity-90"
                onClick={() => openEditEditor(habit)}
              >
                <p
                  className={`truncate font-medium ${
                    checked ? "text-zinc-400 line-through" : "text-zinc-100"
                  }`}
                >
                  {habit.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {frequencyLabel(habit.frequency, habit.schedule_days)} ·{" "}
                  {timeOfDayLabel(habit.time_of_day)}
                </p>
                {habit.notes ? (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{habit.notes}</p>
                ) : null}
              </button>

              <label
                className="habit-done-checkbox"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={closingDay}
                  onChange={(event) => toggleHabitChecked(habit.id, event.target.checked)}
                  aria-label={`Mark ${habit.name} as done today`}
                />
                <span className="habit-done-checkbox-box" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.25 6.25 5 9 9.75 3.5"
                      stroke="#ecfeff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </label>
            </div>
          );
        })}

        {!habits.length ? (
          <p className="text-sm text-zinc-400">
            No habits yet. Add your first habit to start building your routine.
          </p>
        ) : null}
      </div>

      {mounted && editorOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 px-4"
              onMouseDown={handleEditorBackdropMouseDown}
            >
              <form
                className="retro-panel max-h-[88vh] w-full max-w-lg overflow-y-auto p-4 sm:p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!saving) {
                    void handleCreateOrUpdate();
                  }
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-zinc-100">
                  {editingId ? "Update Habit" : "Add Habit"}
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    className="rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300 sm:col-span-2"
                    placeholder="Habit name (e.g. Morning workout, Read 20 min)"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />

                  <div className="select-shell">
                    <select
                      className="select-premium text-sm"
                      value={form.frequency}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          frequency: event.target.value as HabitFrequency,
                        }))
                      }
                    >
                      {HABIT_FREQUENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="select-shell">
                    <select
                      className="select-premium text-sm"
                      value={form.timeOfDay}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          timeOfDay: event.target.value as HabitTimeOfDay,
                        }))
                      }
                    >
                      {HABIT_TIME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {form.frequency === "custom" ? (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Custom days</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const selected = form.customDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                              selected
                                ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100"
                                : "border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
                            }`}
                            onClick={() => toggleCustomDay(day.value)}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <textarea
                  className="mt-3 min-h-24 w-full rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />

                {error ? (
                  <p className="mt-2 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {error}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={closeEditor} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <Spinner />
                        {editingId ? "Saving…" : "Adding…"}
                      </span>
                    ) : editingId ? (
                      "Update"
                    ) : (
                      "Add"
                    )}
                  </Button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
