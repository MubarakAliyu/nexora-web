"use client";

import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  BarChart as RBarChart,
  Bar,
  AreaChart as RAreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/* All colours reference palette tokens so charts stay on-system. */
const AXIS = "var(--muted)";
const GRID = "var(--border)";
export const CHART_PALETTE = [
  "var(--primary)",
  "var(--accent)",
  "var(--muted)",
  "var(--foreground)",
];

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
};

const axisTick = { fontSize: 12, fill: AXIS } as const;

export interface Series {
  key: string;
  label?: string;
  color?: string;
}

interface SeriesChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  height?: number;
}

export function LineChart({ data, xKey, series, height = 280 }: SeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} stroke={AXIS} tickLine={false} axisLine={{ stroke: GRID }} tick={axisTick} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} tick={axisTick} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: GRID }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label ?? s.key}
            stroke={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  );
}

export function BarChart({ data, xKey, series, height = 280 }: SeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} stroke={AXIS} tickLine={false} axisLine={{ stroke: GRID }} tick={axisTick} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} tick={axisTick} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-hover)" }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label ?? s.key}
            fill={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
          />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  );
}

export function AreaChart({ data, xKey, series, height = 280 }: SeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RAreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
            return (
              <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} stroke={AXIS} tickLine={false} axisLine={{ stroke: GRID }} tick={axisTick} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} tick={axisTick} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: GRID }} />
        {series.map((s, i) => {
          const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={color}
              strokeWidth={2}
              fill={`url(#area-${s.key})`}
            />
          );
        })}
      </RAreaChart>
    </ResponsiveContainer>
  );
}

interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
  colors?: string[];
}

export function DonutChart({ data, height = 280, colors = CHART_PALETTE }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--background)"
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            color: "var(--muted)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
