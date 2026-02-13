import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import DemoRequest from "./pages/DemoRequest";
import PendingApproval from "./pages/PendingApproval";
import AcceptInvite from "./pages/AcceptInvite";
import ExhibitorPortal from "./pages/ExhibitorPortal";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventForm from "./pages/EventForm";
import EventDetail from "./pages/EventDetail";
import Exhibitors from "./pages/Exhibitors";
import ExhibitorLibrary from "./pages/ExhibitorLibrary";
import FloorplanEditor from "./pages/FloorplanEditor";
import FloorplanFullscreenEditor from "./pages/FloorplanFullscreenEditor";
import PublicFloorplan from "./pages/PublicFloorplan";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import Roles from "./pages/Roles";
import Team from "./pages/Team";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import DemoRequests from "./pages/DemoRequests";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEmailOutbox from "./pages/AdminEmailOutbox";
import AdminUsers from "./pages/AdminUsers";
import EventSettings from "./pages/EventSettings";
import EventUsers from "./pages/EventUsers";
import EventRequests from "./pages/EventRequests";
import PublicRequest from "./pages/PublicRequest";
import PlaceholderPage from "./pages/PlaceholderPage";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import AdminVenues from "./pages/AdminVenues";
import ProfessionalEditor from "./pages/ProfessionalEditor";
import FloorplanEditorApp from "./pages/FloorplanEditorApp";
import FloorplanLanding from "./pages/FloorplanLanding";

// POS Pages
import PosLayout from "./pages/pos/PosLayout";
import PosSell from "./pages/pos/PosSell";
import PosProducts from "./pages/pos/PosProducts";
import PosShifts from "./pages/pos/PosShifts";
import PosReports from "./pages/pos/PosReports";
import PosSettings from "./pages/pos/PosSettings";
import PosKiosk from "./pages/pos/PosKiosk";

const queryClient = new QueryClient();

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<AuthRedirect><Landing /></AuthRedirect>} />
            <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
            <Route path="/demo-request" element={<DemoRequest />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/request/:token" element={<PublicRequest />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/exhibitor/:token" element={<ExhibitorPortal />} />
            <Route path="/p/:token" element={<PublicFloorplan />} />

            {/* Standalone floorplan editor routes */}
            <Route path="/floorplan" element={<FloorplanLanding />} />
            <Route path="/floorplan/event/:eventId/hall/:hallId" element={<FloorplanEditorApp />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/home" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/new" element={<EventForm />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/events/:id/edit" element={<EventForm />} />
              <Route path="/events/:id/exhibitors" element={<Exhibitors />} />
              <Route path="/events/:id/floorplan" element={<FloorplanEditor />} />
              <Route path="/events/:id/settings" element={<EventSettings />} />
              <Route path="/events/:id/users" element={<EventUsers />} />
              <Route path="/events/:id/requests" element={<EventRequests />} />
              
              {/* POS Routes with nested layout */}
              <Route path="/events/:id/pos" element={<PosLayout />}>
                <Route index element={<PosSell />} />
                <Route path="products" element={<PosProducts />} />
                <Route path="shifts" element={<PosShifts />} />
                <Route path="reports" element={<PosReports />} />
                <Route path="settings" element={<PosSettings />} />
              </Route>
              
              {/* System routes */}
              <Route path="/users" element={<Users />} />
              <Route path="/users/:userId" element={<UserDetail />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/team" element={<Team />} />
              <Route path="/exhibitor-library" element={<ExhibitorLibrary />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/crm" element={<PlaceholderPage title="CRM" />} />
              
              {/* Super admin routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/accounts" element={<Accounts />} />
              <Route path="/admin/accounts/:accountId" element={<AccountDetail />} />
              <Route path="/admin/demo-requests" element={<DemoRequests />} />
              <Route path="/admin/email-outbox" element={<AdminEmailOutbox />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/venues" element={<AdminVenues />} />
            </Route>

            {/* POS Kiosk - fullscreen, outside dashboard layout */}
            <Route path="/events/:id/pos/kiosk" element={<ProtectedRoute><PosKiosk /></ProtectedRoute>} />

            {/* Fullscreen editor - outside dashboard layout */}
            <Route path="/events/:id/floorplan/editor" element={<ProtectedRoute><FloorplanFullscreenEditor /></ProtectedRoute>} />

            {/* Professional CAD editor - outside dashboard layout */}
            <Route path="/editor/:id" element={<ProtectedRoute><ProfessionalEditor /></ProtectedRoute>} />
            <Route path="/editor/:id/:eventId" element={<ProtectedRoute><ProfessionalEditor /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
