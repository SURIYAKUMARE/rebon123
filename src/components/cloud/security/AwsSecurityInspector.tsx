import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  FileText,
  X,
  ExternalLink,
  Zap,
} from "lucide-react";

interface SecurityCheck {
  id: string;
  category: "IAM" | "Network" | "Storage" | "Audit";
  title: string;
  status: "pass" | "warning" | "enforced";
  detail: string;
  cisBenchmark: string;
}

const SECURITY_CHECKS: SecurityCheck[] = [
  {
    id: "sec-1",
    category: "IAM",
    title: "Virtual MFA Enforced for Console Login",
    status: "enforced",
    detail: "Hardware or virtual TOTP Multi-Factor Authentication required for all IAM principals.",
    cisBenchmark: "CIS AWS Benchmark v1.4.0 §1.5",
  },
  {
    id: "sec-2",
    category: "IAM",
    title: "Root Account Access Keys Disabled",
    status: "pass",
    detail: "No active access keys exist for the root account. Root account is locked.",
    cisBenchmark: "CIS AWS Benchmark v1.4.0 §1.12",
  },
  {
    id: "sec-3",
    category: "IAM",
    title: "Temporary STS Role Assumption (Least Privilege)",
    status: "enforced",
    detail: "Learner operates under FinovaAssociate temporary session token. Max TTL 1 hour.",
    cisBenchmark: "AWS Well-Architected Security Pillar §SEC-2",
  },
  {
    id: "sec-4",
    category: "Network",
    title: "Zero Inbound 0.0.0.0/0 SSH/RDP Rules",
    status: "pass",
    detail: "All Security Groups restrict administrative ports (22, 3389) to authorized bastion CIDRs.",
    cisBenchmark: "CIS AWS Benchmark v1.4.0 §4.1",
  },
  {
    id: "sec-5",
    category: "Storage",
    title: "S3 Account-Level Block Public Access Enabled",
    status: "pass",
    detail: "All 4 Block Public Access settings are active, preventing accidental bucket policy leaks.",
    cisBenchmark: "CIS AWS Benchmark v1.4.0 §2.1.5",
  },
  {
    id: "sec-6",
    category: "Audit",
    title: "AWS CloudTrail Multi-Region Log Validation",
    status: "enforced",
    detail: "Management events logged with log file integrity validation active across all regions.",
    cisBenchmark: "CIS AWS Benchmark v1.4.0 §2.1",
  },
];

export const AwsSecurityInspector = ({
  accountId = "948201847192",
  accountName = "finova-enterprise-prod",
}: {
  accountId?: string;
  accountName?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  const filteredChecks =
    selectedFilter === "All"
      ? SECURITY_CHECKS
      : SECURITY_CHECKS.filter((c) => c.category === selectedFilter);

  return (
    <>
      {/* Header Security Pill Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-500/20 hover:border-emerald-500/60"
        title="View AWS Security Posture & CIS Compliance Audit"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        <span className="hidden sm:inline">CIS Security Benchmark:</span>
        <span className="font-bold">100% PASS</span>
      </button>

      {/* Slide-out Security Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-white/[0.1] bg-[#0c0e17] text-slate-100 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#080910]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                      <span>AWS Security Posture Inspector</span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        CIS Benchmark Level 1
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Account: {accountName} ({accountId})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Security Health KPI Row */}
              <div className="grid grid-cols-3 gap-2 border-b border-white/[0.08] bg-black/30 p-4">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">MFA Status</span>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Enforced
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Root Keys</span>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" /> None (Safe)
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Session TTL</span>
                  <p className="text-xs font-bold text-sky-400 mt-0.5 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> 58m Left
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-white/[0.06] bg-black/20 px-4 py-2 gap-1.5">
                {["All", "IAM", "Network", "Storage", "Audit"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedFilter(cat)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      selectedFilter === cat
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Security Audit Rules List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredChecks.map((check) => (
                  <div
                    key={check.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-white/[0.15]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <h4 className="text-xs font-bold text-white">{check.title}</h4>
                      </div>
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                        {check.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-300 pl-6">
                      {check.detail}
                    </p>

                    <div className="mt-2.5 pl-6 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/[0.04] pt-2">
                      <span>{check.cisBenchmark}</span>
                      <span className="text-accent">{check.category}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Footer Notice */}
              <div className="border-t border-white/[0.08] bg-[#080910] p-4 text-[11px] text-slate-400 flex items-center justify-between">
                <span>REBON Sandbox: Zero real billing risk · Immutable audit logging</span>
                <span className="text-emerald-400 font-semibold">Protected</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AwsSecurityInspector;
