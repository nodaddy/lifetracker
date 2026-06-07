"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { FinancialInsights } from "@/components/financial/financial-insights";
import { GoalsManager, type FinancialGoal } from "@/components/financial/goals-manager";
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

export function AssetsManager({
  initialAssets,
  initialSnapshots,
  initialEvents,
  initialGoals,
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
    setEditorOpen(false);
    setError(null);
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
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save asset.");
      }

      if (editingId) {
        setAssets((prev) =>
          prev.map((asset) => (asset.id === data.asset.id ? data.asset : asset)),
        );
        toast.success("Asset updated.");
      } else {
        setAssets((prev) => [data.asset, ...prev]);
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
      <div className="flex items-end justify-between gap-4">
      <h1 className="neon-title text-3xl font-semibold" suppressHydrationWarning>
          Financial Life
        </h1>
        <h1
          className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-3xl font-semibold text-transparent"
          suppressHydrationWarning
        >
          {formatCurrency(netWorth, 0)}
        </h1>
      </div>

      <div>
        <div className="mt-4 flex flex-wrap gap-2">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className="inline-flex items-center gap-3 rounded-full border bg-white/5 px-4 py-1.5 text-xs transition-colors duration-150 border-cyan-300/40 hover:bg-white/10"
              onClick={() => setSelectedAsset(asset)}
            >
              <span className="font-medium text-zinc-100">{asset.name}</span>
              <span className="font-semibold text-cyan-200" suppressHydrationWarning>
                {formatCurrency(asset.current_value, 0)}
              </span>
            </button>
          ))}
          {!assets.length ? (
            <p className="text-sm text-zinc-400">
              No assets added yet. Add your first investment source above.
            </p>
          ) : null}
        </div>
      </div>

      {mounted
        ? createPortal(
            <button
              type="button"
              onClick={openCreateEditor}
              disabled={saving}
              aria-label="Add asset"
              title="Add asset"
              className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-[0_8px_24px_rgba(255,62,165,0.45),0_0_22px_rgba(168,85,247,0.4)] transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60 sm:bottom-8 sm:right-8"
              style={{
                background:
                  "linear-gradient(135deg, #ff3ea5 0%, #a855f7 55%, #2ef2ff 120%)",
              }}
            >
              <span className="-mt-0.5 leading-none">+</span>
            </button>,
            document.body,
          )
        : null}

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
        assets={assets}
        onAssetsChanged={refreshAssets}
      />

      <FinancialInsights assets={assets} snapshots={snapshots} events={events} />

      {mounted && editorOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 px-4"
              onClick={closeEditor}
            >
              <div
                className="retro-panel max-h-[88vh] w-full max-w-lg overflow-y-auto p-4 sm:p-5"
                onClick={(event) => event.stopPropagation()}
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

                {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={closeEditor} disabled={saving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreateOrUpdate} disabled={saving}>
                    {editingId ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
