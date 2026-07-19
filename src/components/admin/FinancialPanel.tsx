import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CreditCard, TicketPercent, TrendingUp, RefreshCw, Loader2, Plus, RotateCw, Send, Trash2, Globe, IndianRupee } from "lucide-react";

const call = async (action: string, extra: any = {}) => {
  const { data, error } = await supabase.functions.invoke("admin-financial-ops", { body: { action, ...extra } });
  if (error || (data as any)?.error) {
    toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
    return null;
  }
  return data as any;
};

export function FinancialPanel() {
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponStats, setCouponStats] = useState<Record<string, { count: number; discount: number }>>({});
  const [breakdown, setBreakdown] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  const loadPayments = async () => {
    setBusy(true);
    const res = await call("list_payments", { status: statusFilter === "all" ? null : statusFilter, q: q || null });
    if (res) setPayments(res.payments);
    setBusy(false);
  };
  const loadCoupons = async () => {
    const [a, b] = await Promise.all([call("list_coupons"), call("coupon_stats")]);
    if (a) setCoupons(a.coupons);
    if (b) setCouponStats(b.totals);
  };
  const loadBreakdown = async () => {
    const r = await call("revenue_breakdown", { days: 30 });
    if (r) setBreakdown(r);
  };

  useEffect(() => { loadPayments(); loadCoupons(); loadBreakdown(); /* eslint-disable-next-line */ }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><IndianRupee className="h-4 w-4 text-primary" /> Financial Control</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="payments"><CreditCard className="h-3.5 w-3.5 mr-1" />Payments</TabsTrigger>
            <TabsTrigger value="coupons"><TicketPercent className="h-3.5 w-3.5 mr-1" />Coupons</TabsTrigger>
            <TabsTrigger value="breakdown"><TrendingUp className="h-3.5 w-3.5 mr-1" />Revenue</TabsTrigger>
          </TabsList>

          {/* PAYMENTS */}
          <TabsContent value="payments" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Search</Label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="order/payment id, email, coupon" />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="signature_failed">Signature failed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={loadPayments} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
            </div>
            <div className="overflow-x-auto border rounded max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>When</TableHead><TableHead>Email</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead><TableHead>Coupon</TableHead><TableHead>Tier / Variant</TableHead>
                    <TableHead>Order</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No payments recorded.</TableCell></TableRow>}
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{p.email ?? "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <span className="font-semibold">₹{(p.amount_paise / 100).toFixed(0)}</span>
                        {p.discount_paise > 0 && <span className="text-emerald-600 ml-1">−₹{(p.discount_paise / 100).toFixed(0)}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "paid" ? "default" : p.status === "created" ? "secondary" : "destructive"} className="text-[10px]">{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{p.coupon_code ?? "—"}</TableCell>
                      <TableCell className="text-xs">{p.tier ?? "—"} {p.variant && <span className="text-muted-foreground">/ {p.variant}</span>}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{p.order_id?.slice(-10) ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.status !== "paid" && p.order_id && (
                            <Button size="sm" variant="ghost" title="Get fresh checkout link" onClick={async () => {
                              const r = await call("retry_payment", { order_id: p.order_id });
                              if (r?.checkout_link) {
                                await navigator.clipboard.writeText(r.checkout_link);
                                toast({ title: "Checkout link copied", description: "Send it to the user to retry." });
                              }
                            }}><RotateCw className="h-3.5 w-3.5" /></Button>
                          )}
                          {p.status === "paid" && p.payment_id && (
                            <Button size="sm" variant="ghost" title="Resend invoice" onClick={async () => {
                              const r = await call("resend_invoice", { payment_id: p.payment_id });
                              if (r?.short_url) toast({ title: "Invoice sent", description: r.short_url });
                            }}><Send className="h-3.5 w-3.5" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* COUPONS */}
          <TabsContent value="coupons" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Create %-off or flat ₹-off codes. Applied at checkout.</p>
              <CouponForm onCreated={loadCoupons} />
            </div>
            <div className="overflow-x-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Applies</TableHead>
                    <TableHead>Uses</TableHead><TableHead>Total ₹ saved</TableHead>
                    <TableHead>Expires</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No coupons yet. Create one!</TableCell></TableRow>}
                  {coupons.map((c) => {
                    const st = couponStats[c.code];
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                        <TableCell>{c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`}</TableCell>
                        <TableCell><Badge variant="outline">{c.applies_to}</Badge></TableCell>
                        <TableCell className="text-xs">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                        <TableCell className="text-xs">₹{(st?.discount ?? 0).toFixed(0)}</TableCell>
                        <TableCell className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant={c.active ? "default" : "outline"} onClick={async () => { await call("update_coupon", { id: c.id, active: !c.active }); loadCoupons(); }}>
                            {c.active ? "On" : "Off"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={async () => { if (confirm(`Delete coupon ${c.code}?`)) { await call("delete_coupon", { id: c.id }); loadCoupons(); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* REVENUE BREAKDOWN */}
          <TabsContent value="breakdown" className="mt-4 space-y-4">
            {!breakdown ? <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div> : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Mini label="Gross (30d)" value={`₹${breakdown.gross.toLocaleString("en-IN")}`} />
                  <Mini label="Discount given" value={`₹${breakdown.discount.toLocaleString("en-IN")}`} />
                  <Mini label="Paid checkouts" value={breakdown.paid_count} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <BreakdownChart title="By pricing variant (A/B)" data={breakdown.byVariant} />
                  <BreakdownChart title="By country" icon={<Globe className="h-3.5 w-3.5" />} data={breakdown.byCountry} />
                  <BreakdownChart title="By acquisition source" data={breakdown.bySource} />
                  <BreakdownChart title="By UTM campaign" data={breakdown.byCampaign} />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function BreakdownChart({ title, data, icon }: { title: string; data: any[]; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5 uppercase tracking-wide text-muted-foreground">{icon}{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <div className="text-xs text-muted-foreground text-center py-4">No data</div> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="key" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => `₹${v}`} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CouponForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", discount_type: "percent", discount_value: 20, applies_to: "all", max_uses: "", expires_at: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const res = await call("create_coupon", { ...form, max_uses: form.max_uses || null, expires_at: form.expires_at || null });
    setBusy(false);
    if (res) { toast({ title: "Coupon created" }); setOpen(false); onCreated(); setForm({ code: "", discount_type: "percent", discount_value: 20, applies_to: "all", max_uses: "", expires_at: "", notes: "" }); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New coupon</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create coupon</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percent">% off</SelectItem><SelectItem value="flat">₹ off</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Applies to</Label>
              <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All plans</SelectItem><SelectItem value="pro">Pro only</SelectItem><SelectItem value="basic">Basic only</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Max uses</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="unlimited" /></div>
          </div>
          <div><Label>Expires (optional)</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !form.code}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
