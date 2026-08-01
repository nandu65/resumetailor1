import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Mail, KeyRound, ShieldOff, ShieldCheck, Trash2, IndianRupee, XCircle,
  Ban, UserCheck, Copy, Plus, Minus, RotateCcw, Eye, CheckCircle2, Tag, Activity, Flag, Download,
} from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/csv";
import { UserActivityTimeline } from "@/components/admin/AdminOpsPanels";

interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

interface Detail {
  profile: any;
  auth: any;
  optimizations: any[];
  ai_logs: any[];
  ai_totals?: {
    calls: number; input: number; output: number; cost: number;
    exactCalls: number; errors: number; avgCost: number; exactPct: number; usdToInr: number;
    byFeature: { feature: string; calls: number; input: number; output: number; cost: number }[];
  };
  ai_range?: {
    from: string | null; to: string;
    calls: number; input: number; output: number; cost: number;
    exactCalls: number; errors: number; avgCost: number; exactPct: number;
    byFeature: { feature: string; calls: number; input: number; output: number; cost: number }[];
  };
  pricing_events: any[];
  custom_offers?: any[];
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  suspended: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  banned: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export function UserDetailDrawer({ userId, open, onClose, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [d, setD] = useState<Detail | null>(null);
  const [audit, setAudit] = useState<any[]>([]);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [refundId, setRefundId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [grantDelta, setGrantDelta] = useState("5");
  const [offerTitle, setOfferTitle] = useState("Extra scan pack");
  const [offerDesc, setOfferDesc] = useState("");
  const [offerAmount, setOfferAmount] = useState("199");
  const [offerScans, setOfferScans] = useState("10");
  const [offerDays, setOfferDays] = useState("7");

  const [rangePreset, setRangePreset] = useState("30");
  const [rFrom, setRFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [rTo, setRTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async (from?: string, to?: string) => {
    if (!userId) return;
    setLoading(true);
    const ai_from = from ?? rFrom;
    const ai_to = to ?? rTo;
    const [{ data: r1 }, { data: r2 }] = await Promise.all([
      supabase.functions.invoke("admin-user-actions", { body: { action: "get_user_detail", user_id: userId, ai_from, ai_to } }),
      supabase.functions.invoke("admin-user-actions", { body: { action: "list_audit", user_id: userId } }),
    ]);
    const detail = r1 as Detail;
    setD(detail);
    setAudit((r2 as any)?.log ?? []);
    if (detail?.profile) {
      setEmail(detail.profile.email ?? "");
      setName(detail.profile.display_name ?? "");
      setNotes(detail.profile.notes ?? "");
      setTags(detail.profile.tags ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { if (open && userId) load(); /* eslint-disable-next-line */ }, [open, userId]);

  const call = async (action: string, body: any = {}, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(action);
    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action, user_id: userId, ...body },
    });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return null;
    }
    toast({ title: "Done" });
    await load();
    onChanged();
    return data;
  };

  const impersonate = async () => {
    const res = await call("impersonate", {});
    const link = (res as any)?.link;
    if (link) {
      await navigator.clipboard.writeText(link).catch(() => {});
      toast({ title: "Impersonation link copied", description: "Open in incognito to view as user." });
      window.open(link, "_blank");
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    call("update_tags", { tags: next });
  };
  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    call("update_tags", { tags: next });
  };

  const p = d?.profile;
  const a = d?.auth;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {p?.email ?? "User details"}
            {p?.status && <Badge className={STATUS_BADGE[p.status]}>{p.status}</Badge>}
            {p?.plan && <Badge variant={p.plan === "free" ? "secondary" : "default"}>{p.plan}</Badge>}
          </SheetTitle>
        </SheetHeader>

        {loading || !d ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="activity">Content</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            {/* TIMELINE */}
            <TabsContent value="timeline" className="mt-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Signups, sign-ins, scans, AI usage, payments, admin actions.</div>
              {userId && <UserActivityTimeline userId={userId} />}
            </TabsContent>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <Field label="User ID"><code className="text-xs">{p?.user_id}</code>
                <Button size="icon" variant="ghost" className="h-6 w-6 ml-1" onClick={() => navigator.clipboard.writeText(p?.user_id)}><Copy className="h-3 w-3" /></Button>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1"><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === "update_profile"} onClick={() => call("update_profile", { email, display_name: name })}>
                  {busy === "update_profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
                </Button>
                {!a?.email_confirmed_at && (
                  <Button size="sm" variant="outline" onClick={() => call("verify_email")}><CheckCircle2 className="h-4 w-4 mr-1" /> Verify email</Button>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Signed up">{p?.created_at ? new Date(p.created_at).toLocaleString() : "—"}</Field>
                <Field label="Last sign-in">{a?.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : "—"}</Field>
                <Field label="Email confirmed">{a?.email_confirmed_at ? "Yes" : "No"}</Field>
                <Field label="Providers">{(a?.providers ?? []).join(", ") || "email"}</Field>
                <Field label="Scans used (month)">{p?.scans_used_month}</Field>
                <Field label="Bonus scans granted">{p?.bonus_scans ?? 0}</Field>
                <Field label="Subscription">{p?.subscription_status}</Field>
                <Field label="Period ends">{p?.current_period_end ? new Date(p.current_period_end).toLocaleDateString() : "—"}</Field>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button onClick={() => removeTag(t)} className="ml-1 hover:text-destructive"><XCircle className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                  {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="VIP, chargeback risk…" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
                  <Button size="sm" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Internal notes</Label>
                <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Not visible to user…" />
                <Button size="sm" variant="outline" onClick={() => call("update_notes", { notes })}>Save notes</Button>
              </div>
            </TabsContent>

            {/* ACTIONS */}
            <TabsContent value="actions" className="space-y-5 mt-4">
              <Section title="Plan override">
                <div className="flex gap-2 items-center">
                  <Select value={p?.plan} onValueChange={(v) => call("update_plan", { plan: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Comp accounts, refunds, influencers.</span>
                </div>
              </Section>

              <Section title="Scan quota">
                <div className="flex gap-2 items-center">
                  <Input type="number" className="w-24" value={grantDelta} onChange={(e) => setGrantDelta(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => call("grant_scans", { delta: Number(grantDelta) })}><Plus className="h-4 w-4 mr-1" />Grant</Button>
                  <Button size="sm" variant="outline" onClick={() => call("grant_scans", { delta: -Number(grantDelta) })}><Minus className="h-4 w-4 mr-1" />Deduct</Button>
                  <Button size="sm" variant="ghost" onClick={() => call("reset_scans")}><RotateCcw className="h-4 w-4 mr-1" />Reset month</Button>
                </div>
              </Section>

              <Section title="Credentials">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => call("force_password_reset")}><KeyRound className="h-4 w-4 mr-1" />Send password reset</Button>
                  <Button size="sm" variant="outline" onClick={() => call("send_magic_link")}><Mail className="h-4 w-4 mr-1" />Send magic link</Button>
                  <Button size="sm" variant="outline" onClick={impersonate}><Eye className="h-4 w-4 mr-1" />Impersonate</Button>
                </div>
              </Section>

              <Section title="Account status">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => call("set_status", { status: "active" })}><UserCheck className="h-4 w-4 mr-1" />Activate</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const reason = prompt("Suspension reason?") ?? "";
                    call("set_status", { status: "suspended", reason });
                  }}><ShieldOff className="h-4 w-4 mr-1" />Suspend</Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    const reason = prompt("Ban reason?") ?? "";
                    call("set_status", { status: "banned", reason }, "Ban this user? They will be locked out.");
                  }}><Ban className="h-4 w-4 mr-1" />Ban</Button>
                </div>
                {p?.banned_reason && <p className="text-xs text-muted-foreground mt-2">Reason: {p.banned_reason}</p>}
              </Section>

              <Section title="Danger zone" tone="danger">
                <Button size="sm" variant="destructive" onClick={() => call("delete_user", {}, `PERMANENTLY delete ${p?.email} and all data? This cannot be undone.`)}>
                  <Trash2 className="h-4 w-4 mr-1" />Hard delete (GDPR)
                </Button>
              </Section>
            </TabsContent>

            {/* ACTIVITY */}
            <TabsContent value="activity" className="space-y-4 mt-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm">Recent optimizations ({d.optimizations.length})</h4>
                <div className="max-h-64 overflow-y-auto border rounded divide-y">
                  {d.optimizations.length === 0 && <p className="p-3 text-xs text-muted-foreground">None</p>}
                  {d.optimizations.map((o) => (
                    <div key={o.id} className="p-2 text-xs flex justify-between">
                      <span>{o.title || o.role || "Untitled"} {o.company && `· ${o.company}`}</span>
                      <span className="text-muted-foreground">Score: {o.ats_score ?? "—"} · {new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm">AI totals (lifetime)</h4>
                {d.ai_totals ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="border rounded p-2"><p className="text-muted-foreground">Calls</p><p className="font-semibold text-sm">{d.ai_totals.calls.toLocaleString()}</p></div>
                      <div className="border rounded p-2"><p className="text-muted-foreground">Input tokens</p><p className="font-semibold text-sm">{d.ai_totals.input.toLocaleString()}</p></div>
                      <div className="border rounded p-2"><p className="text-muted-foreground">Output tokens</p><p className="font-semibold text-sm">{d.ai_totals.output.toLocaleString()}</p></div>
                      <div className="border rounded p-2"><p className="text-muted-foreground">Total cost</p><p className="font-semibold text-sm">₹{d.ai_totals.cost.toFixed(4)}</p></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Avg ₹{d.ai_totals.avgCost.toFixed(4)}/call · {d.ai_totals.exactPct.toFixed(0)}% exact provider token counts · {d.ai_totals.errors} errors · 1 USD = ₹{d.ai_totals.usdToInr}
                    </p>
                    <div className="border rounded divide-y">
                      {d.ai_totals.byFeature.map((f) => (
                        <div key={f.feature} className="p-2 text-xs flex justify-between">
                          <span className="font-medium">{f.feature}</span>
                          <span className="text-muted-foreground">{f.calls} calls · {f.input.toLocaleString()}→{f.output.toLocaleString()} tok · ₹{f.cost.toFixed(4)}</span>
                        </div>
                      ))}
                      {d.ai_totals.byFeature.length === 0 && <p className="p-3 text-xs text-muted-foreground">None</p>}
                    </div>
                  </div>
                ) : <p className="text-xs text-muted-foreground">None</p>}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm">AI totals ({rangePreset === "custom" ? `${rFrom} → ${rTo}` : `last ${rangePreset} days`})</h4>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={exportLedgerCsv} disabled={!d.ai_totals}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {[7, 30, 90].map((days) => (
                    <Button
                      key={days}
                      size="sm"
                      variant={rangePreset === String(days) ? "default" : "outline"}
                      className="h-7 text-[11px]"
                      onClick={() => {
                        const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
                        const to = new Date().toISOString().slice(0, 10);
                        setRangePreset(String(days)); setRFrom(from); setRTo(to); load(from, to);
                      }}
                    >
                      Last {days}d
                    </Button>
                  ))}
                  <Input type="date" value={rFrom} max={rTo} onChange={(e) => { setRFrom(e.target.value); setRangePreset("custom"); }} className="h-7 w-[132px] text-[11px]" />
                  <span className="text-[11px] text-muted-foreground">to</span>
                  <Input type="date" value={rTo} min={rFrom} onChange={(e) => { setRTo(e.target.value); setRangePreset("custom"); }} className="h-7 w-[132px] text-[11px]" />
                  <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => load()}>Apply</Button>
                </div>
                {d.ai_range ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="border rounded p-2"><p className="text-muted-foreground">Calls</p><p className="font-semibold text-sm">{d.ai_range.calls.toLocaleString()}</p></div>
                      <div className="border rounded p-2"><p className="text-muted-foreground">Input tokens</p><p className="font-semibold text-sm">{d.ai_range.input.toLocaleString()}</p></div>
                      <div className="border rounded p-2"><p className="text-muted-foreground">Output tokens</p><p className="font-semibold text-sm">{d.ai_range.output.toLocaleString()}</p></div>
                      <div className="border rounded p-2"><p className="text-muted-foreground">Cost</p><p className="font-semibold text-sm">₹{d.ai_range.cost.toFixed(4)}</p></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Avg ₹{d.ai_range.avgCost.toFixed(4)}/call · {d.ai_range.exactPct.toFixed(0)}% exact provider token counts · {d.ai_range.errors} errors
                    </p>
                    <div className="border rounded divide-y">
                      {d.ai_range.byFeature.map((f) => (
                        <div key={f.feature} className="p-2 text-xs flex justify-between">
                          <span className="font-medium">{f.feature}</span>
                          <span className="text-muted-foreground">{f.calls} calls · {f.input.toLocaleString()}→{f.output.toLocaleString()} tok · ₹{f.cost.toFixed(4)}</span>
                        </div>
                      ))}
                      {d.ai_range.byFeature.length === 0 && <p className="p-3 text-xs text-muted-foreground">No AI usage in this range.</p>}
                    </div>
                  </div>
                ) : <p className="text-xs text-muted-foreground">None</p>}
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm">Recent AI calls ({d.ai_logs.length})</h4>
                <div className="max-h-64 overflow-y-auto border rounded divide-y">
                  {d.ai_logs.length === 0 && <p className="p-3 text-xs text-muted-foreground">None</p>}
                  {d.ai_logs.map((l, i) => (
                    <div key={i} className="p-2 text-xs flex justify-between gap-2">
                      <span>{l.feature} · {l.model}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{l.input_tokens}→{l.output_tokens} tok{(l as any).token_source === "exact" ? "" : " (est)"} · ₹{Number(l.cost_inr).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </TabsContent>

            {/* BILLING */}
            <TabsContent value="billing" className="space-y-4 mt-4">
              <Section title="Custom pricing offer">
                <p className="text-xs text-muted-foreground mb-2">
                  Quote a personal price for this customer. It shows up on their dashboard with a Pay now button, and the scans are credited automatically once they pay.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} placeholder="Title (e.g. 25 extra scans)" className="h-8 text-xs col-span-2" />
                  <Input value={offerDesc} onChange={(e) => setOfferDesc(e.target.value)} placeholder="Note shown to the customer (optional)" className="h-8 text-xs col-span-2" />
                  <Input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} type="number" placeholder="Amount ₹" className="h-8 text-xs" />
                  <Input value={offerScans} onChange={(e) => setOfferScans(e.target.value)} type="number" placeholder="Extra scans" className="h-8 text-xs" />
                  <Input value={offerDays} onChange={(e) => setOfferDays(e.target.value)} type="number" placeholder="Expires in days (0 = never)" className="h-8 text-xs" />
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={busy === "create_custom_offer"}
                    onClick={() => call("create_custom_offer", {
                      title: offerTitle,
                      description: offerDesc,
                      amount_rupees: Number(offerAmount),
                      scans: Number(offerScans),
                      expires_in_days: Number(offerDays),
                    })}
                  >
                    Send offer
                  </Button>
                </div>

                <div className="mt-3 border rounded divide-y">
                  {(d.custom_offers ?? []).length === 0 && (
                    <p className="p-3 text-xs text-muted-foreground">No custom offers for this user yet.</p>
                  )}
                  {(d.custom_offers ?? []).map((o: any) => (
                    <div key={o.id} className="p-2 text-xs flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{o.title} · ₹{(o.amount_paise / 100).toLocaleString("en-IN")}</div>
                        <div className="text-muted-foreground">
                          {o.scans} scans · {o.status}
                          {o.expires_at ? ` · expires ${new Date(o.expires_at).toLocaleDateString()}` : ""}
                          {o.paid_at ? ` · paid ${new Date(o.paid_at).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                      {o.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          disabled={busy === "cancel_custom_offer"}
                          onClick={() => call("cancel_custom_offer", { offer_id: o.id }, "Cancel this offer?")}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Razorpay customer">{p?.razorpay_customer_id || "—"}</Field>
                <Field label="Razorpay subscription">{p?.razorpay_subscription_id || "—"}</Field>
                <Field label="Payment failed">{p?.payment_failed ? "Yes" : "No"}</Field>
                <Field label="Pending plan">{p?.pending_plan || "—"}</Field>
              </div>

              <Section title="Subscription">
                <Button size="sm" variant="outline" onClick={() => call("cancel_subscription", {}, "Cancel this user's subscription now?")}>
                  <XCircle className="h-4 w-4 mr-1" />Cancel subscription
                </Button>
              </Section>

              <Section title="Issue refund">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="pay_XXXXXXXX (Razorpay payment_id)" value={refundId} onChange={(e) => setRefundId(e.target.value)} />
                    <Input type="number" placeholder="Amount (paise, blank = full)" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="w-56" />
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => call("refund_payment", {
                    payment_id: refundId,
                    amount_paise: refundAmount ? Number(refundAmount) : undefined,
                  }, "Issue refund and downgrade to Free?")}>
                    <IndianRupee className="h-4 w-4 mr-1" />Refund & downgrade
                  </Button>
                </div>
              </Section>
            </TabsContent>

            {/* AUDIT */}
            <TabsContent value="audit" className="mt-4">
              <div className="max-h-96 overflow-y-auto border rounded divide-y">
                {audit.length === 0 && <p className="p-3 text-xs text-muted-foreground">No admin actions on this user yet.</p>}
                {audit.map((r) => (
                  <div key={r.id} className="p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold">{r.action}</span>
                      <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    {r.details && Object.keys(r.details).length > 0 && (
                      <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap">{JSON.stringify(r.details, null, 0)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm flex items-center gap-1">{children}</div>
    </div>
  );
}

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "danger" ? "border-destructive/40 bg-destructive/5" : ""}`}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2">{title}</div>
      {children}
    </div>
  );
}
