import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Activity, Loader2, ShieldAlert, Users, Flag, Trash2, Eye, RefreshCcw,
} from "lucide-react";

const KIND_COLORS: Record<string, string> = {
  signup: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  login: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  login_failed: "bg-red-500/15 text-red-600 dark:text-red-400",
  scan: "bg-primary/15 text-primary",
  ai: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  payment: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  pricing: "bg-muted text-foreground",
  admin: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

export function AdminOpsPanels({ selectUser }: { selectUser: (id: string) => void }) {
  const [online, setOnline] = useState<any[]>([]);
  const [failed, setFailed] = useState<{ attempts: any[]; suspicious_ips: { ip: string; count: number }[] }>({ attempts: [], suspicious_ips: [] });
  const [audit, setAudit] = useState<any[]>([]);
  const [flagged, setFlagged] = useState<any[]>([]);
  const [quick, setQuick] = useState<{ online_15m: number; failed_logins_24h: number; flagged_content: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("online");

  const [viewContent, setViewContent] = useState<any | null>(null);
  const [viewReason, setViewReason] = useState("");
  const [pendingView, setPendingView] = useState<{ id: string; title?: string } | null>(null);

  const call = async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-user-actions", { body: { action, ...body } });
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return null;
    }
    return data;
  };

  const loadAll = async () => {
    setBusy(true);
    const [s, o, f, a, fl] = await Promise.all([
      call("quick_stats"),
      call("list_online"),
      call("list_failed_logins", { limit: 200 }),
      call("list_all_audit", { limit: 200 }),
      call("list_flagged_jds"),
    ]);
    if (s) setQuick(s as any);
    if (o) setOnline((o as any).online ?? []);
    if (f) setFailed(f as any);
    if (a) setAudit((a as any).log ?? []);
    if (fl) setFlagged((fl as any).items ?? []);
    setBusy(false);
  };

  useEffect(() => { loadAll(); const iv = setInterval(() => call("quick_stats").then((s) => s && setQuick(s as any)), 30_000); return () => clearInterval(iv); /* eslint-disable-next-line */ }, []);

  const openContent = (id: string, title?: string) => { setPendingView({ id, title }); setViewReason(""); };

  const confirmView = async () => {
    if (!pendingView) return;
    if (viewReason.trim().length < 5) { toast({ title: "Reason required", description: "Please enter a reason (min 5 chars) — this is logged.", variant: "destructive" }); return; }
    const res = await call("view_content", { optimization_id: pendingView.id, reason: viewReason });
    if (res) { setViewContent((res as any).optimization); setPendingView(null); }
  };

  const deleteOpt = async (id: string) => {
    const reason = prompt("Reason for deleting this content (audit-logged)?");
    if (!reason || reason.length < 3) return;
    const res = await call("delete_optimization", { optimization_id: id, reason });
    if (res) { toast({ title: "Deleted" }); loadAll(); setViewContent(null); }
  };

  const toggleFlag = async (id: string, flagged: boolean, reason?: string) => {
    const r = flagged ? (reason ?? prompt("Reason for flagging?") ?? "manual review") : "";
    const res = await call("flag_optimization", { optimization_id: id, flagged, reason: r });
    if (res) { toast({ title: flagged ? "Flagged" : "Unflagged" }); loadAll(); }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <MiniKpi label="Online now (15m)" value={quick?.online_15m ?? 0} icon={<Activity className="h-4 w-4" />} live />
        <MiniKpi label="Failed logins (24h)" value={quick?.failed_logins_24h ?? 0} icon={<ShieldAlert className="h-4 w-4" />} tone={(quick?.failed_logins_24h ?? 0) > 10 ? "warn" : undefined} />
        <MiniKpi label="Flagged content" value={quick?.flagged_content ?? 0} icon={<Flag className="h-4 w-4" />} tone={(quick?.flagged_content ?? 0) > 0 ? "warn" : undefined} />
        <MiniKpi label="Suspicious IPs" value={failed.suspicious_ips.length} icon={<Users className="h-4 w-4" />} tone={failed.suspicious_ips.length > 0 ? "warn" : undefined} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Operations & Moderation</CardTitle>
          <Button size="sm" variant="outline" onClick={loadAll} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}</Button>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="online">Online ({online.length})</TabsTrigger>
              <TabsTrigger value="failed">Failed logins ({failed.attempts.length})</TabsTrigger>
              <TabsTrigger value="audit">Audit log ({audit.length})</TabsTrigger>
              <TabsTrigger value="moderation">Moderation ({flagged.length})</TabsTrigger>
            </TabsList>

            {/* ONLINE NOW */}
            <TabsContent value="online" className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Users active in the last 15 minutes (heartbeat every 60s).</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Plan</TableHead><TableHead>Page</TableHead><TableHead>Last seen</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {online.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nobody online right now.</TableCell></TableRow>}
                    {online.map((u) => {
                      const secs = Math.round((Date.now() - new Date(u.last_seen).getTime()) / 1000);
                      return (
                        <TableRow key={u.user_id} className="cursor-pointer hover:bg-muted/40" onClick={() => selectUser(u.user_id)}>
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              {u.email ?? u.user_id.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell><Badge variant={u.plan === "free" ? "secondary" : "default"}>{u.plan ?? "—"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{u.path ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{secs < 60 ? `${secs}s ago` : `${Math.round(secs / 60)}m ago`}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* FAILED LOGINS */}
            <TabsContent value="failed" className="mt-4 space-y-4">
              {failed.suspicious_ips.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                  <div className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 mb-2">Possible brute-force — IPs with 5+ failed attempts</div>
                  <div className="flex flex-wrap gap-2">
                    {failed.suspicious_ips.map((s) => (
                      <Badge key={s.ip} variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">{s.ip} · {s.count} attempts</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Email</TableHead><TableHead>IP</TableHead><TableHead>Error</TableHead><TableHead>User agent</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {failed.attempts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No failed logins recorded.</TableCell></TableRow>}
                    {failed.attempts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.ip ?? "—"}</TableCell>
                        <TableCell className="text-xs text-red-500">{r.error ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[220px]">{r.user_agent ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* GLOBAL AUDIT LOG */}
            <TabsContent value="audit" className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Every admin action — who did what, when, on which user. Critical for trust.</p>
              <div className="max-h-[520px] overflow-y-auto border rounded divide-y">
                {audit.length === 0 && <p className="p-3 text-xs text-muted-foreground">No admin actions yet.</p>}
                {audit.map((r) => (
                  <div key={r.id} className="p-2.5 text-xs hover:bg-muted/40">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{r.action}</Badge>
                        <span className="text-muted-foreground">by <b>{r.admin_email}</b></span>
                        {r.target_user_id && (
                          <button className="text-primary hover:underline" onClick={() => selectUser(r.target_user_id)}>
                            → user {r.target_user_id.slice(0, 8)}…
                          </button>
                        )}
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    {r.details && Object.keys(r.details).length > 0 && (
                      <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(r.details)}</pre>
                    )}
                    {r.ip && <div className="text-[10px] text-muted-foreground mt-0.5">IP: {r.ip}</div>}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* MODERATION */}
            <TabsContent value="moderation" className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Scans whose job description matches known prompt-injection / abuse patterns, plus anything you've flagged manually.</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Title</TableHead><TableHead>Signals</TableHead><TableHead>Excerpt</TableHead>
                    <TableHead>Score</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {flagged.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No suspicious content.</TableCell></TableRow>}
                    {flagged.map((o) => (
                      <TableRow key={o.id} className={o.flagged ? "bg-red-500/5" : ""}>
                        <TableCell className="max-w-[180px]">
                          <div className="font-medium truncate">{o.title || o.role || "Untitled"}</div>
                          {o.company && <div className="text-[10px] text-muted-foreground">{o.company}</div>}
                          <button className="text-[10px] text-primary hover:underline" onClick={() => selectUser(o.user_id)}>user {o.user_id.slice(0, 8)}…</button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {o.flagged && <Badge variant="destructive" className="text-[10px]">flagged</Badge>}
                            {o.hits.map((h: string) => <Badge key={h} variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">{h}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[280px]"><div className="text-[11px] text-muted-foreground line-clamp-3">{o.excerpt}</div></TableCell>
                        <TableCell className="text-xs">{o.ats_score ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title="View content (logged)" onClick={() => openContent(o.id, o.title)}><Eye className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" title={o.flagged ? "Unflag" : "Flag"} onClick={() => toggleFlag(o.id, !o.flagged)}>
                              <Flag className={`h-4 w-4 ${o.flagged ? "text-red-500 fill-red-500" : ""}`} />
                            </Button>
                            <Button size="icon" variant="ghost" title="Delete abusive content" onClick={() => deleteOpt(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reason-for-access prompt */}
      <Dialog open={!!pendingView} onOpenChange={(v) => !v && setPendingView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for accessing user content</DialogTitle>
            <DialogDescription>
              You're about to view a user's resume + job description. This access is logged to the audit trail with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (required, min 5 characters)</Label>
            <Textarea value={viewReason} onChange={(e) => setViewReason(e.target.value)} placeholder="e.g. Investigating abuse report #123 / user requested support / suspected prompt injection" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingView(null)}>Cancel</Button>
            <Button onClick={confirmView}>View & log access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewContent} onOpenChange={(v) => !v && setViewContent(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewContent?.title || viewContent?.role || "Content"}
              {viewContent?.flagged && <Badge variant="destructive">flagged</Badge>}
            </DialogTitle>
            <DialogDescription>User: {viewContent?.user_id?.slice(0, 8)}… · {viewContent?.company} · Score {viewContent?.ats_score ?? "—"}</DialogDescription>
          </DialogHeader>
          {viewContent && (
            <Tabs defaultValue="jd">
              <TabsList><TabsTrigger value="jd">Job description</TabsTrigger><TabsTrigger value="resume">Resume</TabsTrigger></TabsList>
              <TabsContent value="jd"><pre className="text-xs whitespace-pre-wrap bg-muted/40 p-3 rounded max-h-[50vh] overflow-y-auto">{viewContent.job_description}</pre></TabsContent>
              <TabsContent value="resume"><pre className="text-xs whitespace-pre-wrap bg-muted/40 p-3 rounded max-h-[50vh] overflow-y-auto">{viewContent.resume_text}</pre></TabsContent>
            </Tabs>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => viewContent && toggleFlag(viewContent.id, !viewContent.flagged)}>
              <Flag className="h-4 w-4 mr-1" /> {viewContent?.flagged ? "Unflag" : "Flag"}
            </Button>
            <Button variant="destructive" onClick={() => viewContent && deleteOpt(viewContent.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Per-user activity timeline (used inside UserDetailDrawer)
export function UserActivityTimeline({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.functions.invoke("admin-user-actions", { body: { action: "list_activity", user_id: userId } });
      if (!cancel) setItems((data as any)?.timeline ?? []);
    })();
    return () => { cancel = true; };
  }, [userId]);

  if (items === null) return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (items.length === 0) return <p className="text-xs text-muted-foreground p-3">No activity yet.</p>;

  return (
    <div className="relative pl-6 space-y-3 max-h-[520px] overflow-y-auto">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      {items.map((e, i) => (
        <div key={i} className="relative">
          <span className="absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          <div className="flex justify-between items-start gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={KIND_COLORS[e.kind] ?? "bg-muted"}>{e.kind.replace("_", " ")}</Badge>
              <span className="text-xs">{e.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(e.ts).toLocaleString()}</span>
          </div>
          {e.meta && Object.keys(e.meta).length > 0 && (
            <pre className="text-[10px] text-muted-foreground ml-1 mt-0.5 whitespace-pre-wrap break-all">{JSON.stringify(e.meta)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniKpi({ label, value, icon, tone, live }: { label: string; value: number | string; icon: React.ReactNode; tone?: "warn"; live?: boolean }) {
  return (
    <Card className={tone === "warn" ? "border-amber-500/40" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          {label}
        </CardTitle>
        <span className={tone === "warn" ? "text-amber-500" : "text-muted-foreground"}>{icon}</span>
      </CardHeader>
      <CardContent><div className="text-2xl font-display font-bold">{value}</div></CardContent>
    </Card>
  );
}
