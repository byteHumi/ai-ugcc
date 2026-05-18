'use client';

import { useState, useEffect, useCallback, useMemo, Fragment, type ReactNode } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { RefreshCw, Image, Video, Calendar, User, Briefcase, Clock, AlertCircle, CheckCircle2, Loader2, TrendingUp, CalendarRange, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Summary = {
  total_requests: number;
  successful: number;
  failed: number;
  total_cost: number;
  image_cost: number;
  video_cost: number;
  image_requests: number;
  video_requests: number;
  image_success: number;
  video_success: number;
  image_failed: number;
  video_failed: number;
};

type DailyEntry = { date: string; image_success: number; video_success: number; failed: number; image_cost: number; video_cost: number };
type MonthlyEntry = { month_start: string; image_count: number; video_count: number; failed: number; image_cost: number; video_cost: number; total_cost: number; video_seconds: number };
type WeekBucketEntry = MonthlyEntry & { week_of_month: number; first_day: string; last_day: string };
type BreakdownView = 'monthly' | 'weekly';
type TimeseriesEntry = { ts: string; success: number; failed: number; processing: number };
type ModelEntry = { model: string; type: string; total: number; successful: number; failed: number; total_cost: number };
type UserEntry = { user_key: string; display_name: string; email: string | null; total: number; successful: number; failed: number; total_cost: number; images: number; videos: number };
type JobEntry = { job_id: string; total: number; successful: number; failed: number; total_cost: number; total_duration: number; job_name?: string; job_status?: string; model_name?: string; batch_name?: string; is_master?: boolean; job_created_by?: string };
type RecentEntry = { id: string; type: string; model: string; status: string; cost: number | null; duration_seconds: number | null; error: string | null; created_by: string | null; created_by_email: string | null; created_at: string; metadata?: Record<string, unknown> | null };
type FalPrice = { endpoint_id: string; unit_price: number; unit: string; currency: string };
type Period = '24h' | '7d' | '30d' | '90d' | '6m' | '1y' | 'custom';

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
// Thousands-separated integer, e.g. 35898 → "35,898".
function fmtNum(n: number) { return Math.round(n).toLocaleString('en-US'); }
// Money with grouping + 2 decimals, e.g. 6138.5 → "$6,138.50".
function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
// Seconds → compact readable duration: "4h 39m", "12m 30s", "45s", or "—".
function fmtDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '—';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
// Label a week bucket by the actual span of data it contains — honest even when
// the bucket is clipped by a short selected period (e.g. "May 12–14", not "May 8-14").
function dayRangeLabel(firstDay: string, lastDay: string) {
  const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const a = parse(firstDay), b = parse(lastDay);
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (firstDay.slice(0, 10) === lastDay.slice(0, 10)) return fmt(a);
  if (a.getMonth() === b.getMonth()) return `${fmt(a)}–${b.getDate()}`;
  return `${fmt(a)} – ${fmt(b)}`;
}
function monthLabel(monthStart: string) {
  const [y, m] = monthStart.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
// Period-over-period delta badge. For spend, an increase is shown in the error
// color (more money out) and a decrease in the success color.
function Delta({ curr, prev }: { curr: number; prev: number | null }) {
  if (prev == null) return <span className="text-xs text-muted-foreground">—</span>;
  if (prev === 0) {
    return curr > 0
      ? <span className="text-xs font-medium text-[var(--error)]">new</span>
      : <span className="text-xs text-muted-foreground">—</span>;
  }
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-xs text-muted-foreground">±0%</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}
// Compact KPI card: icon badge, label, big value, supporting line.
function StatCard({ icon, label, value, sub, accent }: {
  icon: ReactNode; label: string; value: string; sub: ReactNode; accent?: 'primary' | 'purple';
}) {
  const valueColor = accent === 'primary' ? 'text-[var(--primary)]'
    : accent === 'purple' ? 'text-[var(--purple)]' : 'text-foreground';
  const badge = accent === 'primary' ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
    : accent === 'purple' ? 'bg-[var(--purple)]/10 text-[var(--purple)]'
    : 'bg-foreground/[0.06] text-muted-foreground';
  return (
    <Card className="gap-0 py-0 transition-colors hover:border-foreground/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${badge}`}>
            {icon}
          </div>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className={`mt-3 text-2xl font-bold leading-none tracking-tight tabular-nums ${valueColor}`}>{value}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Uses app theme: primary=#d4698e, success=#22c55e, error=#ef4444, purple=#7c3aed
const requestChartConfig = {
  success: { label: 'Success', color: 'var(--success)' },
  failed: { label: 'Failed', color: 'var(--error)' },
} satisfies ChartConfig;

const costChartConfig = {
  image: { label: 'Images', color: 'var(--primary)' },
  video: { label: 'Videos', color: 'var(--purple)' },
} satisfies ChartConfig;

export default function PricingDashboard() {
  const [period, setPeriod] = useState<Period>('90d');
  const [customFrom, setCustomFrom] = useState(() => toDateStr(new Date(Date.now() - 7 * 86400000)));
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [weekBuckets, setWeekBuckets] = useState<WeekBucketEntry[]>([]);
  const [monthly, setMonthly] = useState<MonthlyEntry[]>([]);
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('monthly');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [timeseries, setTimeseries] = useState<TimeseriesEntry[]>([]);
  const [byModel, setByModel] = useState<ModelEntry[]>([]);
  const [byUser, setByUser] = useState<UserEntry[]>([]);
  const [byJob, setByJob] = useState<JobEntry[]>([]);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [falPrices, setFalPrices] = useState<FalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartModelFilter, setChartModelFilter] = useState<string>('all');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/pricing?period=${period}`;
      if (period === 'custom' && customFrom && customTo) url = `/api/pricing?period=custom&from=${customFrom}&to=${customTo}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setSummary(data.summary || null);
      setDaily(data.daily || []);
      setWeekBuckets(data.weekBuckets || []);
      setMonthly(data.monthly || []);
      setTimeseries(data.timeseries || []);
      setByModel(data.byModel || []);
      setByUser(data.byUser || []);
      setByJob(data.byJob || []);
      setRecent(data.recent || []);
      setFalPrices(data.falPrices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const successRate = summary && summary.total_requests > 0
    ? Math.round((summary.successful / summary.total_requests) * 100)
    : 100;

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Model names for the chart filter
  const modelNames = useMemo(() => {
    const names = byModel.map(m => m.model);
    return [...new Set(names)];
  }, [byModel]);

  // Generate all dates in the selected range so charts always have a full timeline
  const dateRange = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dates: string[] = [];
    let start: Date;
    let end = new Date();
    end.setHours(0, 0, 0, 0);

    if (period === 'custom') {
      start = new Date(customFrom);
      end = new Date(customTo);
    } else {
      const days = period === '24h' ? 1 : period === '7d' ? 7
        : period === '90d' ? 90 : period === '6m' ? 182 : period === '1y' ? 365 : 30;
      start = new Date(Date.now() - days * 86400000);
    }
    start.setHours(0, 0, 0, 0);

    const cur = new Date(start);
    while (cur <= end) {
      dates.push(fmt(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [period, customFrom, customTo]);

  // Build per-model timeseries from recent data, padded with zeros for full range
  const modelTimeseriesData = useMemo(() => {
    const fmt = (dateStr: string) => {
      const d = new Date(dateStr);
      if (period === '24h') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (period === 'custom') {
        const diff = (new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000;
        return diff <= 2
          ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Build a map from existing timeseries data
    const dataMap = new Map<string, { success: number; failed: number }>();

    if (chartModelFilter === 'all') {
      for (const t of timeseries) {
        dataMap.set(fmt(t.ts), { success: t.success, failed: t.failed });
      }
    } else {
      const filtered = recent.filter(r => r.model === chartModelFilter);
      for (const r of filtered) {
        const key = fmt(r.created_at);
        const b = dataMap.get(key) || { success: 0, failed: 0 };
        if (r.status === 'success') b.success++;
        else if (r.status === 'failed') b.failed++;
        dataMap.set(key, b);
      }
    }

    // For hourly periods, just return what we have (no date range padding)
    if (period === '24h') {
      return Array.from(dataMap.entries()).map(([time, v]) => ({ time, ...v }));
    }

    // Pad with zeros, but trim trailing zero-only days after the last real data point
    const padded = dateRange.map(date => ({
      time: date,
      success: dataMap.get(date)?.success || 0,
      failed: dataMap.get(date)?.failed || 0,
    }));
    const lastDataIdx = padded.findLastIndex(d => d.success > 0 || d.failed > 0);
    return lastDataIdx >= 0 ? padded.slice(0, lastDataIdx + 1) : padded;
  }, [timeseries, recent, chartModelFilter, period, customFrom, customTo, dateRange]);

  // Cost data padded with zeros for full range
  const costTimeData = useMemo(() => {
    const dataMap = new Map<string, { image: number; video: number }>();
    for (const d of daily) {
      const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap.set(label, {
        image: Number(d.image_cost.toFixed(2)),
        video: Number(d.video_cost.toFixed(2)),
      });
    }

    if (period === '24h') {
      return Array.from(dataMap.entries()).map(([date, v]) => ({ date, ...v }));
    }

    const padded = dateRange.map(date => ({
      date,
      image: dataMap.get(date)?.image || 0,
      video: dataMap.get(date)?.video || 0,
    }));
    const lastDataIdx = padded.findLastIndex(d => d.image > 0 || d.video > 0);
    return lastDataIdx >= 0 ? padded.slice(0, lastDataIdx + 1) : padded;
  }, [daily, dateRange, period]);

  const periodLabel = period === '24h' ? 'Last 24 hours'
    : period === '7d' ? 'Last 7 days'
    : period === '30d' ? 'Last 30 days'
    : period === '90d' ? 'Last 90 days'
    : period === '6m' ? 'Last 6 months'
    : period === '1y' ? 'Last 12 months'
    : 'Custom range';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Generation costs and usage breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-card px-1 py-0.5">
            {(['24h', '7d', '30d', '90d', '1y'] as Period[]).map((p) => (
              <button key={p} onClick={() => { setPeriod(p); setShowDatePicker(false); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => { if (period === 'custom') setShowDatePicker(!showDatePicker); else { setPeriod('custom'); setShowDatePicker(true); } }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${period === 'custom' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Calendar className="h-3 w-3" />
              {period === 'custom' ? `${new Date(customFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(customTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Custom'}
            </button>
          </div>
          <button onClick={fetchStats} disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showDatePicker && period === 'custom' && (
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 py-0">
            <label className="text-xs text-muted-foreground">From</label>
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border bg-accent px-3 py-1.5 text-xs focus:border-primary focus:outline-none" />
            <label className="text-xs text-muted-foreground">To</label>
            <input type="date" value={customTo} min={customFrom} max={toDateStr(new Date())} onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border bg-accent px-3 py-1.5 text-xs focus:border-primary focus:outline-none" />
            <button onClick={() => setShowDatePicker(false)}
              className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              Apply
            </button>
          </CardContent>
        </Card>
      )}

      {loading && !summary ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive font-medium">Failed to load analytics</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            <button onClick={fetchStats} className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">Retry</button>
          </CardContent>
        </Card>
      ) : !summary ? (
        <Card className="py-16">
          <CardContent className="text-center text-sm text-muted-foreground">
            No data yet. Costs will appear after your first generation.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Top stat cards ── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Total requests"
              value={fmtNum(summary.total_requests)}
              sub={
                <span className="inline-flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${successRate >= 90 ? 'bg-[var(--success)]' : successRate >= 70 ? 'bg-amber-500' : 'bg-[var(--error)]'}`} />
                  {successRate}% success rate
                </span>
              }
            />
            <StatCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Total cost"
              accent="primary"
              value={fmtMoney(summary.total_cost)}
              sub={`${fmtMoney(summary.image_cost)} images · ${fmtMoney(summary.video_cost)} videos`}
            />
            <StatCard
              icon={<Image className="h-4 w-4" />}
              label="Images generated"
              accent="primary"
              value={fmtNum(summary.image_success)}
              sub={`${fmtMoney(summary.image_cost)} spent${summary.image_failed > 0 ? ` · ${fmtNum(summary.image_failed)} failed` : ''}`}
            />
            <StatCard
              icon={<Video className="h-4 w-4" />}
              label="Videos generated"
              accent="purple"
              value={fmtNum(summary.video_success)}
              sub={`${fmtMoney(summary.video_cost)} spent${summary.video_failed > 0 ? ` · ${fmtNum(summary.video_failed)} failed` : ''}`}
            />
          </div>

          {/* ── Spend breakdown: month-on-month / week-on-week ── */}
          {monthly.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="grid gap-1">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    Spend breakdown
                  </CardTitle>
                  <CardDescription>
                    {breakdownView === 'monthly'
                      ? (monthly.length > 1
                          ? 'Month-on-month spend — click a month to expand its weeks'
                          : 'Spend this month — click the month to expand its weeks')
                      : 'Week-by-week spend across the selected range'}
                    {' — '}{periodLabel}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg border bg-card px-1 py-0.5">
                  {(['monthly', 'weekly'] as BreakdownView[]).map((v) => (
                    <button key={v} onClick={() => setBreakdownView(v)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${breakdownView === v ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {v === 'monthly' ? 'Month on month' : 'Week on week'}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider">{breakdownView === 'monthly' ? 'Month' : 'Week'}</TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider">Images</TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider">Videos</TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider">Video time</TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider">Image cost</TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider">Video cost</TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider">Total</TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider">{breakdownView === 'monthly' ? 'MoM' : 'WoW'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdownView === 'monthly' ? monthly.map((m, i) => {
                      const expanded = expandedMonths.has(m.month_start);
                      const subWeeks = weekBuckets.filter((wb) => wb.month_start === m.month_start);
                      return (
                        <Fragment key={m.month_start}>
                          <TableRow
                            className={`cursor-pointer transition-colors ${expanded ? 'bg-accent/40 hover:bg-accent/50' : 'hover:bg-accent/30'}`}
                            onClick={() => toggleMonth(m.month_start)}>
                            <TableCell className="font-medium">
                              <span className="inline-flex items-center gap-2">
                                <span className={`flex h-5 w-5 items-center justify-center rounded ${expanded ? 'bg-foreground/10' : ''}`}>
                                  {expanded
                                    ? <ChevronDown className="h-3.5 w-3.5 text-foreground" />
                                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                </span>
                                {monthLabel(m.month_start)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right"><Badge variant="secondary" className="font-mono tabular-nums">{fmtNum(m.image_count)}</Badge></TableCell>
                            <TableCell className="text-right"><Badge variant="secondary" className="font-mono tabular-nums">{fmtNum(m.video_count)}</Badge></TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">{fmtDuration(m.video_seconds)}</TableCell>
                            <TableCell className="text-right tabular-nums text-[var(--primary)]">{fmtMoney(m.image_cost)}</TableCell>
                            <TableCell className="text-right tabular-nums text-[var(--purple)]">{fmtMoney(m.video_cost)}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{fmtMoney(m.total_cost)}</TableCell>
                            <TableCell className="text-right"><Delta curr={m.total_cost} prev={i > 0 ? monthly[i - 1].total_cost : null} /></TableCell>
                          </TableRow>
                          {expanded && subWeeks.map((wb, j) => (
                            <TableRow key={`${m.month_start}-${wb.week_of_month}`} className="border-0 bg-muted/20 hover:bg-muted/30">
                              <TableCell className="py-2 pl-12 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                                  {dayRangeLabel(wb.first_day, wb.last_day)}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums text-muted-foreground">{fmtNum(wb.image_count)}</TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums text-muted-foreground">{fmtNum(wb.video_count)}</TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums text-muted-foreground">{fmtDuration(wb.video_seconds)}</TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums text-[var(--primary)]/75">{fmtMoney(wb.image_cost)}</TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums text-[var(--purple)]/75">{fmtMoney(wb.video_cost)}</TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums font-medium">{fmtMoney(wb.total_cost)}</TableCell>
                              <TableCell className="py-2 text-right"><Delta curr={wb.total_cost} prev={j > 0 ? subWeeks[j - 1].total_cost : null} /></TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      );
                    }) : weekBuckets.map((wb, i) => (
                      <TableRow key={`${wb.month_start}-${wb.week_of_month}`} className="transition-colors hover:bg-accent/30">
                        <TableCell className="font-medium">{dayRangeLabel(wb.first_day, wb.last_day)}</TableCell>
                        <TableCell className="text-right"><Badge variant="secondary" className="font-mono tabular-nums">{fmtNum(wb.image_count)}</Badge></TableCell>
                        <TableCell className="text-right"><Badge variant="secondary" className="font-mono tabular-nums">{fmtNum(wb.video_count)}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{fmtDuration(wb.video_seconds)}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--primary)]">{fmtMoney(wb.image_cost)}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--purple)]">{fmtMoney(wb.video_cost)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{fmtMoney(wb.total_cost)}</TableCell>
                        <TableCell className="text-right"><Delta curr={wb.total_cost} prev={i > 0 ? weekBuckets[i - 1].total_cost : null} /></TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 bg-muted/40 font-semibold hover:bg-muted/40">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(monthly.reduce((s, m) => s + m.image_count, 0))}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(monthly.reduce((s, m) => s + m.video_count, 0))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmtDuration(monthly.reduce((s, m) => s + m.video_seconds, 0))}</TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--primary)]">{fmtMoney(monthly.reduce((s, m) => s + m.image_cost, 0))}</TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--purple)]">{fmtMoney(monthly.reduce((s, m) => s + m.video_cost, 0))}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(monthly.reduce((s, m) => s + m.total_cost, 0))}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Request stats chart with model filter ── */}
          <Card className="pt-0">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1">
                <CardTitle>Request stats</CardTitle>
                <CardDescription>
                  {chartModelFilter === 'all'
                    ? `Success and failure counts — ${periodLabel}`
                    : `Filtered by ${chartModelFilter.replace('fal-ai/', '')}`}
                </CardDescription>
              </div>
              <Select value={chartModelFilter} onValueChange={setChartModelFilter}>
                <SelectTrigger className="w-[200px] rounded-lg sm:ml-auto" aria-label="Filter by model">
                  <SelectValue placeholder="All models" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="rounded-lg">All models</SelectItem>
                  {modelNames.map((name) => (
                    <SelectItem key={name} value={name} className="rounded-lg">
                      {name.replace('fal-ai/', '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              {modelTimeseriesData.length > 0 ? (
                <ChartContainer config={requestChartConfig} className="aspect-auto h-[250px] w-full">
                  <AreaChart accessibilityLayer data={modelTimeseriesData}>
                    <defs>
                      <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-failed)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-failed)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => value}
                          indicator="dot"
                        />
                      }
                    />
                    <Area
                      dataKey="failed"
                      type="monotone"
                      fill="url(#fillFailed)"
                      stroke="var(--color-failed)"
                      stackId="a"
                    />
                    <Area
                      dataKey="success"
                      type="monotone"
                      fill="url(#fillSuccess)"
                      stroke="var(--color-success)"
                      stackId="a"
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-16">No request data for this period</p>
              )}
            </CardContent>
          </Card>

          {/* ── Cost breakdown chart ── */}
          {costTimeData.length > 0 && (
            <Card className="pt-0">
              <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                  <CardTitle>Cost breakdown</CardTitle>
                  <CardDescription>Daily spending by generation type — {periodLabel}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={costChartConfig} className="aspect-auto h-[250px] w-full">
                  <AreaChart accessibilityLayer data={costTimeData}>
                    <defs>
                      <linearGradient id="fillImage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-image)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-image)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillVideo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-video)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-video)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => value}
                          indicator="dot"
                        />
                      }
                    />
                    <Area
                      dataKey="video"
                      type="monotone"
                      fill="url(#fillVideo)"
                      stroke="var(--color-video)"
                      stackId="a"
                    />
                    <Area
                      dataKey="image"
                      type="monotone"
                      fill="url(#fillImage)"
                      stroke="var(--color-image)"
                      stackId="a"
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* ── Usage by user ── */}
          {byUser.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Usage by user
                </CardTitle>
                <CardDescription>Who generated how much</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Images</TableHead>
                      <TableHead className="text-right">Videos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byUser.map((u, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{u.display_name || 'Unknown'}</span>
                            {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono tabular-nums">{fmtNum(u.images)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono tabular-nums">{fmtNum(u.videos)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{fmtNum(u.total)}</TableCell>
                        <TableCell className="text-right">
                          {u.failed > 0 ? <Badge variant="destructive" className="font-mono tabular-nums">{fmtNum(u.failed)}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-[var(--primary)]">{fmtMoney(u.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Usage by job / pipeline ── */}
          {byJob.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Usage by job
                </CardTitle>
                <CardDescription>Per-job and pipeline cost breakdown</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Pipeline</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byJob.map((j, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{j.job_name || j.job_id?.slice(0, 8)}</span>
                            {j.job_status && (
                              <Badge variant={j.job_status === 'completed' ? 'default' : j.job_status === 'failed' ? 'destructive' : 'secondary'}
                                className="text-[10px] px-1.5 py-0">
                                {j.job_status}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {j.batch_name ? (
                            <div className="flex items-center gap-1.5">
                              {j.is_master && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600">Master</Badge>}
                              <span className="truncate max-w-[120px]">{j.batch_name}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{j.model_name || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(j.total)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{fmtDuration(j.total_duration)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-[var(--primary)]">{fmtMoney(j.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Model breakdown + Live pricing ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {byModel.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Usage by model
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byModel.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium max-w-[180px] truncate">{row.model.replace('fal-ai/', '')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={row.type === 'image' ? 'border-[var(--primary)]/50 text-[var(--primary)]' : 'border-[var(--purple)]/50 text-[var(--purple)]'}>
                              {row.type === 'image' ? <Image className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
                              {row.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(row.total)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-[var(--primary)]">{fmtMoney(row.total_cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {falPrices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Live FAL pricing</CardTitle>
                  <CardDescription>Current unit prices from FAL API</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {falPrices.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium max-w-[200px] truncate">{p.endpoint_id.replace('fal-ai/', '')}</TableCell>
                          <TableCell className="text-right font-medium text-[var(--primary)]">${p.unit_price.toFixed(4)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">per {p.unit.replace(/s$/, '')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Recent requests ── */}
          {recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Recent requests
                </CardTitle>
                <CardDescription>Latest {recent.length} generation requests</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.type === 'image' ? 'border-[var(--primary)]/50 text-[var(--primary)]' : 'border-[var(--purple)]/50 text-[var(--purple)]'}>
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">{r.model.replace('fal-ai/', '')}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{timeAgo(r.created_at)}</TableCell>
                        <TableCell className="text-sm">{r.created_by || r.created_by_email?.split('@')[0] || '—'}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{r.cost != null ? fmtMoney(r.cost) : '—'}</TableCell>
                        <TableCell className="text-right">
                          {r.status === 'success' ? (
                            <Badge className="bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20 hover:bg-[var(--success-bg)]">
                              <CheckCircle2 className="h-3 w-3 mr-1" />200
                            </Badge>
                          ) : r.status === 'failed' ? (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />err
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />...
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
