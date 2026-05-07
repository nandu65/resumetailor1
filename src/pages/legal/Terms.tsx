import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-12">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Link>
        </Button>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 3 May 2026</p>

        <section className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using ResumeShot ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">2. The Service</h2>
            <p>ResumeShot provides automated resume optimization, ATS scoring, cover letters, company briefs and related career tools using AI models. Results are suggestions and do not guarantee employment outcomes.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information during signup.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">4. Subscriptions & Billing</h2>
            <p>Paid plans (Basic ₹49/month, Pro ₹99/month) are billed monthly via Razorpay autopay (UPI/Card). Prices are inclusive of applicable GST. By subscribing, you authorise recurring debits until you cancel.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">5. Cancellation</h2>
            <p>You can cancel your subscription anytime from the Pricing page or by emailing us. Access continues until the end of the current billing cycle.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">6. Acceptable Use</h2>
            <p>You agree not to use the Service to upload content that is unlawful, misleading, infringing, or that contains malware. You will not attempt to reverse-engineer, scrape or overload the Service, share your account, or use it to apply for jobs at scale through automated means.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">6a. Service availability</h2>
            <p>We aim for high uptime but the Service is provided on a best-effort basis. We may schedule maintenance, throttle abusive traffic, or temporarily disable AI features if upstream providers (Google Gemini, Razorpay) are degraded. We are not liable for downtime caused by third-party providers.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">7. Intellectual Property</h2>
            <p>You retain ownership of resume content you upload. You grant us a limited licence to process it solely to provide the Service. The Service itself, including AI prompts and UI, remains our property.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">8. Disclaimer & Liability</h2>
            <p>The Service is provided "as is" without warranties. To the maximum extent permitted by law, our aggregate liability is limited to the fees you paid in the 3 months prior to the claim.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">9. Governing Law</h2>
            <p>These terms are governed by the laws of India. Disputes will be resolved in the courts of Bengaluru, Karnataka.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">10. Contact</h2>
            <p>Questions? Email <a className="text-primary underline" href="mailto:Support.resumeshot@gmail.com">Support.resumeshot@gmail.com</a>.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
