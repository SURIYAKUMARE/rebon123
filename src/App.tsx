import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DomainProvider } from "@/contexts/DomainContext";
import { DomainPersistence } from "@/components/app/DomainPersistence";
import { AvaProvider } from "@/contexts/AvaContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { UniverseGateProvider } from "@/components/landing/UniverseGate";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const Auth = lazy(() => import("./pages/Auth"));
const Learning = lazy(() => import("./pages/Learning"));
const LessonRouter = lazy(() => import("./pages/LessonRouter"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Profile = lazy(() => import("./pages/Profile"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div
        className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"
        aria-label="Loading"
      />
    </div>
  );
}

function AuthedRoute({ label, children }: { label: string; children: ReactNode }) {
  return (
    <RequireAuth>
      <ErrorBoundary label={label}>{children}</ErrorBoundary>
    </RequireAuth>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <DomainProvider>
          <DomainPersistence />
          <AvaProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <UniverseGateProvider>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<ErrorBoundary label="Auth"><Auth /></ErrorBoundary>} />
                      <Route path="/login" element={<ErrorBoundary label="Login"><Auth /></ErrorBoundary>} />
                      <Route
                        path="/learning"
                        element={
                          <AuthedRoute label="Learning">
                            <Learning />
                          </AuthedRoute>
                        }
                      />
                      <Route
                        path="/lesson/:id"
                        element={
                          <AuthedRoute label="Lesson">
                            <LessonRouter />
                          </AuthedRoute>
                        }
                      />
                      <Route
                        path="/workspace"
                        element={
                          <AuthedRoute label="Workspace">
                            <Workspace />
                          </AuthedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <AuthedRoute label="Profile">
                            <Profile />
                          </AuthedRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </UniverseGateProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AvaProvider>
        </DomainProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
