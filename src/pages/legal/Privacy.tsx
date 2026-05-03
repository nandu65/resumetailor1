import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-12">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Link>
        </Button>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 3 May 2026 · Compliant with the Digital Personal Data Protection Act, 2023 (India)</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed text-sm">
          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">1. Who we are</h2>
            <p>Resume Tailor AI ("we", "us") is the data fiduciary for personal data you provide while using the Service.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">2. Data we collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account data:</strong> email, display name, authentication identifiers.</li>
              <li><strong>Resume content & job descriptions</strong> you upload or paste.</li>
              <li><strong>Generated outputs:</strong> ATS scores, rewrites, cover letters.</li>
              <li><strong>Billing data:</strong> handled by Razorpay; we store only subscription IDs and status — never card numbers.</li>
              <li><strong>Usage logs:</strong> request timestamps and counts to enforce plan limits.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">3. How we use it</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide resume optimization and related AI features.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To enforce fair-use limits and prevent abuse.</li>
              <li>To communicate service-related updates.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">4. AI processing</h2>
            <p>Your resume and JD text are sent to AI providers (Google Gemini, OpenAI) via secured APIs solely to generate your output. We do not allow these providers to train on your data.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">5. Sharing</h2>
            <p>We do not sell your data. We share only with processors strictly needed to run the Service (hosting, authentication, payments, AI inference) under contractual safeguards.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">6. Your rights (DPDP Act)</h2>
            <p>You have the right to access, correct, update or erase your personal data, and to withdraw consent at any time. Email <a className="text-primary underline" href="mailto:support@resumetailor.ai">support@resumetailor.ai</a> and we will respond within 30 days.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">7. Retention</h2>
            <p>We keep your data while your account is active. On deletion, your resumes and generated content are removed within 30 days; minimal billing records are retained as required by Indian tax law.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">8. Security</h2>
            <p>Data is encrypted in transit (TLS) and at rest. Access is gated by row-level security and least-privilege service roles.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">9. Contact / Grievance Officer</h2>
            <p>Email <a className="text-primary underline" href="mailto:support@resumetailor.ai">support@resumetailor.ai</a> for any privacy concern or grievance.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
