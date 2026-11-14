import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Database,
  Cloud,
  Shield,
  Radio,
  Layers,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  HardDrive,
  Globe,
  Sliders,
  Play,
  Pause,
  Info,
} from "lucide-react";

interface NodeDetail {
  id: string;
  name: string;
  type: "EC2" | "RDS" | "S3" | "ALB" | "NAT" | "IGW";
  status: "healthy" | "warning" | "stopped";
  az: string;
  cidrOrIp: string;
  securityGroup: string;
  description: string;
  metrics: {
    cpu?: string;
    iops?: string;
    connections?: string;
    traffic?: string;
  };
}

const NODES_DATA: Record<string, NodeDetail> = {
  igw: {
    id: "igw-09ab77c12",
    name: "finova-prod-igw",
    type: "IGW",
    status: "healthy",
    az: "us-east-1 (Regional)",
    cidrOrIp: "Public Gateway",
    securityGroup: "N/A (Stateless)",
    description: "Attaches VPC to public internet. Handles bidirectional horizontal traffic translation.",
    metrics: { traffic: "420 Mbps", connections: "14.2k active" },
  },
  alb: {
    id: "alb-4482bc99",
    name: "finova-ingress-alb",
    type: "ALB",
    status: "healthy",
    az: "us-east-1a, 1b",
    cidrOrIp: "54.210.88.19 (Public IP)",
    securityGroup: "sg-01alb-inbound",
    description: "Layer 7 HTTP/HTTPS load balancer distributing requests across target group instances.",
    metrics: { cpu: "14%", connections: "8,920 req/sec", traffic: "310 Mbps" },
  },
  ec2_1: {
    id: "i-078a9c2184bd1e90",
    name: "prod-api-worker-01",
    type: "EC2",
    status: "healthy",
    az: "us-east-1a",
    cidrOrIp: "10.0.2.14 (Private IP)",
    securityGroup: "sg-02app-internal",
    description: "t3.xlarge instance running Dockerized API microservices with IAM Instance Profile.",
    metrics: { cpu: "38%", iops: "480 IOPS", connections: "1,240 sockets" },
  },
  ec2_2: {
    id: "i-09f14d88e402a6b2",
    name: "prod-api-worker-02",
    type: "EC2",
    status: "healthy",
    az: "us-east-1b",
    cidrOrIp: "10.0.2.89 (Private IP)",
    securityGroup: "sg-02app-internal",
    description: "t3.xlarge instance running AutoScaling target group workload in availability zone 1b.",
    metrics: { cpu: "42%", iops: "510 IOPS", connections: "1,380 sockets" },
  },
  rds: {
    id: "rds-pg-cluster-prod",
    name: "finova-prod-db-primary",
    type: "RDS",
    status: "healthy",
    az: "us-east-1a (Multi-AZ Standby 1b)",
    cidrOrIp: "10.0.3.50 (Private Isolated)",
    securityGroup: "sg-03db-postgres",
    description: "PostgreSQL 16.2 db.r6g.xlarge with synchronous Multi-AZ standby replication.",
    metrics: { cpu: "28%", iops: "1,850 IOPS", connections: "185 / 500" },
  },
  s3: {
    id: "s3://finova-assets-prod",
    name: "finova-assets-prod",
    type: "S3",
    status: "healthy",
    az: "us-east-1 (Global Bucket)",
    cidrOrIp: "Private VPC Endpoint s3-vpce",
    securityGroup: "Bucket Policy (Restricted)",
    description: "Server-side AES-256 encrypted object store with Block Public Access fully enabled.",
    metrics: { traffic: "64 GB/day", iops: "2,400 GET/s" },
  },
};

export const CloudTopologyMap = () => {
  const [trafficSimulating, setTrafficSimulating] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [chaosState, setChaosState] = useState<"normal" | "ec2_down" | "nat_lag">("normal");

  const getNodeStatus = (key: string): "healthy" | "warning" | "stopped" => {
    if (chaosState === "ec2_down" && key === "ec2_2") return "stopped";
    if (chaosState === "nat_lag" && key === "alb") return "warning";
    return NODES_DATA[key]?.status || "healthy";
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-5 md:p-8 text-foreground shadow-2xl overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
              Live Cloud Topology Map
            </span>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              VPC: vpc-08a9c14 (10.0.0.0/16)
            </span>
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-white mt-1">
            Production Multi-AZ Architecture
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Interactive AWS infrastructure view. Inspect components, toggle simulated traffic, or test failovers.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTrafficSimulating(!trafficSimulating)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              trafficSimulating
                ? "bg-primary/20 text-accent border border-primary/40"
                : "bg-white/[0.04] text-muted-foreground border border-white/[0.08] hover:text-white"
            }`}
          >
            {trafficSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {trafficSimulating ? "Pause Traffic" : "Resume Traffic"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (chaosState === "normal") setChaosState("ec2_down");
              else if (chaosState === "ec2_down") setChaosState("nat_lag");
              else setChaosState("normal");
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border ${
              chaosState !== "normal"
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Chaos: {chaosState === "normal" ? "Off" : chaosState === "ec2_down" ? "Worker 2 Terminated" : "ALB Throttled"}</span>
          </button>
        </div>
      </div>

      {/* Topology Canvas */}
      <div className="relative mt-6 rounded-xl border border-white/[0.06] bg-[#07080c]/80 p-6 overflow-x-auto min-w-[700px]">
        {/* VPC Boundary Label */}
        <div className="flex items-center justify-between pb-4 text-xs font-mono text-muted-foreground border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-semibold text-white">AWS VPC finova-prod (10.0.0.0/16)</span>
            <span>· Region: us-east-1</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> SLA 99.99% Healthy
            </span>
          </div>
        </div>

        {/* Multi-Tier Architecture Grid */}
        <div className="grid grid-cols-4 gap-4 mt-6 relative">
          
          {/* TIER 1: Edge & Ingress */}
          <div className="space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              1. Ingress Tier
            </div>

            {/* Public Internet Gateway */}
            <div
              onClick={() => setSelectedNode(NODES_DATA.igw)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                selectedNode?.id === NODES_DATA.igw.id
                  ? "border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Globe className="h-5 w-5 text-sky-400" />
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="mt-2 text-xs font-bold text-white">Internet Gateway</p>
              <p className="font-mono text-[10px] text-muted-foreground">igw-09ab77c12</p>
              <div className="mt-2 text-[10px] text-sky-300 font-mono">0.0.0.0/0 route</div>
            </div>

            {/* Application Load Balancer */}
            <div
              onClick={() => setSelectedNode(NODES_DATA.alb)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                getNodeStatus("alb") === "warning"
                  ? "border-amber-400/80 bg-amber-500/10"
                  : selectedNode?.id === NODES_DATA.alb.id
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Radio className="h-5 w-5 text-accent" />
                <span
                  className={`h-2 w-2 rounded-full ${
                    getNodeStatus("alb") === "warning" ? "bg-amber-400 animate-ping" : "bg-emerald-500"
                  }`}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-white">Application Load Balancer</p>
              <p className="font-mono text-[10px] text-muted-foreground">Public Subnet 10.0.1.0/24</p>
              <div className="mt-2 text-[10px] text-accent font-mono">HTTPS :443 Inbound</div>
            </div>
          </div>

          {/* TIER 2: Compute Layer (Private Subnets) */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <span>2. Application Compute Tier (Private Subnets)</span>
              <span className="text-[10px] text-sky-400">AutoScaling Group (2 nodes)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* EC2 Node 1 */}
              <div
                onClick={() => setSelectedNode(NODES_DATA.ec2_1)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                  selectedNode?.id === NODES_DATA.ec2_1.id
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Server className="h-5 w-5 text-amber-400" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 text-xs font-bold text-white">API Worker 01</p>
                <p className="font-mono text-[10px] text-muted-foreground">AZ: us-east-1a</p>
                <p className="font-mono text-[10px] text-amber-300 mt-1">10.0.2.14 · t3.xlarge</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Activity className="h-3 w-3 text-emerald-400" />
                  <span>CPU 38%</span>
                </div>
              </div>

              {/* EC2 Node 2 */}
              <div
                onClick={() => setSelectedNode(NODES_DATA.ec2_2)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                  getNodeStatus("ec2_2") === "stopped"
                    ? "border-rose-500/80 bg-rose-500/10"
                    : selectedNode?.id === NODES_DATA.ec2_2.id
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Server className="h-5 w-5 text-amber-400" />
                  <span
                    className={`h-2 w-2 rounded-full ${
                      getNodeStatus("ec2_2") === "stopped" ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-white">API Worker 02</p>
                <p className="font-mono text-[10px] text-muted-foreground">AZ: us-east-1b</p>
                <p className="font-mono text-[10px] text-amber-300 mt-1">10.0.2.89 · t3.xlarge</p>
                <div className="mt-2 flex items-center gap-1 text-[10px]">
                  {getNodeStatus("ec2_2") === "stopped" ? (
                    <span className="text-rose-400 font-semibold">Terminated (Chaos)</span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3 text-emerald-400" />
                      CPU 42%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* NAT Gateway pill */}
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.01] px-3 py-2 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-accent" />
                <span>NAT Gateway (nat-034ac1)</span>
              </span>
              <span className="text-emerald-400 text-[10px]">Egress Route Active</span>
            </div>
          </div>

          {/* TIER 3: Data & Storage */}
          <div className="space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              3. Data & Object Storage
            </div>

            {/* RDS Postgres Cluster */}
            <div
              onClick={() => setSelectedNode(NODES_DATA.rds)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                selectedNode?.id === NODES_DATA.rds.id
                  ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Database className="h-5 w-5 text-emerald-400" />
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="mt-2 text-xs font-bold text-white">PostgreSQL Multi-AZ</p>
              <p className="font-mono text-[10px] text-muted-foreground">Isolated Subnet 10.0.3.0/24</p>
              <p className="font-mono text-[10px] text-emerald-300 mt-1">Port 5432 · db.r6g.xlarge</p>
              <div className="mt-2 text-[10px] text-muted-foreground">Sync Standby 1b</div>
            </div>

            {/* S3 Storage */}
            <div
              onClick={() => setSelectedNode(NODES_DATA.s3)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                selectedNode?.id === NODES_DATA.s3.id
                  ? "border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <HardDrive className="h-5 w-5 text-sky-400" />
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="mt-2 text-xs font-bold text-white">S3 Object Bucket</p>
              <p className="font-mono text-[10px] text-muted-foreground">s3://finova-assets-prod</p>
              <p className="font-mono text-[10px] text-sky-300 mt-1">VPC Endpoint Gateway</p>
              <div className="mt-2 text-[10px] text-emerald-400">Block Public Access ON</div>
            </div>
          </div>

        </div>

        {/* Live Traffic Flow Animated Indicators */}
        {trafficSimulating && (
          <div className="mt-6 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs font-mono text-accent">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Simulated Ingress: 14,200 req/s</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>ALB &rarr; App: 4.2ms</span>
              <span>App &rarr; RDS: 1.1ms</span>
              <span className="text-emerald-400">Packet Loss: 0.00%</span>
            </div>
          </div>
        )}
      </div>

      {/* Node Details Inspection Modal / Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 rounded-xl border border-white/[0.12] bg-[#12141c] p-6 text-xs text-foreground shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] text-accent font-semibold">
                  {selectedNode.type} Resource Config
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedNode.name}</h3>
                <span className="font-mono text-xs text-muted-foreground">{selectedNode.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.08] hover:text-white"
              >
                Close &times;
              </button>
            </div>

            <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
              {selectedNode.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/[0.06]">
              <div className="rounded-lg bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase">Availability Zone</span>
                <p className="font-semibold text-white mt-0.5">{selectedNode.az}</p>
              </div>
              <div className="rounded-lg bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase">Network / IP</span>
                <p className="font-mono text-sky-400 mt-0.5">{selectedNode.cidrOrIp}</p>
              </div>
              <div className="rounded-lg bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase">Security Group</span>
                <p className="font-mono text-accent mt-0.5">{selectedNode.securityGroup}</p>
              </div>
              <div className="rounded-lg bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase">Primary Health</span>
                <p className="text-emerald-400 font-semibold mt-0.5 capitalize">{selectedNode.status}</p>
              </div>
            </div>

            {/* Telemetry Metrics */}
            <div className="mt-3 flex flex-wrap gap-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-muted-foreground">
              {Object.entries(selectedNode.metrics).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="capitalize">{k}:</span>
                  <span className="text-white font-semibold">{v}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CloudTopologyMap;
