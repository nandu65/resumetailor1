import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, IndianRupee, Crown, Shield, LogOut, TrendingDown, Activity, Target, AlertCircle, FlaskConical, Sparkles, Cpu, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ADMIN_EMAIL = "nandunaidu656565@gmail.com";

interface AdminUser {
  user_id: string; email: string | null; display_name: string | null;
  plan: string; subscription_status: string; scans_used_month: number;
  current_period_end: string | null; created_at: string;
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
    byFeature: { feature: string; calls: number; input: number; output: number; cost: number; errors: number; avgCost: number }[];
    byPlan: { plan: string; calls: number; input: number; output: number; cost: number; avgCost: number }[];
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

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const load = async () => {
    setBusy(true);
    const { data: res, error } = await supabase.functions.invoke("admin-list-users");
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setData(res as AdminData);
    setBusy(false);
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
                <Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={signingIn}>{signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}</Button>
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
            <Button variant="outline" size="sm" onClick={load} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}</Button>
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

        {/* Users table */}
        <Card>
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent>
            {busy ? <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead><TableHead>Scans</TableHead><TableHead>Joined</TableHead><TableHead>Change Plan</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data?.users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.display_name || "—"}</TableCell>
                        <TableCell><Badge variant={u.plan === "free" ? "secondary" : "default"}>{u.plan}</Badge></TableCell>
                        <TableCell><Badge variant={u.subscription_status === "active" ? "default" : "outline"}>{u.subscription_status}</Badge></TableCell>
                        <TableCell>{u.scans_used_month}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select disabled={updating === u.user_id} value={u.plan} onValueChange={(v) => updatePlan(u.user_id, v)}>
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
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
