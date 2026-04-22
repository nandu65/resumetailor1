import { useState } from "react";
import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { DiffView } from "@/components/DiffView";

export default function DiffTool() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <GitCompare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Before / After Diff</h1>
            <p className="text-muted-foreground text-sm mt-1">Compare two versions with word-level highlighting.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Original</Label>
            <Textarea value={a} onChange={(e) => setA(e.target.value)}
              placeholder="Paste the original text..." className="mt-1.5 min-h-[240px] font-mono text-xs" />
          </div>
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Improved</Label>
            <Textarea value={b} onChange={(e) => setB(e.target.value)}
              placeholder="Paste the improved version..." className="mt-1.5 min-h-[240px] font-mono text-xs" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => setShow(true)} size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8">
            Show diff
          </Button>
        </div>

        {show && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display font-semibold mb-4">Comparison</h2>
            <DiffView original={a} improved={b} />
          </div>
        )}
      </div>
    </div>
  );
}
