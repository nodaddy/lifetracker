"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export interface FinancialGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  notes: string | null;
  updated_at: string;
}

export interface GoalAssetLite {
  id: string;
  name: string;
  current_value: number;
}

export interface GoalAssetLink {
  goal_id: string;
  asset_id: string;
  allocated_amount: number;
}

interface GoalsManagerProps {
  initialGoals: FinancialGoal[];
  initialGoalAssetLinks?: GoalAssetLink[];
  assets: GoalAssetLite[];
  onAssetsChanged: () => void | Promise<void>;
}

const initialForm = {
  title: "",
  targetAmount: "",
  targetDate: "",
  notes: "",
  assetAllocations: {} as Record<string, string>,
};

type DeltaMode = "add" | "remove";

interface AssetDeltaInput {
  mode: DeltaMode;
  amount: string;
}

const GOAL_COMPLETE_GRADIENT = "linear-gradient(90deg, #0e7490, #0891b2, #22d3ee)";

function GoalCompleteBarShine() {
  return (
    <span
      className="goal-bar-complete-shine pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      aria-hidden="true"
    >
      <span className="goal-bar-complete-shine-beam" />
    </span>
  );
}

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function GoalCompleteBadge() {
  const gradientId = `goal-tick-${useId().replace(/:/g, "")}`;

  return (
    <span
      className="goal-complete-badge pointer-events-none absolute right-0 top-1/2 z-20 flex h-7 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
      aria-label="Complete"
      role="img"
    >
      <span className="goal-complete-badge-glow absolute inset-0 rounded-full" aria-hidden="true" />
      <span className="goal-complete-badge-inner absolute inset-[2px] rounded-full" aria-hidden="true" />
      <svg
        className="goal-complete-badge-icon relative h-[15px] w-[15px]"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="2" y1="8" x2="10" y2="3">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#bbf7d0" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d="M2.25 6.25 5 9 9.75 3.5"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function savedForGoal(goalId: string, goalAssetLinks: GoalAssetLink[]) {
  return goalAssetLinks
    .filter((link) => link.goal_id === goalId)
    .reduce((sum, link) => sum + Number(link.allocated_amount ?? 0), 0);
}

function allocationsForGoal(goalId: string, assets: GoalAssetLite[], goalAssetLinks: GoalAssetLink[]) {
  return goalAssetLinks
    .filter((link) => link.goal_id === goalId)
    .map((link) => {
      const asset = assets.find((item) => item.id === link.asset_id);
      return {
        assetId: link.asset_id,
        name: asset?.name ?? "Unknown asset",
        allocatedAmount: Number(link.allocated_amount ?? 0),
      };
    });
}

function totalAllocatedForAsset(assetId: string, goalAssetLinks: GoalAssetLink[]) {
  return goalAssetLinks
    .filter((link) => link.asset_id === assetId)
    .reduce((sum, link) => sum + Number(link.allocated_amount ?? 0), 0);
}

function idleForAsset(asset: GoalAssetLite, goalAssetLinks: GoalAssetLink[]) {
  return Math.max(0, Number(asset.current_value) - totalAllocatedForAsset(asset.id, goalAssetLinks));
}

function sumFormAllocations(allocations: Record<string, string>) {
  return Object.values(allocations).reduce(
    (sum, value) => sum + Math.max(0, Number(value || 0)),
    0,
  );
}

function deltaInputClass(mode: DeltaMode) {
  const base =
    "w-28 shrink-0 rounded-md border bg-white/5 px-2 py-1.5 text-right text-sm text-zinc-100 outline-none focus:ring-2";
  return mode === "remove"
    ? `${base} border-rose-400/80 focus:ring-rose-300/60`
    : `${base} border-emerald-400/80 focus:ring-emerald-300/60`;
}

function progressPercent(saved: number, target: number) {
  if (target <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (saved / target) * 100));
}

function goalDeadlineLabel(dateIso: string | null) {
  if (!dateIso) {
    return "No deadline";
  }
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error("Empty server response. Please try again.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Unexpected server response. Please try again.");
  }
}

export function GoalsManager({
  initialGoals = [],
  initialGoalAssetLinks = [],
  assets = [],
  onAssetsChanged,
}: GoalsManagerProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>(initialGoals);
  const [goalAssetLinks, setGoalAssetLinks] = useState<GoalAssetLink[]>(initialGoalAssetLinks);
  const [editBaselines, setEditBaselines] = useState<Record<string, number>>({});
  const [editAssetIds, setEditAssetIds] = useState<string[]>([]);
  const [assetDeltaInputs, setAssetDeltaInputs] = useState<Record<string, AssetDeltaInput>>({});
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const assetMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    void refreshGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshGoals() {
    try {
      const response = await fetch("/api/financial/goals");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        return;
      }
      setGoals(data.goals ?? []);
      setGoalAssetLinks(data.goalAssetLinks ?? []);
    } catch {
      // Non-blocking; keep existing goals if refresh fails.
    }
  }

  useEffect(() => {
    if (!assetMenuOpen) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      if (assetMenuRef.current && !assetMenuRef.current.contains(event.target as Node)) {
        setAssetMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [assetMenuOpen]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setEditBaselines({});
    setEditAssetIds([]);
    setAssetDeltaInputs({});
  }

  function openCreateEditor() {
    resetForm();
    setError(null);
    setAssetMenuOpen(false);
    setAssetSearch("");
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) {
      return;
    }
    setEditorOpen(false);
    setAssetMenuOpen(false);
    setAssetSearch("");
    setError(null);
  }

  function handleEditorBackdropMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || saving) {
      return;
    }
    closeEditor();
  }

  function startEditing(goal: FinancialGoal) {
    const baselines: Record<string, number> = {};
    const assetIds: string[] = [];
    const deltaInputs: Record<string, AssetDeltaInput> = {};

    goalAssetLinks
      .filter((link) => link.goal_id === goal.id)
      .forEach((link) => {
        const amount = Number(link.allocated_amount ?? 0);
        baselines[link.asset_id] = amount;
        assetIds.push(link.asset_id);
        deltaInputs[link.asset_id] = { mode: "add", amount: "" };
      });

    setEditingId(goal.id);
    setEditBaselines(baselines);
    setEditAssetIds(assetIds);
    setAssetDeltaInputs(deltaInputs);
    setForm({
      title: goal.title,
      targetAmount: String(goal.target_amount),
      targetDate: goal.target_date ?? "",
      notes: goal.notes ?? "",
      assetAllocations: {},
    });
    setError(null);
    setAssetMenuOpen(false);
    setAssetSearch("");
    setEditorOpen(true);
    setSelectedGoal(null);
  }

  function toggleAsset(assetId: string) {
    if (editingId) {
      setEditAssetIds((prev) => {
        if (prev.includes(assetId)) {
          return prev.filter((id) => id !== assetId);
        }
        return [...prev, assetId];
      });
      setAssetDeltaInputs((prev) => {
        if (prev[assetId]) {
          const next = { ...prev };
          delete next[assetId];
          return next;
        }
        return { ...prev, [assetId]: { mode: "add", amount: "" } };
      });
      return;
    }

    setForm((prev) => {
      if (prev.assetAllocations[assetId] !== undefined) {
        const nextAllocations = { ...prev.assetAllocations };
        delete nextAllocations[assetId];
        return { ...prev, assetAllocations: nextAllocations };
      }
      return {
        ...prev,
        assetAllocations: { ...prev.assetAllocations, [assetId]: "0" },
      };
    });
  }

  function setCreateAllocationInput(assetId: string, value: string) {
    setForm((prev) => ({
      ...prev,
      assetAllocations: { ...prev.assetAllocations, [assetId]: value },
    }));
  }

  function setDeltaMode(assetId: string, mode: DeltaMode) {
    setAssetDeltaInputs((prev) => ({
      ...prev,
      [assetId]: { mode, amount: prev[assetId]?.amount ?? "" },
    }));
  }

  function setDeltaAmount(assetId: string, amount: string) {
    setAssetDeltaInputs((prev) => ({
      ...prev,
      [assetId]: { mode: prev[assetId]?.mode ?? "add", amount },
    }));
  }

  async function handleCreateOrUpdate() {
    if (!form.title.trim()) {
      setError("Goal title is required.");
      return;
    }
    if (!form.targetAmount || Number(form.targetAmount) <= 0) {
      setError("Target amount must be greater than 0.");
      return;
    }

    if (!editingId) {
      for (const [assetId, value] of Object.entries(form.assetAllocations)) {
        const amount = Math.max(0, Number(value || 0));
        if (amount <= 0) {
          continue;
        }
        const asset = assets.find((item) => item.id === assetId);
        if (!asset) {
          setError("Selected asset not found.");
          return;
        }
        if (amount > idleForAsset(asset, goalAssetLinks)) {
          setError(
            `Cannot allocate ${formatCurrency(amount)} from ${asset.name} — only ${formatCurrency(idleForAsset(asset, goalAssetLinks))} is unallocated.`,
          );
          return;
        }
      }
    } else {
      for (const assetId of editAssetIds) {
        const deltaInput = assetDeltaInputs[assetId];
        const amount = Number(deltaInput?.amount || 0);
        if (!amount || amount <= 0) {
          continue;
        }
        const asset = assets.find((item) => item.id === assetId);
        if (!asset) {
          setError("Selected asset not found.");
          return;
        }
        const currentAllocation = editBaselines[assetId] ?? 0;
        if (deltaInput.mode === "add" && amount > idleForAsset(asset, goalAssetLinks)) {
          setError(
            `Cannot add ${formatCurrency(amount)} from ${asset.name} — only ${formatCurrency(idleForAsset(asset, goalAssetLinks))} is unallocated.`,
          );
          return;
        }
        if (deltaInput.mode === "remove" && amount > currentAllocation) {
          setError(
            `Cannot remove ${formatCurrency(amount)} from ${asset.name} — only ${formatCurrency(currentAllocation)} is allocated to this goal.`,
          );
          return;
        }
      }
    }

    setSaving(true);
    setError(null);

    const payload = editingId
      ? {
          title: form.title.trim(),
          targetAmount: Number(form.targetAmount),
          targetDate: form.targetDate.trim(),
          notes: form.notes.trim() || "",
          allocationDeltas: [
            ...Object.entries(assetDeltaInputs).flatMap(([assetId, deltaInput]) => {
              const amount = Number(deltaInput.amount || 0);
              if (!amount || amount <= 0) {
                return [];
              }
              return [
                {
                  assetId,
                  delta: deltaInput.mode === "add" ? amount : -amount,
                },
              ];
            }),
            ...Object.entries(editBaselines).flatMap(([assetId, baseline]) => {
              if (baseline <= 0 || editAssetIds.includes(assetId)) {
                return [];
              }
              return [{ assetId, delta: -baseline }];
            }),
          ],
        }
      : {
          title: form.title.trim(),
          targetAmount: Number(form.targetAmount),
          targetDate: form.targetDate.trim(),
          notes: form.notes.trim() || "",
          assetAllocations: Object.entries(form.assetAllocations).map(([assetId, amount]) => ({
            assetId,
            allocatedAmount: Math.max(0, Number(amount || 0)),
          })),
        };

    const endpoint = editingId
      ? `/api/financial/goals/${editingId}`
      : "/api/financial/goals";
    const method = editingId ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse<{
        ok: boolean;
        error?: string;
        goal?: FinancialGoal;
      }>(response);

      if (!response.ok || !data.ok || !data.goal) {
        throw new Error(data.error ?? "Failed to save goal.");
      }

      setGoals((prev) =>
        editingId
          ? prev.map((goal) => (goal.id === data.goal!.id ? data.goal! : goal))
          : [data.goal!, ...prev],
      );

      toast.success(editingId ? "Goal updated." : "Goal added.");

      try {
        await onAssetsChanged();
      } catch {
        // Goal saved; asset refresh failing should not block success UX.
      }
      void refreshGoals();

      resetForm();
      setEditorOpen(false);
      setAssetMenuOpen(false);
      setAssetSearch("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save goal.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: string) {
    const confirmed = window.confirm("Delete this goal?");
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/financial/goals/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to delete goal.");
      }

      setGoals((prev) => prev.filter((goal) => goal.id !== id));
      if (selectedGoal?.id === id) {
        setSelectedGoal(null);
      }
      await onAssetsChanged();
      toast.success("Goal deleted.");
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Failed to delete goal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Goals</h2>
        </div>
        <Button variant="outline" size="sm" onClick={openCreateEditor} disabled={saving}>
          + Add goal
        </Button>
      </div>

      <div className="mt-4 space-y-2 pr-4">
        {goals.filter(Boolean).map((goal) => {
          const saved = savedForGoal(goal.id, goalAssetLinks);
          const pct = progressPercent(saved, goal.target_amount);
          const done = pct >= 100;
          return (
            <button
              key={goal.id}
              type="button"
              className={`relative h-6 w-full rounded-full text-left transition-opacity duration-150 hover:opacity-90 ${
                done ? "goal-bar-complete-track overflow-visible" : "overflow-hidden bg-white/10"
              }`}
              onClick={() => setSelectedGoal(goal)}
            >
              <span
                className={`absolute inset-y-0 left-0 rounded-full ${done ? "inset-x-0" : ""}`}
                style={
                  done
                    ? { background: GOAL_COMPLETE_GRADIENT }
                    : {
                        width: `${pct}%`,
                        background:
                          "linear-gradient(90deg, #ff3ea5, #a855f7,rgb(36, 199, 211))",
                      }
                }
              />
              {done ? <GoalCompleteBarShine /> : null}
              {done ? <GoalCompleteBadge /> : null}
              <span
                className={`relative z-10 flex h-full items-center px-3.5 text-xs ${
                  done ? "goal-bar-complete-text pr-5" : "justify-between gap-3"
                }`}
              >
                <span
                  className={`min-w-0 flex-1 truncate text-left font-medium ${
                    done ? "goal-bar-complete-text" : "text-zinc-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  {goal.title}
                </span>
                {!done ? (
                  <span
                    className="shrink-0 text-xs text-zinc-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                    suppressHydrationWarning
                  >
                    {goalDeadlineLabel(goal.target_date)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
        {!goals.filter(Boolean).length ? (
          <p className="text-sm text-zinc-400">
            No goals yet. Create your first financial goal to start tracking progress.
          </p>
        ) : null}
      </div>

      {mounted && selectedGoal
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 px-4"
              onClick={() => setSelectedGoal(null)}
            >
              <div
                className="retro-panel w-full max-w-sm p-4"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 className="text-base font-semibold text-zinc-100">{selectedGoal.title}</h3>
                {(() => {
                  const detailSaved = savedForGoal(selectedGoal.id, goalAssetLinks);
                  const detailPct = progressPercent(detailSaved, selectedGoal.target_amount);
                  const detailDone = detailPct >= 100;
                  return (
                    <div
                      className={`relative mt-3 h-2 w-full overflow-hidden rounded-full ${
                        detailDone ? "goal-bar-complete-track" : "bg-white/10"
                      }`}
                    >
                      {detailDone ? (
                        <>
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{ background: GOAL_COMPLETE_GRADIENT }}
                          />
                          <GoalCompleteBarShine />
                        </>
                      ) : (
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${detailPct}%`,
                            background: "linear-gradient(90deg, #ff3ea5, #a855f7, #2ef2ff)",
                          }}
                        />
                      )}
                    </div>
                  );
                })()}
                <div className="mt-3 space-y-1 text-sm text-zinc-300">
                  <p suppressHydrationWarning>
                    Progress: {formatCurrency(savedForGoal(selectedGoal.id, goalAssetLinks))} of{" "}
                    {formatCurrency(selectedGoal.target_amount)} (
                    {progressPercent(
                      savedForGoal(selectedGoal.id, goalAssetLinks),
                      selectedGoal.target_amount,
                    ).toFixed(0)}
                    %)
                  </p>
                  {selectedGoal.target_date ? (
                    <p>Target date: {formatDate(selectedGoal.target_date)}</p>
                  ) : null}
                </div>
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Linked assets</p>
                  {allocationsForGoal(selectedGoal.id, assets, goalAssetLinks).length ? (
                    <ul className="mt-1 space-y-1 text-sm text-zinc-300">
                      {allocationsForGoal(selectedGoal.id, assets, goalAssetLinks).map((item) => (
                        <li key={item.assetId} className="flex justify-between gap-3">
                          <span>{item.name}</span>
                          <span className="text-cyan-200" suppressHydrationWarning>
                            {formatCurrency(item.allocatedAmount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-400">No assets linked yet.</p>
                  )}
                </div>
                {selectedGoal.notes ? (
                  <p className="mt-3 text-sm text-zinc-300">{selectedGoal.notes}</p>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedGoal(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(selectedGoal)}
                    disabled={saving}
                  >
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => deleteGoal(selectedGoal.id)} disabled={saving}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
                  {editingId ? "Update Goal" : "Add Goal"}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    className="rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300 sm:col-span-2"
                    placeholder="Goal title (e.g. Emergency fund, New car)"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
                    placeholder="Target amount"
                    value={form.targetAmount}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, targetAmount: event.target.value }))
                    }
                  />
                  <input
                    type="date"
                    className="rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300 [color-scheme:dark]"
                    value={form.targetDate}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, targetDate: event.target.value }))
                    }
                  />
                </div>

                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Assets funding this goal
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {editingId
                      ? "Add or remove amounts from linked assets. Changes apply as deltas to this goal's allocation."
                      : "Assign unallocated amounts from each asset. Amounts in brackets show what is not assigned to any goal."}
                  </p>
                  {(() => {
                    const selectedAssetIds = editingId
                      ? editAssetIds
                      : Object.keys(form.assetAllocations);
                    const selectedAssets = assets.filter((asset) =>
                      selectedAssetIds.includes(asset.id),
                    );
                    const filteredAssets = assets.filter((asset) =>
                      asset.name.toLowerCase().includes(assetSearch.trim().toLowerCase()),
                    );
                    const previewSaved = editingId
                      ? selectedAssets.reduce((sum, asset) => {
                          const baseline = editBaselines[asset.id] ?? 0;
                          const deltaInput = assetDeltaInputs[asset.id];
                          const amount = Number(deltaInput?.amount || 0);
                          if (!amount || amount <= 0) {
                            return sum + baseline;
                          }
                          const delta = deltaInput.mode === "add" ? amount : -amount;
                          return sum + Math.max(0, baseline + delta);
                        }, 0)
                      : sumFormAllocations(form.assetAllocations);
                    return (
                      <div className="relative mt-2" ref={assetMenuRef}>
                        <button
                          type="button"
                          onClick={() => setAssetMenuOpen((open) => !open)}
                          className="select-premium flex w-full items-center justify-between gap-2 text-left"
                        >
                          <span className="flex flex-1 flex-wrap items-center gap-1">
                            {selectedAssets.length === 0 ? (
                              <span className="text-zinc-400">Select assets…</span>
                            ) : (
                              selectedAssets.map((asset) => (
                                <span
                                  key={asset.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-300/15 px-2 py-0.5 text-xs text-cyan-100"
                                >
                                  {asset.name}
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Remove ${asset.name}`}
                                    className="cursor-pointer text-cyan-300/80 hover:text-white"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleAsset(asset.id);
                                    }}
                                  >
                                    ×
                                  </span>
                                </span>
                              ))
                            )}
                          </span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            className={`shrink-0 text-zinc-300 transition-transform ${
                              assetMenuOpen ? "rotate-180" : ""
                            }`}
                          >
                            <path
                              d="M6 9l6 6 6-6"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        {assetMenuOpen ? (
                          <div className="mt-2 overflow-hidden rounded-xl border border-white/15 bg-[#140f2a] shadow-[0_18px_40px_rgba(4,3,10,0.55)]">
                            <div className="border-b border-white/10 p-2">
                              <input
                                autoFocus
                                value={assetSearch}
                                onChange={(event) => setAssetSearch(event.target.value)}
                                placeholder="Search assets…"
                                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                              {filteredAssets.map((asset) => {
                                const checked = editingId
                                  ? editAssetIds.includes(asset.id)
                                  : form.assetAllocations[asset.id] !== undefined;
                                const idle = idleForAsset(asset, goalAssetLinks);
                                return (
                                  <button
                                    type="button"
                                    key={asset.id}
                                    onClick={() => toggleAsset(asset.id)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                                      checked ? "bg-cyan-300/10" : "hover:bg-white/10"
                                    }`}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                                          checked
                                            ? "border-cyan-300 bg-cyan-300/30 text-cyan-100"
                                            : "border-white/25 text-transparent"
                                        }`}
                                      >
                                        ✓
                                      </span>
                                      <span className="truncate text-zinc-100">
                                        {asset.name}
                                        <span className="text-zinc-400" suppressHydrationWarning>
                                          {" "}
                                          ({formatCurrency(idle)} idle)
                                        </span>
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-cyan-200" suppressHydrationWarning>
                                      {formatCurrency(asset.current_value)}
                                    </span>
                                  </button>
                                );
                              })}
                              {!assets.length ? (
                                <p className="px-2.5 py-3 text-sm text-zinc-400">
                                  No assets yet. Add assets first.
                                </p>
                              ) : !filteredAssets.length ? (
                                <p className="px-2.5 py-3 text-sm text-zinc-400">
                                  No assets match “{assetSearch}”.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {selectedAssets.length ? (
                          <div className="mt-3 space-y-2">
                            {selectedAssets.map((asset) => {
                              const idle = idleForAsset(asset, goalAssetLinks);
                              const currentAllocation = editingId
                                ? editBaselines[asset.id] ?? 0
                                : 0;
                              const deltaInput = assetDeltaInputs[asset.id] ?? {
                                mode: "add" as DeltaMode,
                                amount: "",
                              };

                              if (editingId) {
                                return (
                                  <div
                                    key={asset.id}
                                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm text-zinc-100">{asset.name}</p>
                                        <p className="mt-0.5 text-xs text-zinc-400" suppressHydrationWarning>
                                          Allocated to this goal: {formatCurrency(currentAllocation)}
                                        </p>
                                      </div>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Remove ${asset.name}`}
                                        className="cursor-pointer text-zinc-500 hover:text-zinc-200"
                                        onClick={() => toggleAsset(asset.id)}
                                      >
                                        ×
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <div className="flex overflow-hidden rounded-md border border-white/10">
                                        <button
                                          type="button"
                                          className={`px-2.5 py-1 text-xs ${
                                            deltaInput.mode === "add"
                                              ? "bg-emerald-500/20 text-emerald-200"
                                              : "text-zinc-400 hover:bg-white/5"
                                          }`}
                                          onClick={() => setDeltaMode(asset.id, "add")}
                                          disabled={saving}
                                        >
                                          Add
                                        </button>
                                        <button
                                          type="button"
                                          className={`px-2.5 py-1 text-xs ${
                                            deltaInput.mode === "remove"
                                              ? "bg-rose-500/20 text-rose-200"
                                              : "text-zinc-400 hover:bg-white/5"
                                          }`}
                                          onClick={() => setDeltaMode(asset.id, "remove")}
                                          disabled={saving}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                      <input
                                        type="number"
                                        min={0}
                                        step="1"
                                        inputMode="numeric"
                                        className={deltaInputClass(deltaInput.mode)}
                                        value={deltaInput.amount}
                                        onChange={(event) =>
                                          setDeltaAmount(asset.id, event.target.value)
                                        }
                                        disabled={saving}
                                        placeholder="Amount"
                                        aria-label={`${deltaInput.mode} amount for ${asset.name}`}
                                      />
                                      <span className="text-xs text-zinc-500" suppressHydrationWarning>
                                        {deltaInput.mode === "add"
                                          ? `${formatCurrency(idle)} idle`
                                          : `max ${formatCurrency(currentAllocation)}`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={asset.id}
                                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-zinc-100">
                                      {asset.name}{" "}
                                      <span className="text-zinc-400" suppressHydrationWarning>
                                        ({formatCurrency(idle)} idle)
                                      </span>
                                    </p>
                                  </div>
                                  <input
                                    type="number"
                                    min={0}
                                    step="1"
                                    inputMode="numeric"
                                    className="w-28 shrink-0 rounded-md border border-purple-300/40 bg-white/5 px-2 py-1.5 text-right text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-300"
                                    value={form.assetAllocations[asset.id] ?? "0"}
                                    onChange={(event) =>
                                      setCreateAllocationInput(asset.id, event.target.value)
                                    }
                                    disabled={saving}
                                    aria-label={`Amount allocated from ${asset.name}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {selectedAssets.length ? (
                          <p className="mt-2 text-sm text-zinc-300" suppressHydrationWarning>
                            Saved so far:{" "}
                            <span className="font-semibold text-cyan-200">
                              {formatCurrency(previewSaved)}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>

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
