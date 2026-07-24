import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, HelpCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { resetTour } from "@/components/OnboardingTour";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const startTour = () => {
    setOpen(false);
    resetTour();
    window.dispatchEvent(new CustomEvent("tour:start"));
    if (window.location.pathname !== "/") window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-base sm:text-lg min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="truncate">ResumeShot <span className="text-primary">AI</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" title="Take the product tour" onClick={startTour} className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4 mr-1" /> Tour
          </Button>
          <Button asChild variant="ghost" size="sm"><Link to="/pricing">Pricing</Link></Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Dashboard</Link></Button>
              <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()} aria-label="Sign out of your account">Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-md">
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="container py-3 flex flex-col gap-1">
            <Button variant="ghost" className="justify-start" onClick={startTour}>
              <HelpCircle className="h-4 w-4 mr-2" /> Tour
            </Button>
            <Button asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
              <Link to="/pricing">Pricing</Link>
            </Button>
            {user ? (
              <>
                <Button asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => { setOpen(false); supabase.auth.signOut(); }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button
                  asChild
                  className="justify-start bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-md"
                  onClick={() => setOpen(false)}
                >
                  <Link to="/auth">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
