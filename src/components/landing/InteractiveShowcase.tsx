import { useState } from "react";
import { motion } from "framer-motion";
import { CloudTopologyMap } from "@/components/cloud/architecture/CloudTopologyMap";
import { IncidentWarRoom } from "@/components/cloud/incidents/IncidentWarRoom";
import {
  Layers,
  Flame,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Server,
} from "lucide-react";
import { Link } from "react-router-dom";

export const InteractiveShowcase = () => {
  const [activeTab, setActiveTab] = useState<"topology" | "incidents" | "quiz">("topology");

  return (
    <section className="py-20 md:py-28 border-t border-white/[0.08] bg-[#090a0f] relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent mb-3 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Interactive Platform Sandbox</span>
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-[1.15]">
            Test-drive the console before you start.
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mt-4 leading-relaxed">
            Not passive videos or slides. Rebon puts you directly inside simulated AWS topologies, live incident war rooms, and real architectural decisions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/[0.08] pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("topology")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "topology"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Multi-AZ Topology Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("incidents")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "incidents"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>Incident War Room</span>
          </button>

          <Link
            to="/learning"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold bg-white/[0.03] text-accent hover:bg-white/[0.06] hover:text-white ml-auto"
          >
            <span>Launch Placement Quiz</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Tab Content Display */}
        <div>
          {activeTab === "topology" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CloudTopologyMap />
            </motion.div>
          )}

          {activeTab === "incidents" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <IncidentWarRoom />
            </motion.div>
          )}
        </div>

      </div>
    </section>
  );
};

export default InteractiveShowcase;
