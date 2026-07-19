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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { bustFlagCache } from "@/lib/featureFlags";
import { Megaphone, Repeat, Gift, ToggleLeft, Users, Trash2, Loader2, Plus, Send } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const call = async (action: string, extra: any = {}) => {
  const { data, error } = await supabase.functions.invoke("admin-growth-ops", { body: { action, ...extra } });
  if (error || (data as any)?.error) {
    toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
    return null;
  }
  return data as any;
};

export function GrowthPanel({ selectUser }: { selectUser: (id: string) => void }) {
  const [tab, setTab] = useState("broadcasts");
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<{ cohorts: any[]; weeks: string[] } | null>(null);
  const [refs, setRefs] = useState<{ referrals: any[]; leaderboard: any[]; total: number } | null>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  const load = {
    broadcasts: async () => { const r = await call("list_broadcasts"); if (r) setBroadcasts(r.broadcasts); },
    cohorts: async () => { const r = await call("cohort_retention", { weeks: 8 }); if (r) setCohorts(r); },
    refs: async () => { const r = await call("list_referrals"); if (r) setRefs(r); },
    flags: async () => { const r = await call("list_flags"); if (r) setFlags(r.flags); },
    leads: async () => { const r = await call("list_leads"); if (r) setLeads(r.leads); },
  };

  useEffect(() => { load.broadcasts(); load.cohorts(); load.refs(); load.flags(); load.leads(); /* eslint-disable-next-line */ }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Growth & Ops</CardTitle></CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="broadcasts"><Megaphone className="h-3.5 w-3.5 mr-1" />Broadcasts</TabsTrigger>
            <TabsTrigger value="cohorts"><Repeat className="h-3.5 w-3.5 mr-1" />Retention</TabsTrigger>
            <TabsTrigger value="refs"><Gift className="h-3.5 w-3.5 mr-1" />Referrals</TabsTrigger>
            <TabsTrigger value="flags"><ToggleLeft className="h-3.5 w-3.5 mr-1" />Flags</TabsTrigger>
            <TabsTrigger value="leads"><Users className="h-3.5 w-3.5 mr-1" />Leads ({leads.length})</TabsTrigger>
          </TabsList>

          {/* BROADCASTS */}
          <TabsContent value="broadcasts" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">In-app announcement banners to a segment. Users see it until they dismiss it or it expires.</p>
              <BroadcastForm onSent={load.broadcasts} />
            </div>
            <div className="overflow-x-auto border rounded">
              <Table>
                <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Segment</TableHead><TableHead>Audience</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {broadcasts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No broadcasts yet.</TableCell></TableRow>}
                  {broadcasts.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-[240px]"><div className="font-medium truncate">{b.subject}</div><div className="text-[10px] text-muted-foreground truncate">{b.body}</div></TableCell>
                      <TableCell className="text-xs"><code className="text-[10px]">{JSON.stringify(b.segment)}</code></TableCell>
                      <TableCell className="text-xs">{b.audience_count}</TableCell>
                      <TableCell><Badge variant={b.status === "sent" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(b.created_at).toLocaleString()}</TableCell>
                      <TableCell>{b.status === "sent" && <Button size="sm" variant="ghost" onClick={async () => { await call("cancel_broadcast", { id: b.id }); load.broadcasts(); }}>End</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* COHORTS */}
          <TabsContent value="cohorts" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Week-over-week retention. Each row = users who signed up that week; each column = % still active in a later week.</p>
            {!cohorts ? <div className="text-sm text-muted-foreground text-center py-6">Loading…</div> : (
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-2 text-left">Cohort</th><th className="p-2 text-left">Size</th>
                      {cohorts.weeks.map((_, i) => <th key={i} className="p-2 text-center">W{i}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.cohorts.map((c) => (
                      <tr key={c.cohort} className="border-t">
                        <td className="p-2 font-medium whitespace-nowrap">{c.cohort}</td>
                        <td className="p-2">{c.size}</td>
                        {cohorts.weeks.map((_, i) => {
                          const v = c[`w${i}`];
                          const bg = v == null ? "bg-transparent" : v >= 60 ? "bg-emerald-500/40" : v >= 30 ? "bg-emerald-500/25" : v > 0 ? "bg-emerald-500/10" : "bg-muted/30";
                          return <td key={i} className={`p-2 text-center ${bg}`}>{v == null ? "" : `${v}%`}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* REFERRALS */}
          <TabsContent value="refs" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Every user gets a referral code. Each side gets +3 bonus scans when a new user signs up with it.</p>
            {!refs ? <div className="text-sm text-muted-foreground text-center py-6">Loading…</div> : (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Leaderboard</div>
                  <div className="border rounded overflow-hidden">
                    <Table>
                      <TableHeader><TableRow><TableHead>Referrer</TableHead><TableHead>Invites</TableHead><TableHead>Paid</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {refs.leaderboard.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No referrals yet.</TableCell></TableRow>}
                        {refs.leaderboard.map((r) => (
                          <TableRow key={r.user_id} className="cursor-pointer" onClick={() => selectUser(r.user_id)}>
                            <TableCell className="text-xs">{r.email ?? r.user_id.slice(0, 8)}</TableCell>
                            <TableCell className="text-xs font-semibold">{r.invites}</TableCell>
                            <TableCell className="text-xs text-emerald-600 font-semibold">{r.paid}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Recent invites</div>
                  <div className="border rounded max-h-[380px] overflow-y-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Referrer</TableHead><TableHead>New user</TableHead><TableHead>Plan</TableHead><TableHead>Code</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {refs.referrals.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{r.referrer_email ?? r.referrer_user_id.slice(0, 8)}</TableCell>
                            <TableCell className="text-xs">{r.referred_email ?? r.referred_user_id.slice(0, 8)}</TableCell>
                            <TableCell><Badge variant={r.referred_plan === "free" || !r.referred_plan ? "secondary" : "default"} className="text-[10px]">{r.referred_plan ?? "—"}</Badge></TableCell>
                            <TableCell className="font-mono text-[10px]">{r.code}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* FEATURE FLAGS */}
          <TabsContent value="flags" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Turn features on/off per plan or roll out to a % of users.</p>
              <FlagForm onSaved={() => { load.flags(); bustFlagCache(); }} />
            </div>
            <div className="border rounded overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Description</TableHead><TableHead>Enabled</TableHead><TableHead>Plans</TableHead><TableHead>Rollout</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {flags.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs font-semibold">{f.key}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{f.description ?? "—"}</TableCell>
                      <TableCell>
                        <Switch checked={f.enabled} onCheckedChange={async (v) => { await call("upsert_flag", { ...f, enabled: v }); load.flags(); bustFlagCache(); }} />
                      </TableCell>
                      <TableCell className="text-xs">{f.plans.map((p: string) => <Badge key={p} variant="outline" className="mr-1 text-[10px]">{p}</Badge>)}</TableCell>
                      <TableCell className="text-xs">{f.rollout_percent}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <FlagForm existing={f} onSaved={() => { load.flags(); bustFlagCache(); }} />
                          <Button size="icon" variant="ghost" onClick={async () => { if (confirm(`Delete flag ${f.key}?`)) { await call("delete_flag", { key: f.key }); load.flags(); bustFlagCache(); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* LEADS */}
          <TabsContent value="leads" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Waitlist / early-access signups. Grant bonus scan on sign-up (already wired).</p>
              <LeadForm onAdded={load.leads} />
            </div>
            <div className="border rounded overflow-x-auto max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>Email</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead>Granted</TableHead><TableHead>When</TableHead><TableHead>Notes</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {leads.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No leads yet.</TableCell></TableRow>}
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.email}</TableCell>
                      <TableCell className="text-xs"><Badge variant="outline">{l.source}</Badge></TableCell>
                      <TableCell>
                        <Select value={l.status ?? "new"} onValueChange={async (v) => { await call("update_lead", { id: l.id, status: v }); load.leads(); }}>
                          <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="converted">Converted</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{l.granted ? <Badge>✓</Badge> : <Badge variant="secondary">—</Badge>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Input defaultValue={l.notes ?? ""} className="h-7 text-xs" onBlur={async (e) => { if (e.target.value !== (l.notes ?? "")) await call("update_lead", { id: l.id, notes: e.target.value }); }} /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={async () => { if (confirm(`Delete ${l.email}?`)) { await call("delete_lead", { id: l.id }); load.leads(); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function BroadcastForm({ onSent }: { onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ subject: "", body: "", cta_label: "", cta_url: "", severity: "info", segment: { plan: "all", active_days: "" }, ends_at: "" });
  const [preview, setPreview] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const segment = () => {
    const s: any = {};
    if (form.segment.plan !== "all") s.plan = form.segment.plan;
    if (form.segment.active_days) s.active_days = Number(form.segment.active_days);
    if (form.segment.min_scans) s.min_scans = Number(form.segment.min_scans);
    if (form.segment.created_after) s.created_after = form.segment.created_after;
    return s;
  };
  const doPreview = async () => { const r = await call("audience_preview", { segment: segment() }); if (r) setPreview(r.count); };
  const doSend = async () => {
    setBusy(true);
    const r = await call("send_broadcast", { subject: form.subject, body: form.body, cta_label: form.cta_label || null, cta_url: form.cta_url || null, severity: form.severity, segment: segment(), ends_at: form.ends_at || null });
    setBusy(false);
    if (r) { toast({ title: "Broadcast sent", description: `To ${r.sent} users` }); setOpen(false); onSent(); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New broadcast</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Send broadcast</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Body</Label><Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="warn">Warning</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>CTA label</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
            <div><Label>CTA URL</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Segment</div>
            <div className="grid grid-cols-4 gap-2">
              <div><Label className="text-xs">Plan</Label>
                <Select value={form.segment.plan} onValueChange={(v) => setForm({ ...form, segment: { ...form.segment, plan: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="free">Free</SelectItem><SelectItem value="basic">Basic</SelectItem><SelectItem value="pro">Pro</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Active last N days</Label><Input type="number" placeholder="e.g. 7" value={form.segment.active_days} onChange={(e) => setForm({ ...form, segment: { ...form.segment, active_days: e.target.value } })} /></div>
              <div><Label className="text-xs">Min scans</Label><Input type="number" value={form.segment.min_scans ?? ""} onChange={(e) => setForm({ ...form, segment: { ...form.segment, min_scans: e.target.value } })} /></div>
              <div><Label className="text-xs">Created after</Label><Input type="date" value={form.segment.created_after ?? ""} onChange={(e) => setForm({ ...form, segment: { ...form.segment, created_after: e.target.value } })} /></div>
            </div>
          </div>
          <div><Label>Ends at (optional)</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          {preview != null && <div className="text-xs bg-muted/40 p-2 rounded">Audience preview: <b>{preview}</b> users</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={doPreview}>Preview audience</Button>
          <Button onClick={doSend} disabled={busy || !form.subject || !form.body}><Send className="h-4 w-4 mr-1" />{busy ? "Sending…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlagForm({ existing, onSaved }: { existing?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(existing || { key: "", description: "", enabled: true, plans: ["free", "basic", "pro"], rollout_percent: 100 });
  useEffect(() => { if (open && existing) setForm(existing); }, [open, existing]);
  const toggle = (p: string) => setForm({ ...form, plans: form.plans.includes(p) ? form.plans.filter((x: string) => x !== p) : [...form.plans, p] });
  const save = async () => { const r = await call("upsert_flag", form); if (r) { toast({ title: "Saved" }); setOpen(false); onSaved(); } };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{existing ? <Button size="sm" variant="ghost">Edit</Button> : <Button size="sm"><Plus className="h-4 w-4 mr-1" />New flag</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit flag" : "New feature flag"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Key</Label><Input disabled={!!existing} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="new_dashboard" /></div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Plans</Label>
            <div className="flex gap-2 mt-1">
              {["free", "basic", "pro"].map((p) => (
                <Button key={p} size="sm" variant={form.plans.includes(p) ? "default" : "outline"} onClick={() => toggle(p)}>{p}</Button>
              ))}
            </div>
          </div>
          <div><Label>Rollout %: {form.rollout_percent}</Label>
            <input type="range" min={0} max={100} value={form.rollout_percent} onChange={(e) => setForm({ ...form, rollout_percent: +e.target.value })} className="w-full" />
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>Enabled</Label></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={!form.key}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadForm({ onAdded }: { onAdded: () => void }) {
  const [email, setEmail] = useState("");
  return (
    <div className="flex gap-2">
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="h-8 text-xs w-[220px]" />
      <Button size="sm" onClick={async () => { const r = await call("add_lead", { email }); if (r) { setEmail(""); onAdded(); toast({ title: "Lead added" }); } }}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}
