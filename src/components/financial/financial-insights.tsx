"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface FinancialAssetLite {
  category: string;
  current_value: number;
}

interface PortfolioSnapshot {
  snapshot_date: string;
  total_current_value: number;
}

interface AssetEvent {
  action: "create" | "update" | "delete";
  created_at: string;
}

interface FinancialInsightsProps {
  assets: FinancialAssetLite[];
  snapshots: PortfolioSnapshot[];
  events: AssetEvent[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(dateIso: string) {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function FinancialInsights({ assets, snapshots, events }: FinancialInsightsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allocation = useMemo(() => {
    const grouped = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.category.replaceAll("_", " ");
      acc[key] = (acc[key] ?? 0) + Number(asset.current_value ?? 0);
      return acc;
    }, {});

    const total = Object.values(grouped).reduce((sum, value) => sum + value, 0);

    return Object.entries(grouped)
      .map(([category, value]) => ({
        category,
        value,
        share: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const trend = useMemo(() => {
    if (!snapshots.length) {
      return [];
    }

    return [...snapshots]
      .sort(
        (a, b) =>
          new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime(),
      )
      .slice(-60)
      .map((point) => ({
        ...point,
        dateLabel: formatDateLabel(point.snapshot_date),
        totalValue: Number(point.total_current_value),
      }));
  }, [snapshots]);

  const valueChangeSeries = useMemo(() => {
    if (trend.length < 2) {
      return [];
    }

    return trend.slice(1).map((point, index) => ({
      dateLabel: point.dateLabel,
      change: point.totalValue - trend[index].totalValue,
    }));
  }, [trend]);

  const activityTimeline = useMemo(() => {
    if (!events.length) {
      return [];
    }

    const grouped = events.reduce<Record<string, { create: number; update: number; delete: number }>>(
      (acc, entry) => {
        const key = new Date(entry.created_at).toISOString().slice(0, 10);
        if (!acc[key]) {
          acc[key] = { create: 0, update: 0, delete: 0 };
        }
        acc[key][entry.action] += 1;
        return acc;
      },
      {},
    );

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-30)
      .map(([date, counts]) => ({
        dateLabel: formatDateLabel(date),
        ...counts,
      }));
  }, [events]);

  const recentActivity = useMemo(() => {
    const latestTimestamp = events.length
      ? Math.max(...events.map((entry) => new Date(entry.created_at).getTime()))
      : 0;
    const threeMonthsAgo = latestTimestamp - 90 * 24 * 60 * 60 * 1000;
    const recentEvents = events.filter(
      (entry) => new Date(entry.created_at).getTime() >= threeMonthsAgo,
    );

    return {
      total: recentEvents.length,
      created: recentEvents.filter((entry) => entry.action === "create").length,
      updated: recentEvents.filter((entry) => entry.action === "update").length,
      deleted: recentEvents.filter((entry) => entry.action === "delete").length,
    };
  }, [events]);

  const PIE_COLORS = ["#2ef2ff", "#ff3ea5", "#a855f7", "#22d3ee", "#f472b6", "#7c3aed"];

  return (
    <div className="mt-6 space-y-4">
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="retro-tile p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">3-month activity</p>
            <p className="mt-1 text-lg font-semibold text-cyan-200">{recentActivity.total}</p>
            <p className="text-xs text-zinc-400">
              +{recentActivity.created} / ~{recentActivity.updated} / -{recentActivity.deleted}
            </p>
          </div>
          <div className="retro-tile p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Categories tracked</p>
            <p className="mt-1 text-lg font-semibold text-fuchsia-100">{allocation.length}</p>
          </div>
          <div className="retro-tile p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Top allocation</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {allocation[0]?.category ?? "N/A"}
            </p>
            <p className="text-xs text-zinc-400">
              {allocation[0] ? `${allocation[0].share.toFixed(1)}%` : "-"}
            </p>
          </div>
        </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="retro-panel p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-zinc-100">1) Portfolio Value Trend</h3>
          {mounted && trend.length >= 2 ? (
            <div className="mt-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2ef2ff" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2ef2ff" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Total value"]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      background: "rgba(14, 12, 34, 0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#f4f4f5",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalValue"
                    stroke="#2ef2ff"
                    strokeWidth={2}
                    fill="url(#portfolioValueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              Not enough snapshot history yet. Add or update assets over a few days to build this chart.
            </p>
          )}
        </div>

        <div className="retro-panel p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-zinc-100">2) Allocation Mix (Interactive)</h3>
          {mounted && allocation.length ? (
            <div className="mt-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${Number(props.payload.share).toFixed(1)}% (${formatCurrency(Number(value))})`,
                      props.payload.category,
                    ]}
                    contentStyle={{
                      background: "rgba(14, 12, 34, 0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#f4f4f5",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    innerRadius={52}
                    paddingAngle={2}
                  >
                    {allocation.map((entry, index) => (
                      <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              Add assets to view allocation insights.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="retro-panel p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-zinc-100">3) Daily Portfolio Change</h3>
          {mounted && valueChangeSeries.length ? (
            <div className="mt-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueChangeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Daily change"]}
                    contentStyle={{
                      background: "rgba(14, 12, 34, 0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#f4f4f5",
                    }}
                  />
                  <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                    {valueChangeSeries.map((entry) => (
                      <Cell
                        key={`${entry.dateLabel}-${entry.change}`}
                        fill={entry.change >= 0 ? "#34d399" : "#fb7185"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              Need at least 2 snapshots to calculate daily changes.
            </p>
          )}
        </div>

        <div className="retro-panel p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-zinc-100">Asset Activity Timeline (last 30 days)</h3>
          {mounted && activityTimeline.length ? (
            <div className="mt-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(14, 12, 34, 0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#f4f4f5",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="create" stackId="activity" fill="#2ef2ff" />
                  <Bar dataKey="update" stackId="activity" fill="#a855f7" />
                  <Bar dataKey="delete" stackId="activity" fill="#fb7185" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              Activity log will appear after you add/update/delete assets.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
