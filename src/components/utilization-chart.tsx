import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { UtilizationPoint } from "@/lib/utilization";
import { cn } from "@/lib/utils";

const THRESHOLD = 85;

export function UtilizationChart({
  series,
  asOf,
  scopeLabel,
  loading,
}: {
  series: UtilizationPoint[];
  asOf: string;
  scopeLabel?: string;
  loading?: boolean;
}) {
  const todayPoint = useMemo(
    () => series.find((p) => p.date === asOf) ?? series[0],
    [series, asOf],
  );
  const currentPct = todayPoint?.pct ?? 0;
  const hot = currentPct >= THRESHOLD;

  const peak = useMemo(() => series.reduce<UtilizationPoint | null>((m, p) => (!m || p.pct > m.pct ? p : m), null), [series]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Personnel utilization {scopeLabel ? `— ${scopeLabel}` : ""}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={cn(
                "text-4xl font-semibold tabular-nums",
                hot ? "text-destructive" : "text-foreground",
              )}
            >
              {loading ? "—" : `${currentPct}%`}
            </span>
            <span className="text-xs text-muted-foreground">
              {todayPoint
                ? `${todayPoint.assigned} of ${todayPoint.totalActive} assigned on ${format(parseISO(todayPoint.date), "MMM d")}`
                : "no data"}
            </span>
          </div>
          {peak && peak.pct >= THRESHOLD && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>
                Peaks at {peak.pct}% on {format(parseISO(peak.date), "MMM d")} — over the {THRESHOLD}% threshold.
              </span>
            </div>
          )}
        </div>
        <Legend />
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 12, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(parseISO(d), "MMM d")}
              tick={{ fontSize: 10 }}
              minTickGap={24}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 85, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10 }}
              width={36}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) => format(parseISO(d as string), "EEE MMM d, yyyy")}
              formatter={(v: number, _name, ctx) => {
                const p = ctx.payload as UtilizationPoint;
                return [`${v}% — ${p.assigned}/${p.totalActive}`, "Utilization"];
              }}
            />
            <ReferenceLine
              y={THRESHOLD}
              stroke="var(--destructive)"
              strokeDasharray="6 4"
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={{
                value: `${THRESHOLD}% threshold`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--destructive)",
              }}
            />
            <Line
              type="monotone"
              dataKey="pct"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-[3px] w-5 rounded" style={{ background: "var(--primary)" }} />
        Utilization
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-[2px] w-5 rounded"
          style={{
            background:
              "repeating-linear-gradient(90deg, var(--destructive) 0 4px, transparent 4px 8px)",
          }}
        />
        85% threshold
      </span>
    </div>
  );
}
