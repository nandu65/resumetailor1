import { useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CompanyBriefTool() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!company.trim()) return toast.error("Enter a company name");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-brief", {
        body: { company, role, url },
      });
      if (error || data?.error) { toast.error(data?.error || error?.message || "Failed"); return; }
      setBrief(data.brief);
      toast.success("Brief ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Company Research Brief</h1>
            <p className="text-muted-foreground text-sm mt-1">Get an AI summary + interview talking points.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="co" className="text-xs">Company name *</Label>
              <Input id="co" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Stripe" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="rl" className="text-xs">Role (optional)</Label>
              <Input id="rl" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Engineer" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="url" className="text-xs">Company URL (optional)</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
          </div>
          <div className="flex justify-end">
            <Button onClick={generate} disabled={loading} size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching...</> : <>Generate brief</>}
            </Button>
          </div>
        </div>

        {brief && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
            {brief.summary && (<div><h3 className="font-display font-semibold mb-2">Summary</h3><p className="text-sm text-muted-foreground leading-relaxed">{brief.summary}</p></div>)}
            {brief.values?.length > 0 && (<div><h3 className="font-display font-semibold mb-2">Values & culture</h3><ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">{brief.values.map((v: string, i: number) => <li key={i}>{v}</li>)}</ul></div>)}
            {brief.talkingPoints?.length > 0 && (<div><h3 className="font-display font-semibold mb-2">Interview talking points</h3><ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">{brief.talkingPoints.map((v: string, i: number) => <li key={i}>{v}</li>)}</ul></div>)}
            {brief.questions?.length > 0 && (<div><h3 className="font-display font-semibold mb-2">Questions to ask them</h3><ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">{brief.questions.map((v: string, i: number) => <li key={i}>{v}</li>)}</ul></div>)}
          </div>
        )}
      </div>
    </div>
  );
}
