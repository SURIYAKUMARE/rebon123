import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDomain } from "@/contexts/DomainContext";
import DomainNavbar from "@/components/app/DomainNavbar";
import { useRebonMode } from "@/components/cloud/RebonModeSwitcher";
import { StudentWorkCatalog } from "@/components/cloud/studentMode/StudentWorkCatalog";
import { ProfessionalWorkCatalog } from "@/components/cloud/professionalMode/ProfessionalWorkCatalog";
import { ModePlaceholder } from "@/components/cloud/ModePlaceholder";
import { CloudTopologyMap } from "@/components/cloud/architecture/CloudTopologyMap";
import { IncidentWarRoom } from "@/components/cloud/incidents/IncidentWarRoom";
import RenMentorDrawer from "@/components/mentor/RenMentorDrawer";
import { Terminal, Layers, Flame, Laptop } from "lucide-react";
import { AUTH_REQUIRED } from "@/lib/authGate";

/**
 * Work — Console Catalogs, Live Topology Visualizer, and SRE Incident War Room.
 */
const Workspace = () => {
  const { user, loading } = useAuth();
  const { setSection } = useDomain();
  const navigate = useNavigate();
  const [mode] = useRebonMode();
  const [workView, setWorkView] = useState<"catalog" | "topology" | "incidents">("catalog");

  useEffect(() => {
    setSection("workspace");
  }, [setSection]);

  useEffect(() => {
    if (AUTH_REQUIRED && !loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (AUTH_REQUIRED && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const renderCloudWork = () => {
    if (workView === "topology") return <CloudTopologyMap />;
    if (workView === "incidents") return <IncidentWarRoom />;

    if (mode === "student") return <StudentWorkCatalog />;
    if (mode === "professional") return <ProfessionalWorkCatalog />;
    return <ModePlaceholder mode="ai_professional" section="work" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <DomainNavbar />

      <main className="mx-auto w-full max-w-5xl px-4 pt-28 pb-10 md:px-6">
        {/* Workspace Feature Switcher Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWorkView("catalog")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                workView === "catalog"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Console Catalogs</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkView("topology")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                workView === "topology"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Architecture Map</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkView("incidents")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                workView === "incidents"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              <span>Incident War Room</span>
            </button>
          </div>

          <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
            Environment: AWS us-east-1 · Simulation Active
          </span>
        </div>

        {renderCloudWork()}
      </main>

      <RenMentorDrawer />
    </div>
  );
};

export default Workspace;
