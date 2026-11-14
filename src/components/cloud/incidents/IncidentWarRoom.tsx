import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  Terminal,
  FileText,
  Search,
  Check,
  Award,
  Zap,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface Incident {
  id: string;
  code: string;
  title: string;
  severity: "P1 - Critical" | "P2 - High" | "P3 - Moderate";
  service: "S3 / Security" | "EC2 / AutoScaling" | "VPC / Routing";
  timeLimitSec: number;
  description: string;
  impact: string;
  logs: string[];
  options: {
    id: string;
    text: string;
    correct: boolean;
    explanation: string;
  }[];
}

const INCIDENTS: Incident[] = [
  {
    id: "inc-1",
    code: "INC-842",
    title: "Production S3 Bucket Public Exposure Detected",
    severity: "P1 - Critical",
    service: "S3 / Security",
    timeLimitSec: 180,
    description: "SecurityHub detected s3://finova-core-records has public READ access enabled. Anonymous external requests logged.",
    impact: "Potential exfiltration of customer account records. Compliance breach alert.",
    logs: [
      "[10:04:12 UTC] SecurityHub Finding: S3.2 Bucket should have public access block enabled",
      "[10:04:15 UTC] CloudTrail Event: GetObject by Anonymous [IP: 198.51.100.44]",
      "[10:04:18 UTC] GuardDuty Alert: Stealth:S3/PolicyChangeToPublic in finova-core-records",
      "[10:04:22 UTC] Action required: Enforce Account BPA and revoke public bucket policy",
    ],
    options: [
      {
        id: "opt-1",
        text: "Enable 'Block Public Access' (BPA) at the bucket level and delete wildcard Principal in Bucket Policy",
        correct: true,
        explanation: "Correct! Enabling all 4 Block Public Access flags immediately overrides and blocks all public ACLs and wildcard policies.",
      },
      {
        id: "opt-2",
        text: "Delete the entire S3 bucket to stop access immediately",
        correct: false,
        explanation: "Deleting the production bucket destroys live customer data. You must update permissions, not destroy storage.",
      },
      {
        id: "opt-3",
        text: "Restart the EC2 instances accessing the bucket",
        correct: false,
        explanation: "EC2 restart has zero effect on S3 bucket policies or public internet access.",
      },
    ],
  },
  {
    id: "inc-2",
    code: "INC-619",
    title: "ALB 504 Gateway Timeouts & ASG Capacity Exhaustion",
    severity: "P1 - Critical",
    service: "EC2 / AutoScaling",
    timeLimitSec: 180,
    description: "Application Load Balancer reporting 18% 504 Gateway Timeout rate. Worker nodes unresponsive.",
    impact: "Checkout and payment processing API failing for 12,000 active shoppers.",
    logs: [
      "[10:01:02 UTC] CloudWatch Alarm: ALB TargetResponseTime > 5.0s (Current: 14.2s)",
      "[10:01:10 UTC] EC2 worker i-09f14 CPUUtilization at 99.8% for 4 consecutive periods",
      "[10:01:15 UTC] TargetGroup finova-api-tg: 2 of 2 instances reporting UNHEALTHY",
      "[10:01:20 UTC] AutoScalingGroup DesiredCapacity stuck at 2 (Max: 2 limit reached)",
    ],
    options: [
      {
        id: "opt-1",
        text: "Increase ASG Max Capacity from 2 to 8, trigger manual scale out to 6, and drain unhealthy targets",
        correct: true,
        explanation: "Correct! The AutoScaling group was bottlenecked by a MaxCapacity limit of 2. Expanding capacity and adding healthy instances recovers the load balancer.",
      },
      {
        id: "opt-2",
        text: "Delete the Application Load Balancer and point DNS directly to one EC2 instance",
        correct: false,
        explanation: "Pointing traffic to an already overloaded instance causes complete site outage.",
      },
      {
        id: "opt-3",
        text: "Change the VPC CIDR block from 10.0.0.0/16 to 192.168.0.0/16",
        correct: false,
        explanation: "Changing VPC CIDRs is disruptive and completely irrelevant to EC2 CPU exhaustion.",
      },
    ],
  },
  {
    id: "inc-3",
    code: "INC-308",
    title: "Private Subnet Route Table Drop (RDS Connection Failure)",
    severity: "P2 - High",
    service: "VPC / Routing",
    timeLimitSec: 240,
    description: "All microservices in private subnet 10.0.2.0/24 lost connectivity to RDS database cluster in 10.0.3.0/24.",
    impact: "Read/write database operations failing across user authentication and dashboard services.",
    logs: [
      "[09:58:14 UTC] App Error: Dial tcp 10.0.3.50:5432: i/o timeout",
      "[09:58:20 UTC] CloudTrail: UpdateRouteTable on rtb-088f21 applied by automated deploy script",
      "[09:58:25 UTC] VPC Flow Logs: REJECT traffic from 10.0.2.14:48122 -> 10.0.3.50:5432",
      "[09:58:30 UTC] Missing local VPC CIDR route 10.0.0.0/16 -> local",
    ],
    options: [
      {
        id: "opt-1",
        text: "Restore the missing internal route 10.0.0.0/16 -> local in Route Table rtb-088f21",
        correct: true,
        explanation: "Correct! Internal VPC communication requires the default '10.0.0.0/16 -> local' route so subnets can route to each other.",
      },
      {
        id: "opt-2",
        text: "Assign public IPv4 addresses to the RDS Postgres database instances",
        correct: false,
        explanation: "Databases must remain in private isolated subnets for security. Exposing them to public IPs creates a huge security vulnerability.",
      },
      {
        id: "opt-3",
        text: "Open port 22 SSH on all instances",
        correct: false,
        explanation: "SSH is completely unrelated to internal PostgreSQL connectivity.",
      },
    ],
  },
];

export const IncidentWarRoom = () => {
  const [activeIncident, setActiveIncident] = useState<Incident>(INCIDENTS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(INCIDENTS[0].timeLimitSec);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [scoreEarned, setScoreEarned] = useState(0);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || timeLeft <= 0 || resolved) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          setFeedback("Time expired! The incident escalated to senior leadership.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, resolved]);

  const handleStartDrill = (inc: Incident) => {
    setActiveIncident(inc);
    setTimeLeft(inc.timeLimitSec);
    setIsRunning(true);
    setSelectedOptionId(null);
    setResolved(false);
    setFeedback(null);
  };

  const handleSubmitTriage = () => {
    if (!selectedOptionId) return;
    const option = activeIncident.options.find((o) => o.id === selectedOptionId);
    if (!option) return;

    if (option.correct) {
      setResolved(true);
      setIsRunning(false);
      setScoreEarned((prev) => prev + 100);
      setFeedback(`SUCCESS: ${option.explanation}`);
    } else {
      setFeedback(`TRIAGE FAILED: ${option.explanation} Try another mitigation!`);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-5 md:p-8 text-foreground shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-xs uppercase tracking-widest text-rose-400">
              SRE Cloud War Room · Live Drill
            </span>
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-white mt-1">
            Production Incident Simulation
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Diagnose real AWS outages, inspect telemetry logs under clock pressure, and verify resolutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-mono text-amber-300 flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span>SRE Score: {scoreEarned} pts</span>
          </div>
        </div>
      </div>

      {/* Incident Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        {INCIDENTS.map((inc) => (
          <button
            key={inc.id}
            type="button"
            onClick={() => handleStartDrill(inc)}
            className={`text-left rounded-xl border p-4 transition-all duration-200 ${
              activeIncident.id === inc.id
                ? "border-primary/80 bg-primary/10 shadow-lg shadow-primary/5"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white">{inc.code}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  inc.severity.startsWith("P1")
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-orange-500/20 text-orange-400"
                }`}
              >
                {inc.severity}
              </span>
            </div>
            <h4 className="font-display text-xs font-bold text-white mt-2 line-clamp-1">
              {inc.title}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1">{inc.service}</p>
          </button>
        ))}
      </div>

      {/* Active Incident Drill Panel */}
      <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#07080c] p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-rose-400">{activeIncident.code}</span>
              <span className="text-white text-sm md:text-base font-bold">{activeIncident.title}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Impact: {activeIncident.impact}</p>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 font-mono text-sm text-rose-400">
            <Clock className="h-4 w-4" />
            <span className="font-bold">{formatTimer(timeLeft)}</span>
            <span className="text-[10px] text-muted-foreground">remaining</span>
          </div>
        </div>

        {/* Telemetry Log Stream */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2">
            <Terminal className="h-3.5 w-3.5 text-accent" />
            <span>CloudTrail & CloudWatch Telemetry Logs</span>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/70 p-3 font-mono text-[11px] space-y-1.5 max-h-40 overflow-y-auto">
            {activeIncident.logs.map((log, idx) => (
              <div key={idx} className="text-slate-300">
                <span className="text-primary font-semibold">&gt; </span>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Triage Action Options */}
        <div className="mt-6">
          <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
            Select Mitigation Strategy & Deploy Fix:
          </h4>
          <div className="space-y-2.5">
            {activeIncident.options.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  selectedOptionId === opt.id
                    ? "border-primary bg-primary/10 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="triage-option"
                  checked={selectedOptionId === opt.id}
                  onChange={() => setSelectedOptionId(opt.id)}
                  disabled={resolved}
                  className="mt-1 accent-primary"
                />
                <span className="text-xs leading-relaxed">{opt.text}</span>
              </label>
            ))}
          </div>

          {/* Action Buttons & Feedback */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={() => handleStartDrill(activeIncident)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Drill
            </button>

            <button
              type="button"
              onClick={handleSubmitTriage}
              disabled={!selectedOptionId || resolved}
              className={`rounded-lg px-5 py-2 text-xs font-semibold text-black transition ${
                resolved
                  ? "bg-emerald-400 cursor-not-allowed"
                  : selectedOptionId
                    ? "bg-sky-400 hover:bg-sky-300"
                    : "bg-sky-400/50 cursor-not-allowed"
              }`}
            >
              {resolved ? "Incident Resolved ✓" : "Execute Mitigation →"}
            </button>
          </div>

          {/* Result Feedback Banner */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 rounded-lg p-3 text-xs leading-relaxed ${
                  resolved
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default IncidentWarRoom;
