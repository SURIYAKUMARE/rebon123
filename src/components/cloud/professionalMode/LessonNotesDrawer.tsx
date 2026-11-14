import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, Terminal, CheckCircle2, Shield, Lightbulb, ExternalLink } from "lucide-react";

interface Props {
  lessonId: string;
  lessonTitle: string;
}

export const LessonNotesDrawer = ({ lessonId, lessonTitle }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition"
        title="View lesson concepts, commands, and security guidelines"
      >
        <BookOpen className="h-3.5 w-3.5 text-accent" />
        <span className="hidden sm:inline">Architecture Notes</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/[0.1] bg-[#0c0e17] text-slate-100 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 bg-[#080910]">
                <div>
                  <span className="font-mono text-[10px] text-accent uppercase font-bold tracking-wider">
                    {lessonId} · Reference Notes
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{lessonTitle}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-slate-300">
                {/* Section 1: Core Concept */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 font-bold text-white mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <span>Core Architectural Objectives</span>
                  </div>
                  <p className="text-slate-300">
                    In this lesson, Ren teaches you the foundational AWS navigation, identity boundaries, and telemetry controls required on Day 1 of enterprise cloud engineering.
                  </p>
                </div>

                {/* Section 2: Security Best Practices */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 mb-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span>Security & Least Privilege</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    <li>Always verify your 12-digit AWS Account ID and region before deploying.</li>
                    <li>Never create IAM access keys for the root user.</li>
                    <li>Inspect CloudWatch alarms to detect resource anomalies under 60 seconds.</li>
                  </ul>
                </div>

                {/* Section 3: CLI Shortcuts */}
                <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 font-mono text-[11px]">
                  <div className="flex items-center gap-2 font-bold text-accent mb-2">
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Equivalent AWS CLI Commands</span>
                  </div>
                  <div className="space-y-2 text-slate-300">
                    <div>
                      <p className="text-slate-500"># Verify active caller identity</p>
                      <p className="text-sky-300 font-semibold">aws sts get-caller-identity</p>
                    </div>
                    <div>
                      <p className="text-slate-500"># List available EC2 regions</p>
                      <p className="text-sky-300 font-semibold">aws ec2 describe-regions --all-regions</p>
                    </div>
                    <div>
                      <p className="text-slate-500"># Inspect active CloudWatch alarms</p>
                      <p className="text-sky-300 font-semibold">aws cloudwatch describe-alarms --state-value ALARM</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LessonNotesDrawer;
