"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface DailySeriesPoint {
  date: string;
  label: string;
  kwh: number;
  cost: number;
  baseline: number;
  anomalies: number;
}

interface TooltipPayloadItem {
  payload?: DailySeriesPoint;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-[8px] border border-ww-hairline-strong bg-ww-card px-3 py-2.5 text-[12px] shadow-lg">
      <p className="font-mono text-[11px] text-ww-fg-muted">{point.date}</p>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-ww-fg-secondary">Consumption</span>
          <span className="tabular-nums font-medium text-ww-fg">
            {point.kwh.toLocaleString()} kWh
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-ww-fg-secondary">Estimated cost</span>
          <span className="tabular-nums font-medium text-ww-fg">
            ${point.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-ww-fg-secondary">Period average</span>
          <span className="tabular-nums text-ww-fg-muted">
            {point.baseline.toLocaleString()} kWh
          </span>
        </div>
        {point.anomalies > 0 && (
          <div className="flex items-center justify-between gap-6 pt-0.5 text-ww-negative">
            <span>Anomalies</span>
            <span className="tabular-nums font-medium">{point.anomalies}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConsumptionChart({
  data,
  mode = "area",
}: {
  data: DailySeriesPoint[];
  mode?: "area" | "bar";
}) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-[13px] text-ww-fg-muted">
        No energy records found for this filter selection.
      </div>
    );
  }

  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="wwAmberWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ww-accent)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--ww-accent)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--ww-hairline)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
            minTickGap={18}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--ww-hairline-strong)", strokeWidth: 1 }}
          />
          {mode === "bar" ? (
            <Bar
              dataKey="kwh"
              fill="var(--ww-accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          ) : (
            <Area
              type="monotone"
              dataKey="kwh"
              stroke="var(--ww-accent)"
              strokeWidth={2}
              fill="url(#wwAmberWash)"
              activeDot={{ r: 4, fill: "var(--ww-accent)", strokeWidth: 0 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="var(--ww-fg-muted)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
