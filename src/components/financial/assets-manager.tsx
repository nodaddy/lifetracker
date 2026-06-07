"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { FinancialInsights } from "@/components/financial/financial-insights";
import { GoalsManager, type FinancialGoal, type GoalAssetLink } from "@/components/financial/goals-manager";
import { Button } from "@/components/ui/button";

type AssetCategory =
  | "stocks"
  | "mutual_funds"
  | "crypto"
  | "fixed_deposit"
  | "real_estate"
  | "gold"
  | "cash"
  | "other";

interface FinancialAsset {
  id: string;
  name: string;
  category: string;
  current_value: number;
  goal_id: string | null;
  notes: string | null;
  updated_at: string;
}

interface AssetsManagerProps {
  initialAssets: FinancialAsset[];
  initialSnapshots: PortfolioSnapshot[];
  initialEvents: AssetEvent[];
  initialGoals: FinancialGoal[];
  initialGoalAssetLinks?: GoalAssetLink[];
}

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: "stocks", label: "Stocks" },
  { value: "mutual_funds", label: "Mutual Funds" },
  { value: "crypto", label: "Crypto" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "real_estate", label: "Real Estate" },
  { value: "gold", label: "Gold" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function normalizeCategory(value: string): AssetCategory {
  const exists = CATEGORY_OPTIONS.some((option) => option.value === value);
  return exists ? (value as AssetCategory) : "other";
}

const initialForm = {
  name: "",
  category: "stocks" as AssetCategory,
  currentValue: "",
  notes: "",
};

interface PortfolioSnapshot {
  snapshot_date: string;
  total_current_value: number;
}

interface AssetEvent {
  action: "create" | "update" | "delete";
  created_at: string;
}

function formatCurrency(value: number, fractionDigits = 2) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
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

function AssetTag({
  asset,
  onSelect,
}: {
  asset: FinancialAsset;
  onSelect: (asset: FinancialAsset) => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-3 rounded-full border border-cyan-300/40 bg-white/5 px-4 py-1.5 text-xs transition-colors duration-150 hover:bg-white/10"
      onClick={() => onSelect(asset)}
    >
      <span className="font-medium text-zinc-100">{asset.name}</span>
      <span className="font-semibold text-cyan-200" suppressHydrationWarning>
        {formatCurrency(asset.current_value, 0)}
      </span>
    </button>
  );
}

function AssetListIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function AssetMarquee({
  assets,
  onSelect,
  onListSelect,
  onAdd,
  addDisabled,
}: {
  assets: FinancialAsset[];
  onSelect: (asset: FinancialAsset) => void;
  onListSelect: (asset: FinancialAsset) => void;
  onAdd: () => void;
  addDisabled?: boolean;
}) {
  const marqueeAssets = assets.length ? [...assets, ...assets] : [];
  const [listOpen, setListOpen] = useState(false);
  const listMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listOpen) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
        setListOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [listOpen]);

  return (
    <div className="asset-marquee relative left-1/2 h-11 w-screen -translate-x-1/2 border-b border-white/5 bg-[#080513]/80 backdrop-blur-sm">
      <div className="asset-marquee-scroll absolute inset-0 overflow-hidden">
        {marqueeAssets.length ? (
          <div className="asset-marquee-track flex h-full w-max items-center gap-2 pl-4">
            {marqueeAssets.map((asset, index) => (
              <AssetTag key={`${asset.id}-${index}`} asset={asset} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          <p className="flex h-full items-center px-4 text-sm text-zinc-400">
            No assets added yet. Tap + to add your first investment source.
          </p>
        )}
      </div>

      <div ref={listMenuRef} className="absolute left-0 top-0 z-20 h-full">
        <button
          type="button"
          onClick={() => setListOpen((open) => !open)}
          aria-label="Asset list"
          title="Asset list"
          aria-expanded={listOpen}
          className="asset-marquee-list"
        >
          <AssetListIcon />
        </button>

        {listOpen ? (
          <div className="asset-marquee-list-menu">
            {assets.length ? (
              assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="asset-marquee-list-item"
                  onClick={() => {
                    onListSelect(asset);
                    setListOpen(false);
                  }}
                >
                  <span className="min-w-0 truncate text-zinc-100">{asset.name}</span>
                  <span className="shrink-0 text-cyan-200" suppressHydrationWarning>
                    {formatCurrency(asset.current_value, 0)}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2.5 text-sm text-zinc-400">No assets yet.</p>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={addDisabled}
        aria-label="Add asset"
        title="Add asset"
        className="asset-marquee-add"
      >
        +
      </button>
    </div>
  );
}

function FinanceMark() {
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center"
      aria-label="Financial Life"
      role="img"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300 via-fuchsia-400 to-purple-500 opacity-90 blur-[6px]" />
      <div className="relative flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#1a1238] via-[#120822] to-[#0d0618] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_14px_rgba(168,85,247,0.35)]">
        <div className="absolute inset-[3px] rounded-full border border-cyan-300/20 bg-gradient-to-br from-white/[0.06] to-transparent" />
        <span
          className="relative translate-y-[1px] bg-gradient-to-br from-cyan-200 via-white to-fuchsia-300 bg-clip-text text-[1.45rem] font-semibold leading-none text-transparent drop-shadow-[0_0_8px_rgba(46,242,255,0.5)]"
          aria-hidden="true"
        >
          ₹
        </span>
      </div>
    </div>
  );
}

export function AssetsManager({
  initialAssets,
  initialSnapshots,
  initialEvents,
  initialGoals,
  initialGoalAssetLinks = [],
}: AssetsManagerProps) {
  const [assets, setAssets] = useState<FinancialAsset[]>(initialAssets);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>(initialSnapshots);
  const [events, setEvents] = useState<AssetEvent[]>(initialEvents);
  const [selectedAsset, setSelectedAsset] = useState<FinancialAsset | null>(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const netWorth = useMemo(
    () => assets.reduce((sum, item) => sum + Number(item.current_value ?? 0), 0),
    [assets],
  );

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function openCreateEditor() {
    resetForm();
    setError(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) {
      return;
    }
    setEditorOpen(false);
    setError(null);
  }

  function handleEditorBackdropMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || saving) {
      return;
    }
    closeEditor();
  }

  function closeAssetDetails() {
    setSelectedAsset(null);
  }

  async function refreshInsights() {
    try {
      const response = await fetch("/api/financial/insights");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        return;
      }
      setSnapshots(data.snapshots ?? []);
      setEvents(data.events ?? []);
    } catch {
      // Non-blocking; keep existing insights if refresh fails.
    }
  }

  async function refreshAssets() {
    try {
      const response = await fetch("/api/financial/assets");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        return;
      }
      setAssets(data.assets ?? []);
    } catch {
      // Non-blocking; keep existing assets if refresh fails.
    }
  }

  async function handleCreateOrUpdate() {
    if (!form.name.trim()) {
      setError("Asset name is required.");
      return;
    }

    if (!form.currentValue || Number.isNaN(Number(form.currentValue))) {
      setError("Current value must be a valid number.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      category: form.category,
      currentValue: Number(form.currentValue),
      notes: form.notes.trim() || "",
    };

    const endpoint = editingId
      ? `/api/financial/assets/${editingId}`
      : "/api/financial/assets";
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
        asset?: FinancialAsset;
      }>(response);

      if (!response.ok || !data.ok || !data.asset) {
        throw new Error(data.error ?? "Failed to save asset.");
      }

      if (editingId) {
        setAssets((prev) =>
          prev.map((asset) => (asset.id === data.asset!.id ? data.asset! : asset)),
        );
        toast.success("Asset updated.");
      } else {
        setAssets((prev) => [data.asset!, ...prev]);
        toast.success("Asset added.");
      }

      resetForm();
      setEditorOpen(false);
      await refreshInsights();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(asset: FinancialAsset) {
    setEditingId(asset.id);
    setForm({
      name: asset.name,
      category: normalizeCategory(asset.category),
      currentValue: String(asset.current_value),
      notes: asset.notes ?? "",
    });
    setError(null);
    setEditorOpen(true);
    setSelectedAsset(null);
  }

  async function deleteAsset(id: string) {
    const confirmed = window.confirm("Delete this asset?");
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/financial/assets/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to delete asset.");
      }

      setAssets((prev) => prev.filter((asset) => asset.id !== id));
      if (editingId === id) {
        resetForm();
      }
      if (selectedAsset?.id === id) {
        closeAssetDetails();
      }
      toast.success("Asset deleted.");
      await refreshInsights();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Failed to delete asset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AssetMarquee
        assets={assets}
        onSelect={setSelectedAsset}
        onListSelect={startEditing}
        onAdd={openCreateEditor}
        addDisabled={saving}
      />

      <div className="flex items-center justify-start gap-4">
        <FinanceMark />
        <h1
          className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-3xl font-semibold text-transparent"
          suppressHydrationWarning
        >
          {formatCurrency(netWorth, 0).replace("₹", "")}
        </h1>
      </div>

      {mounted && selectedAsset
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 px-4"
              onClick={closeAssetDetails}
            >
              <div
                className="retro-panel w-full max-w-sm p-4"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 className="text-base font-semibold text-zinc-100">{selectedAsset.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">
                  {selectedAsset.category.replaceAll("_", " ")}
                </p>
                <div className="mt-3 space-y-1 text-sm text-zinc-300">
                  <p>Current value: {formatCurrency(selectedAsset.current_value)}</p>
                </div>
                {selectedAsset.notes ? (
                  <p className="mt-3 text-sm text-zinc-300">{selectedAsset.notes}</p>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={closeAssetDetails}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(selectedAsset)}
                    disabled={saving}
                  >
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => deleteAsset(selectedAsset.id)} disabled={saving}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <GoalsManager
        initialGoals={initialGoals}
        initialGoalAssetLinks={initialGoalAssetLinks}
        assets={assets}
        onAssetsChanged={refreshAssets}
      />

      <FinancialInsights assets={assets} snapshots={snapshots} events={events} />

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
                  {editingId ? "Update Asset" : "Add Asset"}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    className="rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
                    placeholder="Asset name (e.g. SBI MF, BTC, FD)"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <div className="select-shell">
                    <select
                      className="select-premium text-sm"
                      value={form.category}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          category: event.target.value as AssetCategory,
                        }))
                      }
                    >
                      {CATEGORY_OPTIONS.map((option) => (
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
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300 sm:col-span-2"
                    placeholder="Current value"
                    value={form.currentValue}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, currentValue: event.target.value }))
                    }
                  />
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
