import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Results from "./pages/Results.tsx";
import NotFound from "./pages/NotFound.tsx";
import CoverLetterTool from "./pages/tools/CoverLetterTool.tsx";
import CompanyBriefTool from "./pages/tools/CompanyBriefTool.tsx";
import SkillGapTool from "./pages/tools/SkillGapTool.tsx";
import KeywordDensityTool from "./pages/tools/KeywordDensityTool.tsx";
import DiffTool from "./pages/tools/DiffTool.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/tools/cover-letter" element={<CoverLetterTool />} />
          <Route path="/tools/company-brief" element={<CompanyBriefTool />} />
          <Route path="/tools/skill-gap" element={<SkillGapTool />} />
          <Route path="/tools/keyword-density" element={<KeywordDensityTool />} />
          <Route path="/tools/diff" element={<DiffTool />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
