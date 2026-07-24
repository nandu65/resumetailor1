import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Loader2, Briefcase, Trash2, Edit3, ExternalLink, Calendar, MapPin, LayoutGrid, List, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["wishlist", "applied", "assessment", "interview", "offer", "rejected", "withdrawn"] as const;
type Status = typeof STATUSES[number];

const STATUS_COLORS: Record<Status, string> = {
  wishlist: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
  applied: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  assessment: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  interview: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  offer: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  withdrawn: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30",
};

interface App {
  id: string;
  company_name: string;
  job_title: string;
  job_url: string | null;
  job_description: string | null;
  location: string | null;
  work_type: string | null;
  application_date: string | null;
  status: Status;
  salary_range: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  notes: string | null;
  optimization_id: string | null;
  ats_score: number | null;
  recruiter_score: number | null;
  assessment_date: string | null;
  interview_date: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: string;
  event_type: string;
  event_title: string;
  notes: string | null;
  event_date: string;
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

const EMPTY: Partial<App> = {
  company_name: "", job_title: "", job_url: "", job_description: "",
  location: "", work_type: "", application_date: new Date().toISOString().slice(0, 10),
  status: "applied", salary_range: "", recruiter_name: "", recruiter_email: "",
  notes: "", optimization_id: null, ats_score: null, recruiter_score: null,
};

export default function Applications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<App>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<App | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("job_applications")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setApps((data as App[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Deep link: /applications?new=1 with prefill in localStorage
  useEffect(() => {
    if (params.get("new") === "1") {
      try {
        const raw = localStorage.getItem("app:prefill");
        if (raw) {
          const p = JSON.parse(raw);
          setForm({ ...EMPTY, ...p });
          localStorage.removeItem("app:prefill");
        }
      } catch { /* ignore */ }
      setDialogOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    const [a, e] = await Promise.all([
      supabase.from("job_applications").select("*").eq("id", id).maybeSingle(),
      supabase.from("application_events").select("*").eq("application_id", id).order("event_date", { ascending: false }),
    ]);
    setDetail((a.data as App) ?? null);
    setEvents((e.data as Event[]) ?? []);
    setDetailLoading(false);
  };

  const closeDetail = () => { setDetailId(null); setDetail(null); setEvents([]); };

  const filtered = useMemo(() => {
    let list = apps;
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.company_name.toLowerCase().includes(q) ||
        a.job_title.toLowerCase().includes(q) ||
        (a.location ?? "").toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.application_date || a.created_at).getTime();
      const db = new Date(b.application_date || b.created_at).getTime();
      return sortDesc ? db - da : da - db;
    });
    return list;
  }, [apps, statusFilter, search, sortDesc]);

  const stats = useMemo(() => {
    const total = apps.length;
    const by = (s: Status) => apps.filter(a => a.status === s).length;
    const applied = by("applied") + by("assessment") + by("interview") + by("offer");
    const interviews = by("interview") + by("offer");
    const offers = by("offer");
    const rejected = by("rejected");
    const interviewRate = applied ? Math.round((interviews / applied) * 100) : 0;
    const offerRate = applied ? Math.round((offers / applied) * 100) : 0;
    return { total, applied, interviews, offers, rejected, interviewRate, offerRate };
  }, [apps]);

  const openNew = () => { setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (a: App) => { setForm(a); setDialogOpen(true); };

  const save = async () => {
    if (!user) return;
    if (!form.company_name?.trim() || !form.job_title?.trim()) {
      toast.error("Company and job title are required"); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        user_id: user.id,
        company_name: form.company_name!.trim(),
        job_title: form.job_title!.trim(),
        job_url: form.job_url || null,
        job_description: form.job_description || null,
        location: form.location || null,
        work_type: form.work_type || null,
        application_date: form.application_date || null,
        status: (form.status as Status) || "applied",
        salary_range: form.salary_range || null,
        recruiter_name: form.recruiter_name || null,
        recruiter_email: form.recruiter_email || null,
        notes: form.notes || null,
        optimization_id: form.optimization_id || null,
        ats_score: form.ats_score ?? null,
        recruiter_score: form.recruiter_score ?? null,
      };
      if (form.id) {
        const { error } = await supabase.from("job_applications").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Application updated");
      } else {
        const { error } = await supabase.from("job_applications").insert(payload);
        if (error) throw error;
        toast.success("Application added");
      }
      setDialogOpen(false);
      load();
      if (detailId) openDetail(detailId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    closeDetail();
    load();
  };

  const changeStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
    if (detailId === id) openDetail(id);
  };

  const addNote = async (id: string, text: string) => {
    if (!user || !text.trim()) return;
    const { error } = await supabase.from("application_events").insert({
      application_id: id, user_id: user.id, event_type: "note",
      event_title: "Note added", notes: text.trim(),
    });
    if (error) return toast.error(error.message);
    openDetail(id);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 sm:py-10 max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground mt-1">Track every job you apply to and link the resume you used.</p>
          </div>
          <Button size="lg" onClick={openNew} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Plus className="h-4 w-4 mr-1.5" /> Add Application
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Applied" value={stats.applied} />
          <StatCard label="Interviews" value={stats.interviews} />
          <StatCard label="Offers" value={stats.offers} accent />
          <StatCard label="Interview rate" value={`${stats.interviewRate}%`} />
          <StatCard label="Offer rate" value={`${stats.offerRate}%`} />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company, title, location…" className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSortDesc(v => !v)}>
            {sortDesc ? "Newest first" : "Oldest first"}
          </Button>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setView("list")} className={`px-3 py-2 text-sm ${view === "list" ? "bg-accent" : ""}`} aria-label="List view"><List className="h-4 w-4" /></button>
            <button onClick={() => setView("kanban")} className={`px-3 py-2 text-sm ${view === "kanban" ? "bg-accent" : ""}`} aria-label="Kanban view"><LayoutGrid className="h-4 w-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openNew} hasAny={apps.length > 0} />
        ) : view === "list" ? (
          <ListView apps={filtered} onOpen={openDetail} onEdit={openEdit} onDelete={del} />
        ) : (
          <KanbanView apps={filtered} onOpen={openDetail} onStatus={changeStatus} />
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit application" : "Add application"}</DialogTitle>
            <DialogDescription>Track this job in your pipeline.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Company *"><Input value={form.company_name ?? ""} onChange={e => setForm({ ...form, company_name: e.target.value })} /></Field>
            <Field label="Job title *"><Input value={form.job_title ?? ""} onChange={e => setForm({ ...form, job_title: e.target.value })} /></Field>
            <Field label="Job URL"><Input value={form.job_url ?? ""} onChange={e => setForm({ ...form, job_url: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Location"><Input value={form.location ?? ""} onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Work type">
              <Select value={form.work_type ?? ""} onValueChange={v => setForm({ ...form, work_type: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status ?? "applied"} onValueChange={v => setForm({ ...form, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Application date"><Input type="date" value={form.application_date ?? ""} onChange={e => setForm({ ...form, application_date: e.target.value })} /></Field>
            <Field label="Follow-up date"><Input type="date" value={form.follow_up_date ?? ""} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} /></Field>
            <Field label="Salary range"><Input value={form.salary_range ?? ""} onChange={e => setForm({ ...form, salary_range: e.target.value })} placeholder="₹18–24 LPA" /></Field>
            <Field label="Recruiter name"><Input value={form.recruiter_name ?? ""} onChange={e => setForm({ ...form, recruiter_name: e.target.value })} /></Field>
            <Field label="Recruiter email"><Input type="email" value={form.recruiter_email ?? ""} onChange={e => setForm({ ...form, recruiter_email: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></Field></div>
            <div className="sm:col-span-2"><Field label="Job description (optional)"><Textarea value={form.job_description ?? ""} onChange={e => setForm({ ...form, job_description: e.target.value })} rows={4} /></Field></div>
            {form.optimization_id && (
              <div className="sm:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                Linked to a ResumeShot analysis · ATS {form.ats_score ?? "—"} · Recruiter {form.recruiter_score ?? "—"}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.job_title || "Application"}</SheetTitle>
          </SheetHeader>
          {detailLoading || !detail ? (
            <div className="py-20 text-center"><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></div>
          ) : (
            <div className="space-y-5 mt-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-display text-lg font-semibold">{detail.company_name}</div>
                  <StatusBadge status={detail.status} />
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {detail.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{detail.location}</span>}
                  {detail.work_type && <span className="capitalize">{detail.work_type}</span>}
                  {detail.application_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(detail.application_date).toLocaleDateString()}</span>}
                  {detail.job_url && <a className="inline-flex items-center gap-1 text-primary underline" href={detail.job_url} target="_blank" rel="noreferrer">Job link <ExternalLink className="h-3 w-3" /></a>}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => changeStatus(detail.id, s)}
                      className={`text-xs rounded-full border px-2.5 py-1 capitalize transition ${detail.status === s ? STATUS_COLORS[s] : "border-border text-muted-foreground hover:bg-accent"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {detail.optimization_id && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Resume used</div>
                  <div className="text-sm">ATS <span className="font-semibold">{detail.ats_score ?? "—"}</span> · Recruiter <span className="font-semibold">{detail.recruiter_score ?? "—"}</span></div>
                  <Button size="sm" variant="link" className="px-0 h-6" onClick={() => navigate(`/results/${detail.optimization_id}`)}>
                    View analysis <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}

              {(detail.recruiter_name || detail.recruiter_email) && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recruiter</div>
                  <div className="text-sm">{detail.recruiter_name}{detail.recruiter_name && detail.recruiter_email ? " · " : ""}{detail.recruiter_email && <a className="text-primary underline" href={`mailto:${detail.recruiter_email}`}>{detail.recruiter_email}</a>}</div>
                </div>
              )}

              {detail.notes && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div>
                  <p className="text-sm whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}

              <AddNoteBox onAdd={(t) => addNote(detail.id, t)} />

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Timeline</div>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events yet.</p>
                ) : (
                  <ol className="relative border-l border-border pl-4 space-y-3">
                    {events.map(e => (
                      <li key={e.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="text-sm font-medium">{e.event_title}</div>
                        {e.notes && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{e.notes}</div>}
                        <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(e.event_date).toLocaleString()}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => openEdit(detail)}><Edit3 className="h-4 w-4 mr-1.5" /> Edit</Button>
                <Button variant="outline" className="text-destructive" onClick={() => del(detail.id)}><Trash2 className="h-4 w-4 mr-1.5" /> Delete</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border ${accent ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-gradient-card"} p-3 shadow-card`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-gradient-card">
      <Briefcase className="h-10 w-10 text-primary mx-auto mb-3" />
      <h3 className="font-display text-xl font-semibold">{hasAny ? "No applications match your filters" : "Your job search starts here."}</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
        {hasAny ? "Try clearing the search or status filter." : "Track every application, interview, and offer in one place."}
      </p>
      <Button onClick={onAdd} className="mt-5 bg-gradient-primary text-primary-foreground hover:opacity-90">
        <Plus className="h-4 w-4 mr-1.5" /> Add Your First Application
      </Button>
    </div>
  );
}

function ListView({ apps, onOpen, onEdit, onDelete }: { apps: App[]; onOpen: (id: string) => void; onEdit: (a: App) => void; onDelete: (id: string) => void; }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Company / Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">ATS</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {apps.map(a => (
              <tr key={a.id} className="border-t border-border hover:bg-accent/40 cursor-pointer" onClick={() => onOpen(a.id)}>
                <td className="p-3">
                  <div className="font-medium">{a.company_name}</div>
                  <div className="text-xs text-muted-foreground">{a.job_title}</div>
                </td>
                <td className="p-3"><StatusBadge status={a.status} /></td>
                <td className="p-3 text-muted-foreground">{a.location || "—"}{a.work_type ? ` · ${a.work_type}` : ""}</td>
                <td className="p-3 text-muted-foreground">{a.application_date ? new Date(a.application_date).toLocaleDateString() : "—"}</td>
                <td className="p-3">{a.ats_score ?? "—"}</td>
                <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(a)}><Edit3 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden grid gap-3">
        {apps.map(a => (
          <button key={a.id} onClick={() => onOpen(a.id)} className="text-left rounded-xl border border-border bg-gradient-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display font-semibold truncate">{a.company_name}</div>
                <div className="text-sm text-muted-foreground truncate">{a.job_title}</div>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
              {a.location && <span>{a.location}</span>}
              {a.work_type && <span>· {a.work_type}</span>}
              {a.application_date && <span>· {new Date(a.application_date).toLocaleDateString()}</span>}
              {a.ats_score != null && <span>· ATS {a.ats_score}</span>}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function KanbanView({ apps, onOpen, onStatus }: { apps: App[]; onOpen: (id: string) => void; onStatus: (id: string, s: Status) => void; }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 min-w-full">
        {STATUSES.filter(s => s !== "withdrawn").map(s => {
          const col = apps.filter(a => a.status === s);
          return (
            <div key={s} className="rounded-xl border border-border bg-muted/30 p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <StatusBadge status={s} />
                <span className="text-xs text-muted-foreground">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map(a => (
                  <div key={a.id} className="rounded-lg border border-border bg-background p-3 shadow-card">
                    <button onClick={() => onOpen(a.id)} className="text-left w-full">
                      <div className="font-medium text-sm truncate">{a.company_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.job_title}</div>
                    </button>
                    <Select value={a.status} onValueChange={(v) => onStatus(a.id, v as Status)}>
                      <SelectTrigger className="h-7 text-xs mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(x => <SelectItem key={x} value={x} className="capitalize text-xs">{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddNoteBox({ onAdd }: { onAdd: (text: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Add a note</div>
      <div className="flex gap-2">
        <Input value={v} onChange={e => setV(e.target.value)} placeholder="e.g. HR called on July 20" />
        <Button onClick={() => { onAdd(v); setV(""); }} disabled={!v.trim()}>Add</Button>
      </div>
    </div>
  );
}
