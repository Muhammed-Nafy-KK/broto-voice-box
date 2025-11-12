import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import StudentDashboard from "./pages/student/Dashboard";
import CreateComplaint from "./pages/student/CreateComplaint";
import ComplaintDetail from "./pages/student/ComplaintDetail";
import StudentSuggestions from "./pages/student/Suggestions";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAnnouncements from "./pages/admin/Announcements";
import AdminAnalytics from "./pages/admin/Analytics";
import UserManagement from "./pages/admin/UserManagement";
import NotFound from "./pages/NotFound";

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
          <Route path="/setup" element={<Setup />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/create-complaint" element={<CreateComplaint />} />
          <Route path="/student/complaint/:id" element={<ComplaintDetail />} />
          <Route path="/student/suggestions" element={<StudentSuggestions />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/announcements" element={<AdminAnnouncements />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/users" element={<UserManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
