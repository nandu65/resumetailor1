import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { History as HistoryIcon, Building2, Search, ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Row = {
  id: string;
  title: string | null;
  company: string | null;
  role: string | null;
  ats_score: number | null;
  previous_ats_score: number | null;
  rewrite_level: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("optimizations")
      .select("id, title, company, role, ats_score, previous_ats_score, rewrite_level, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(load, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.title, r.company, r.role].filter(Boolean).some((v) => v!.toLowerCase().includes(term)),
    );
  }, [rows, q]);

  const remove = async (id: string) => {
    if (!confirm("Delete this tailored version permanently?")) return;
    setDeleting(id);
    const { error } = await supabase.from("optimizations").delete().eq("id", id);
    setDeleting(null);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Link>
        </Button>

        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
              <HistoryIcon className="h-7 w-7 text-primary" /> Analysis history
            </h1>
            <p className="text-muted-foreground mt-1">Every tailored resume you've generated. Click any row to revisit the full report.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, company, role" className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <HistoryIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{rows.length === 0 ? "No tailored resumes yet." : "No results match your search."}</p>
            {rows.length === 0 && (
              <Button asChild className="mt-4"><Link to="/dashboard">Tailor your first resume</Link></Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="divide-y divide-border">
              {filtered.map((h) => {
                const delta = h.previous_ats_score != null && h.ats_score != null ? h.ats_score - h.previous_ats_score : null;
                return (
                  <div key={h.id} className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors">
                    <button
                      onClick={() => navigate(`/results/${h.id}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-display font-semibold truncate">{h.title || "Untitled version"}</div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        {(h.company || h.role) && (
                          <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{[h.company, h.role].filter(Boolean).join(" · ")}</span>
                        )}
                        <span>· {new Date(h.created_at).toLocaleString()}</span>
                        {h.rewrite_level && <span className="rounded-full bg-accent px-2 capitalize">{h.rewrite_level}</span>}
                      </div>
                    </button>
                    <div className="text-right shrink-0">
                      <div className="font-display font-bold text-lg text-primary">{h.ats_score ?? "—"}</div>
                      {delta != null && (
                        <div className={`text-[11px] font-semibold ${delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {delta > 0 ? "+" : ""}{delta} vs prev
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(h.id)}
                      disabled={deleting === h.id}
                      aria-label="Delete this version"
                    >
                      {deleting === h.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
