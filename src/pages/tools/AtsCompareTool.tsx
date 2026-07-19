import { useState } from "react";
import { Plus, X, Trophy, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AtsResult {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  improvements: string[];
}
interface Row {
  id: string;
  label: string;
  resume: string;
  loading: boolean;
  result: AtsResult | null;
}

const newRow = (n: number): Row => ({
  id: crypto.randomUUID(),
  label: `Resume ${n}`,
  resume: "",
  loading: false,
  result: null,
});

export default function AtsCompareTool() {
  const [jd, setJd] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow(1), newRow(2)]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const runAll = async () => {
    if (!jd.trim()) return toast({ title: "Paste a job description first", variant: "destructive" });
    const targets = rows.filter((r) => r.resume.trim());
    if (targets.length < 2) return toast({ title: "Add at least 2 resumes to compare", variant: "destructive" });

    await Promise.all(
      targets.map(async (row) => {
        update(row.id, { loading: true, result: null });
        try {
          const { data, error } = await supabase.functions.invoke("ats-score", {
            body: { resume: row.resume, jobDescription: jd },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          update(row.id, { loading: false, result: data as AtsResult });
        } catch (e: any) {
          update(row.id, { loading: false });
          toast({ title: `${row.label} failed`, description: e?.message, variant: "destructive" });
        }
      })
    );
  };

  const scored = rows.filter((r) => r.result).sort((a, b) => (b.result!.score - a.result!.score));
  const winner = scored[0];
  const scoreColor = (s: number) => (s >= 75 ? "text-primary" : s >= 50 ? "text-warning" : "text-destructive");

  return (
    <div className="min-h-screen bg-hero">
      <Navbar />
      <div className="container py-10 max-w-6xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-primary font-semibold mb-2">
            <Trophy className="h-4 w-4" /> Side-by-side
          </div>
          <h1 className="font-display text-4xl font-bold mb-2">ATS score comparison</h1>
          <p className="text-muted-foreground max-w-2xl">
            Compare multiple resumes against the same job description. Ship the version most likely to get past the bots.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-6">
          <Label className="text-sm font-semibold">Job description</Label>
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the JD you're targeting..."
            className="mt-2 min-h-32"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {rows.map((row, i) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={row.label}
                  onChange={(e) => update(row.id, { label: e.target.value })}
                  className="h-8 font-semibold"
                />
                {rows.length > 2 && (
                  <Button size="icon" variant="ghost" onClick={() => setRows((r) => r.filter((x) => x.id !== row.id))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Textarea
                value={row.resume}
                onChange={(e) => update(row.id, { resume: e.target.value, result: null })}
                placeholder={`Paste resume ${i + 1}...`}
                className="min-h-40 text-sm"
              />
              {row.loading && (
                <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Scoring...
                </div>
              )}
              {row.result && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${scoreColor(row.result.score)}`}>{row.result.score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                    {winner?.id === row.id && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <Trophy className="h-3 w-3" /> Winner
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {row.result.matched_keywords.length} matched · {row.result.missing_keywords.length} missing
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Button variant="outline" onClick={() => setRows((r) => [...r, newRow(r.length + 1)])}>
            <Plus className="h-4 w-4 mr-1" /> Add resume
          </Button>
          <Button onClick={runAll} className="bg-gradient-primary text-primary-foreground shadow-md">
            <Sparkles className="h-4 w-4 mr-1" /> Score & compare
          </Button>
        </div>

        {scored.length >= 2 && (
          <div className="rounded-2xl border border-primary/30 bg-gradient-card p-6 shadow-glow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Leaderboard</h2>
            </div>
            <div className="space-y-2">
              {scored.map((row, idx) => {
                const pct = (row.result!.score / 100) * 100;
                return (
                  <div key={row.id} className="flex items-center gap-3">
                    <div className="w-8 text-center font-bold text-muted-foreground">#{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">{row.label}</span>
                        <span className={`font-bold ${scoreColor(row.result!.score)}`}>{row.result!.score}/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {scored.length >= 2 && (
              <p className="mt-4 text-sm text-muted-foreground">
                <strong className="text-foreground">{winner!.label}</strong> beats{" "}
                <strong className="text-foreground">{scored[1].label}</strong> by{" "}
                <span className="text-primary font-bold">
                  {winner!.result!.score - scored[1].result!.score} points
                </span>. Ship it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
