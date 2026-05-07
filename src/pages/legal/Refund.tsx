import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-12">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Link>
        </Button>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Refund & Cancellation Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 3 May 2026</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed text-sm">
          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">Cancel anytime</h2>
            <p>You can cancel your monthly subscription at any time from the <Link to="/pricing" className="text-primary underline">Pricing page</Link> using the "Cancel subscription" button, or by emailing <a className="text-primary underline" href="mailto:Support.resumeshot@gmail.com">Support.resumeshot@gmail.com</a>.</p>
            <p className="mt-2">When you cancel, autopay stops immediately and you keep access to paid features until the end of the current billing cycle. No further charges will be made.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">Refunds</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>24-hour refund window:</strong> If you have not used any scan on the new plan, request a full refund within 24 hours of the charge.</li>
              <li><strong>No refunds on used scans:</strong> Once a scan has been consumed on the plan, the cycle is non-refundable. You can still cancel future renewals anytime.</li>
              <li><strong>Failed / duplicate charges:</strong> Any duplicate or failed-but-debited charge is refunded in full within 5–7 working days.</li>
            </ul>
            <p className="mt-3">For all refunds, email <a className="underline text-primary" href="mailto:support.resumeshot@gmail.com">support.resumeshot@gmail.com</a> from your registered email with the date of the charge.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">How refunds are processed</h2>
            <p>Approved refunds are returned to the original payment method via Razorpay. Banks usually take 5–7 working days to credit the amount.</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">Contact</h2>
            <p>For all refund or cancellation requests, email <a className="text-primary underline" href="mailto:Support.resumeshot@gmail.com">Support.resumeshot@gmail.com</a> with your registered email and the date of the charge. We respond within 2 business days.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
