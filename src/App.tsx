import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Results from "./pages/Results.tsx";
import NotFound from "./pages/NotFound.tsx";
import Pricing from "./pages/Pricing.tsx";
import CoverLetterTool from "./pages/tools/CoverLetterTool.tsx";
import CompanyBriefTool from "./pages/tools/CompanyBriefTool.tsx";
import SkillGapTool from "./pages/tools/SkillGapTool.tsx";
import KeywordDensityTool from "./pages/tools/KeywordDensityTool.tsx";
import DiffTool from "./pages/tools/DiffTool.tsx";
import ResumeBuilder from "./pages/tools/ResumeBuilder.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Terms from "./pages/legal/Terms.tsx";
import Privacy from "./pages/legal/Privacy.tsx";
import Refund from "./pages/legal/Refund.tsx";
import Admin from "./pages/Admin.tsx";
import { usePresence } from "./hooks/usePresence";

function AppRoutes() {
  usePresence();
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
      <Route path="/tools/cover-letter" element={<CoverLetterTool />} />
      <Route path="/tools/company-brief" element={<CompanyBriefTool />} />
      <Route path="/tools/skill-gap" element={<SkillGapTool />} />
      <Route path="/tools/keyword-density" element={<KeywordDensityTool />} />
      <Route path="/tools/diff" element={<DiffTool />} />
      <Route path="/tools/resume-builder" element={<ResumeBuilder />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/terms-of-service" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/privacy-policy" element={<Privacy />} />
      <Route path="/refund" element={<Refund />} />
      <Route path="/refund-policy" element={<Refund />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/tools/cover-letter" element={<CoverLetterTool />} />
          <Route path="/tools/company-brief" element={<CompanyBriefTool />} />
          <Route path="/tools/skill-gap" element={<SkillGapTool />} />
          <Route path="/tools/keyword-density" element={<KeywordDensityTool />} />
          <Route path="/tools/diff" element={<DiffTool />} />
          <Route path="/tools/resume-builder" element={<ResumeBuilder />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms-of-service" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/refund-policy" element={<Refund />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
