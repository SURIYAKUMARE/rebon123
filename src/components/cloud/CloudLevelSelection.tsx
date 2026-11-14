import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Cloud, Server, Network, Shield } from "lucide-react";

interface CloudLevelSelectionProps {
  onSelect: (level: string) => void;
}

const levels = [
  {
    id: "beginner",
    name: "New to cloud",
    icon: Cloud,
    color: "#38BDF8",
    description:
      "You are starting from zero — terms like IAM, VPC, and EC2 are new.",
    promise: "Ren starts from Cloud Basics, Day 1.",
  },
  {
    id: "moderate",
    name: "Some exposure",
    icon: Network,
    color: "#A78BFA",
    description:
      "You have heard of AWS services but have not configured them hands-on.",
    promise: "Placement may skip straight to Professional Mode.",
  },
  {
    id: "pro",
    name: "Hands-on learner",
    icon: Server,
    color: "#7C3AED",
    description:
      "You have used the console before — users, buckets, or instances.",
    promise: "Ren meets you in the console path.",
  },
  {
    id: "ultra_pro",
    name: "Working engineer",
    icon: Shield,
    color: "#10B981",
    description:
      "You troubleshoot VPC, IAM, and cost issues in real accounts.",
    promise: "Advanced placement — console-first teaching.",
  },
];

const CloudLevelSelection = forwardRef<HTMLDivElement, CloudLevelSelectionProps>(
  ({ onSelect }, ref) => {
    return (
      <div ref={ref} className="max-w-4xl mx-auto pt-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <p className="font-mono-data text-[11px] uppercase tracking-[0.3em] text-sky-400 mb-5">
            Your path · Cloud
          </p>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-[1.1] mb-4">
            Where are you today?
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            Ren uses this plus a short placement quiz to assign your role and
            starting lessons — Fresher, Junior, or Engineer.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {levels.map((level, index) => {
            const Icon = level.icon;
            return (
              <motion.button
                key={level.id}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.45 }}
                whileHover={{ y: -4 }}
                onClick={() => onSelect(level.id)}
                className="group relative text-left rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8 transition hover:border-white/[0.16] hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: `${level.color}22` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: level.color }} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  {level.name}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {level.description}
                </p>
                <p
                  className="text-xs font-medium tracking-wide"
                  style={{ color: level.color }}
                >
                  {level.promise}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }
);

CloudLevelSelection.displayName = "CloudLevelSelection";

export default CloudLevelSelection;
