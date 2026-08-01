import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, IndianRupee, Crown, Shield, LogOut, TrendingDown, Activity, Target, AlertCircle, FlaskConical, Sparkles, Cpu, Zap, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import { AdminOpsPanels } from "@/components/admin/AdminOpsPanels";
import { FinancialPanel } from "@/components/admin/FinancialPanel";
import { GrowthPanel } from "@/components/admin/GrowthPanel";

const ADMIN_EMAIL = "nandunaidu656565@gmail.com";

interface AdminUser {
  user_id: string; email: string | null; display_name: string | null;
  plan: string; subscription_status: string; scans_used_month: number;
  current_period_end: string | null; created_at: string;
  status?: string; tags?: string[];
}

interface AdminData {
  users: AdminUser[];
  total: number;
  counts: Record<string, number>;
  monthlyRevenueINR: number;
  metrics: {
    mrrINR: number; activeSubs: number; cancelled: number;
    churnRate: number; conversionRate: number; totalScans30d: number;
    avgScore: number; paymentFailed: number;
    aiCostInr30d?: number; aiCalls30d?: number;
    aiInputTokens30d?: number; aiOutputTokens30d?: number; aiErrors30d?: number;
  };
  timeseries: { date: string; signups: number; scans: number }[];
  abTest: Record<"a49" | "b99" | "c149", { view: number; click: number; success: number }>;
  aiCost?: {
    exactTokenPct?: number;
    usdToInr?: number;
    byFeature: { feature: string; calls: number; input: number; output: number; cost: number; errors: number; avgCost: number }[];
    byPlan: { plan: string; calls: number; input: number; output: number; cost: number; avgCost: number }[];
    byUser?: {
      user_id: string; email: string | null; plan: string | null;
      calls: number; input: number; output: number; cost: number; avgCost: number;
      exactPct: number; errors: number; last: string | null;
      calls30d: number; input30d: number; output30d: number; cost30d: number;
    }[];
    series: { date: string; cost: number }[];
  };
}

const VARIANT_LABEL: Record<string, string> = { a49: "₹49", b99: "₹99", c149: "₹149" };
const PIE_COLORS = ["hsl(var(--muted))", "hsl(var(--primary))", "hsl(var(--accent-foreground))"];

export default function Admin() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [rangePreset, setRangePreset] = useState<string>("30");
  const [aiFrom, setAiFrom] = useState<string>(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [aiTo, setAiTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const load = async (from?: string | null, to?: string | null) => {
    setBusy(true);
    const body: Record<string, string> = {};
    const f = from === undefined ? aiFrom : from;
    const t = to === undefined ? aiTo : to;
    if (f) body.ai_from = f;
    if (t) body.ai_to = t;
    const { data: res, error } = await supabase.functions.invoke("admin-list-users", { body });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setData(res as AdminData);
    setBusy(false);
  };

  const applyPreset = (days: number) => {
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    setRangePreset(String(days));
    setAiFrom(from);
    setAiTo(to);
    load(from, to);
  };

  const rangeLabel = rangePreset === "custom" ? `${aiFrom} → ${aiTo}` : `${rangePreset}d`;

  const exportUserLedgerCsv = () => {
    const rows = data?.aiCost?.byUser ?? [];
    if (rows.length === 0) return;
    const csv = toCsv(
      [
        "user_id", "email", "plan", "calls_lifetime", "input_tokens_lifetime", "output_tokens_lifetime",
        "avg_cost_inr_lifetime", "total_cost_inr_lifetime", "exact_token_pct_lifetime", "errors_lifetime", "last_used",
        "range_from", "range_to", "calls_range", "input_tokens_range", "output_tokens_range",
        "avg_cost_inr_range", "cost_inr_range", "exact_token_pct_range", "errors_range",
      ],
      rows.map((r) => [
        r.user_id, r.email ?? "", r.plan ?? "", r.calls, r.input, r.output,
        r.avgCost, r.cost, r.exactPct, r.errors, r.last ?? "",
        aiFrom, aiTo, r.calls30d, r.input30d, r.output30d,
        r.avgCostRange ?? "", r.cost30d, r.exactPctRange ?? "", r.errorsRange ?? "",
      ]),
    );
    downloadCsv(`ai-cost-by-user_${aiFrom}_to_${aiTo}_${csvDateStamp()}.csv`, csv);
  };


  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    if (user && !isAdmin) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    else toast({ title: "Welcome, admin" });
    setSigningIn(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setData(null); };

  const updatePlan = async (user_id: string, plan: string) => {
    setUpdating(user_id);
    const { error } = await supabase.functions.invoke("admin-update-plan", { body: { user_id, plan } });
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Plan updated" }); await load(); }
    setUpdating(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><CardTitle>Admin Login</CardTitle></div>
            <p className="text-sm text-muted-foreground">Restricted area. Authorized personnel only.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2"><Label>Email</Label><Input value={ADMIN_EMAIL} disabled /></div>
              <div className="space-y-2"><Label htmlFor="pwd">Password</Label>
                <PasswordInput id="pwd" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={signingIn}>{signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}</Button>
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) toast({ title: "Failed to send", description: error.message, variant: "destructive" });
                  else toast({ title: "Reset link sent", description: `Check the inbox for ${ADMIN_EMAIL}.` });
                }}
                className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
              >
                Forgot admin password?
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const m = data?.metrics;
  const planDist = data ? [
    { name: "Free", value: data.counts.free ?? 0 },
    { name: "Basic", value: data.counts.basic ?? 0 },
    { name: "Pro", value: data.counts.pro ?? 0 },
  ] : [];

  const abRows = data ? (["a49", "b99", "c149"] as const).map((v) => {
    const row = data.abTest[v];
    const clickRate = row.view ? (row.click / row.view) * 100 : 0;
    const convRate = row.view ? (row.success / row.view) * 100 : 0;
    return { variant: VARIANT_LABEL[v], ...row, clickRate: +clickRate.toFixed(1), convRate: +convRate.toFixed(1) };
  }) : [];

  const winner = abRows.length ? [...abRows].sort((a, b) => b.convRate - a.convRate)[0] : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Growth, revenue, and product metrics — last 30 days.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}</Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" /> Sign out</Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="MRR" value={`₹${(m?.mrrINR ?? 0).toLocaleString("en-IN")}`} icon={<IndianRupee className="h-4 w-4" />} />
          <Kpi label="Active Subs" value={m?.activeSubs ?? 0} icon={<Crown className="h-4 w-4" />} />
          <Kpi label="Churn Rate" value={`${m?.churnRate ?? 0}%`} icon={<TrendingDown className="h-4 w-4" />} tone={m && m.churnRate > 10 ? "warn" : undefined} />
          <Kpi label="Conversion" value={`${m?.conversionRate ?? 0}%`} icon={<Target className="h-4 w-4" />} />
          <Kpi label="Total Users" value={data?.total ?? 0} icon={<Users className="h-4 w-4" />} />
          <Kpi label="Scans (30d)" value={m?.totalScans30d ?? 0} icon={<Activity className="h-4 w-4" />} />
          <Kpi label="Avg ATS Score" value={m?.avgScore ?? 0} icon={<Target className="h-4 w-4" />} />
          <Kpi label="Payment Failed" value={m?.paymentFailed ?? 0} icon={<AlertCircle className="h-4 w-4" />} tone={m && m.paymentFailed > 0 ? "warn" : undefined} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Signups & Scans — last 30 days</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.timeseries ?? []}>
                  <defs>
                    <linearGradient id="signups" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                    <linearGradient id="scans" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#signups)" name="Signups" />
                  <Area type="monotone" dataKey="scans" stroke="hsl(var(--accent-foreground))" fill="url(#scans)" name="Scans" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Plan Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={planDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {planDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around text-xs mt-2">
                {planDist.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />{p.name}: {p.value}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* A/B pricing test */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /><CardTitle className="text-base">Pricing A/B Test — Pro tier</CardTitle></div>
            {winner && winner.view > 5 && (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Leader: {winner.variant} ({winner.convRate}%)</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Visitors are randomly shown ₹49, ₹99, or ₹149 on the Pricing page. Actual charge stays ₹99 (Razorpay plan is fixed) — this measures price sensitivity via click-through and completed checkouts.</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={abRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="variant" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="view" fill="hsl(var(--muted))" name="Views" />
                <Bar dataKey="click" fill="hsl(var(--primary))" name="Subscribe clicks" />
                <Bar dataKey="success" fill="hsl(var(--accent-foreground))" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Variant</TableHead><TableHead>Views</TableHead><TableHead>Clicks</TableHead>
                  <TableHead>Checkouts</TableHead><TableHead>Click Rate</TableHead><TableHead>Conversion</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {abRows.map((r) => (
                    <TableRow key={r.variant}>
                      <TableCell className="font-semibold">{r.variant}</TableCell>
                      <TableCell>{r.view}</TableCell>
                      <TableCell>{r.click}</TableCell>
                      <TableCell>{r.success}</TableCell>
                      <TableCell>{r.clickRate}%</TableCell>
                      <TableCell className={winner?.variant === r.variant && r.view > 5 ? "font-bold text-primary" : ""}>{r.convRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* AI Spend */}
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="AI Cost (30d)" value={`₹${(m?.aiCostInr30d ?? 0).toLocaleString("en-IN")}`} icon={<Sparkles className="h-4 w-4" />} />
          <Kpi label="AI Calls (30d)" value={(m?.aiCalls30d ?? 0).toLocaleString()} icon={<Zap className="h-4 w-4" />} />
          <Kpi label="Tokens In / Out" value={`${((m?.aiInputTokens30d ?? 0) / 1000).toFixed(1)}k / ${((m?.aiOutputTokens30d ?? 0) / 1000).toFixed(1)}k`} icon={<Cpu className="h-4 w-4" />} />
          <Kpi label="AI Errors" value={m?.aiErrors30d ?? 0} icon={<AlertCircle className="h-4 w-4" />} tone={(m?.aiErrors30d ?? 0) > 0 ? "warn" : undefined} />
        </div>

        <p className="text-xs text-muted-foreground -mt-1">
          {(data?.aiCost?.exactTokenPct ?? 0).toFixed(0)}% of calls used exact provider token counts
          {(data?.aiCost?.exactTokenPct ?? 0) < 100 && " (rest estimated)"} · converted at 1 USD = ₹{data?.aiCost?.usdToInr ?? 83} · provider rate card applied per model.
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Cost per Day (₹, last 30d)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data?.aiCost?.series ?? []}>
                  <defs>
                    <linearGradient id="aicost" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => `₹${v}`} />
                  <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fill="url(#aicost)" name="Cost (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cost by Plan</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Plan</TableHead><TableHead>Calls</TableHead><TableHead>Cost</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(data?.aiCost?.byPlan ?? []).map((r) => (
                    <TableRow key={r.plan}>
                      <TableCell><Badge variant={r.plan === "free" || r.plan === "anonymous" ? "secondary" : "default"}>{r.plan}</Badge></TableCell>
                      <TableCell>{r.calls}</TableCell>
                      <TableCell className={r.plan === "free" && r.cost > (data?.metrics.mrrINR ?? 0) * 0.1 ? "text-amber-500 font-semibold" : ""}>₹{r.cost}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> Cost by Feature (30d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.aiCost?.byFeature ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="feature" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any, n: any) => n === "cost" ? `₹${v}` : v} />
                <Bar dataKey="calls" fill="hsl(var(--muted))" name="Calls" />
                <Bar dataKey="cost" fill="hsl(var(--primary))" name="Cost (₹)" />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Feature</TableHead><TableHead>Calls</TableHead><TableHead>Input tokens</TableHead>
                  <TableHead>Output tokens</TableHead><TableHead>Avg cost</TableHead><TableHead>Total cost</TableHead><TableHead>Errors</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(data?.aiCost?.byFeature ?? []).map((r) => (
                    <TableRow key={r.feature}>
                      <TableCell className="font-semibold">{r.feature}</TableCell>
                      <TableCell>{r.calls}</TableCell>
                      <TableCell>{r.input.toLocaleString()}</TableCell>
                      <TableCell>{r.output.toLocaleString()}</TableCell>
                      <TableCell>₹{r.avgCost}</TableCell>
                      <TableCell className="font-semibold">₹{r.cost}</TableCell>
                      <TableCell className={r.errors > 0 ? "text-amber-500" : "text-muted-foreground"}>{r.errors}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.aiCost?.byFeature || data.aiCost.byFeature.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No AI usage logged yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> Cost by User (lifetime)</CardTitle>
                <p className="text-xs text-muted-foreground">Exact token counts and cost per user. Click a row to open the full user profile.</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportUserLedgerCsv} disabled={!data?.aiCost?.byUser?.length}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Range:</span>
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={rangePreset === String(d) ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => applyPreset(d)}
                  disabled={busy}
                >
                  Last {d}d
                </Button>
              ))}
              <Input
                type="date"
                value={aiFrom}
                max={aiTo}
                onChange={(e) => { setAiFrom(e.target.value); setRangePreset("custom"); }}
                className="h-7 w-[140px] text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={aiTo}
                min={aiFrom}
                onChange={(e) => { setAiTo(e.target.value); setRangePreset("custom"); }}
                className="h-7 w-[140px] text-xs"
              />
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => load()} disabled={busy}>Apply</Button>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>User</TableHead><TableHead>Plan</TableHead><TableHead>Calls</TableHead>
                  <TableHead>Input tokens</TableHead><TableHead>Output tokens</TableHead>
                  <TableHead>Avg cost</TableHead><TableHead>Cost ({rangeLabel})</TableHead><TableHead>Total cost</TableHead>
                  <TableHead>Exact</TableHead><TableHead>Errors</TableHead><TableHead>Last used</TableHead>
                </TableRow></TableHeader>

                <TableBody>
                  {(data?.aiCost?.byUser ?? []).map((r) => (
                    <TableRow
                      key={r.user_id}
                      className={r.user_id !== "anonymous" ? "cursor-pointer" : ""}
                      onClick={() => r.user_id !== "anonymous" && setSelectedUser(r.user_id)}
                    >
                      <TableCell className="font-medium max-w-[220px] truncate">{r.email || r.user_id}</TableCell>
                      <TableCell><Badge variant={r.plan === "pro" || r.plan === "basic" ? "default" : "secondary"}>{r.plan || "—"}</Badge></TableCell>
                      <TableCell>{r.calls.toLocaleString()}</TableCell>
                      <TableCell>{r.input.toLocaleString()}</TableCell>
                      <TableCell>{r.output.toLocaleString()}</TableCell>
                      <TableCell>₹{r.avgCost.toFixed(4)}</TableCell>
                      <TableCell>₹{r.cost30d.toFixed(4)}</TableCell>
                      <TableCell className="font-semibold">₹{r.cost.toFixed(4)}</TableCell>
                      <TableCell className={r.exactPct < 100 ? "text-amber-500" : "text-muted-foreground"}>{r.exactPct.toFixed(0)}%</TableCell>
                      <TableCell className={r.errors > 0 ? "text-amber-500" : "text-muted-foreground"}>{r.errors}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{r.last ? new Date(r.last).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.aiCost?.byUser || data.aiCost.byUser.length === 0) && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">No AI usage logged yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>



        {/* Ops, moderation, audit */}
        <AdminOpsPanels selectUser={setSelectedUser} />

        {/* Financial */}
        <FinancialPanel />

        {/* Growth */}
        <GrowthPanel selectUser={setSelectedUser} />

        {/* Users table */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Users ({data?.users.filter(u => {
                const q = search.toLowerCase();
                const matchQ = !q || (u.email?.toLowerCase().includes(q)) || (u.display_name?.toLowerCase().includes(q));
                const matchP = planFilter === "all" || u.plan === planFilter;
                return matchQ && matchP;
              }).length ?? 0})</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search email or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {busy ? <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead><TableHead>Tags</TableHead><TableHead>Scans</TableHead>
                    <TableHead>Joined</TableHead><TableHead>Change Plan</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data?.users.filter(u => {
                      const q = search.toLowerCase();
                      const matchQ = !q || (u.email?.toLowerCase().includes(q)) || (u.display_name?.toLowerCase().includes(q));
                      const matchP = planFilter === "all" || u.plan === planFilter;
                      return matchQ && matchP;
                    }).map((u) => (
                      <TableRow key={u.user_id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedUser(u.user_id)}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.display_name || "—"}</TableCell>
                        <TableCell><Badge variant={u.plan === "free" ? "secondary" : "default"}>{u.plan}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={u.status === "banned" ? "destructive" : u.status === "suspended" ? "outline" : "default"}>
                            {u.status ?? u.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-0.5 max-w-[140px]">
                            {(u.tags ?? []).slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell>{u.scans_used_month}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select disabled={updating === u.user_id} value={u.plan} onValueChange={(v) => updatePlan(u.user_id, v)}>
                            <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedUser(u.user_id); }}>Manage →</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <UserDetailDrawer
        userId={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onChanged={load}
      />
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone?: "warn" }) {
  return (
    <Card className={tone === "warn" ? "border-amber-500/40" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
        <span className={tone === "warn" ? "text-amber-500" : "text-muted-foreground"}>{icon}</span>
      </CardHeader>
      <CardContent><div className="text-2xl font-display font-bold">{value}</div></CardContent>
    </Card>
  );
}
