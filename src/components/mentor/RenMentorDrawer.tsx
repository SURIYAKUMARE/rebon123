import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Terminal,
  Sparkles,
  X,
  Send,
  HelpCircle,
  Copy,
  Check,
  ChevronRight,
  Shield,
  Lightbulb,
} from "lucide-react";

interface Message {
  role: "user" | "ren";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "How does an IAM Role differ from an IAM User?",
  "Why do we need a NAT Gateway for private subnets?",
  "What is the difference between Security Groups and Network ACLs?",
  "How does S3 Block Public Access protect our data?",
];

const KNOWLEDGE_BITES = [
  {
    title: "VPC Subnet Sizing Rule",
    rule: "AWS reserves 5 IP addresses in every subnet (.0 network, .1 router, .2 DNS, .3 future use, .255 broadcast). A /24 subnet has 251 usable IPs, not 256.",
  },
  {
    title: "Security Group Stateful Nature",
    rule: "Security Groups are stateful: if you send a request out, return traffic is automatically allowed regardless of inbound rules. Network ACLs are stateless.",
  },
  {
    title: "IAM Least Privilege",
    rule: "Never grant 's3:*' or 'iam:*' directly to instances. Use targeted IAM Instance Profiles with explicit Action and Resource ARNs.",
  },
];

export const RenMentorDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"mentor" | "cli" | "knowledge">("mentor");

  // Mentor Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ren",
      text: "I'm Ren, your personal cloud architect mentor. Ask me any architectural questions, or switch to the AWS CLI tab to run commands.",
      timestamp: "Just now",
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // CLI State
  const [cliInput, setCliInput] = useState("");
  const [cliHistory, setCliHistory] = useState<Array<{ cmd: string; out: string }>>([
    {
      cmd: "aws sts get-caller-identity",
      out: JSON.stringify(
        {
          UserId: "AROA4482910BCFA891",
          Account: "948201847192",
          Arn: "arn:aws:iam::948201847192:role/RebonCloudEngineer",
        },
        null,
        2
      ),
    },
  ]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendQuestion = (questionText?: string) => {
    const q = questionText || inputQuestion.trim();
    if (!q) return;

    const userMsg: Message = {
      role: "user",
      text: q,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");

    // Simulated Ren Architecture response
    setTimeout(() => {
      let reply = "";
      const lower = q.toLowerCase();

      if (lower.includes("iam role") || lower.includes("difference")) {
        reply =
          "An IAM User is for a human with long-term credentials (password, access keys). An IAM Role is for a service or federated user that assumes temporary credentials via AWS STS. EC2 instances should ALWAYS use IAM Roles (Instance Profiles) rather than hardcoded keys!";
      } else if (lower.includes("nat gateway") || lower.includes("private subnet")) {
        reply =
          "Private subnets have no direct route to an Internet Gateway, so they cannot be reached by public internet attackers. A NAT Gateway sits in a Public Subnet, translating outbound requests from private instances so they can download OS updates or packages while remaining completely protected from inbound ingress.";
      } else if (lower.includes("security group") || lower.includes("nacl")) {
        reply =
          "Security Groups operate at the Instance (ENI) level and are STATEFUL (return traffic automatically allowed). Network ACLs operate at the Subnet boundary and are STATELESS (you must explicitly permit both inbound and outbound rules).";
      } else if (lower.includes("block public access") || lower.includes("bpa")) {
        reply =
          "S3 Block Public Access provides centralized controls across 4 specific flags to prevent accidental public ACLs or bucket policies from making data publicly accessible. It overrides any permissive bucket policies!";
      } else {
        reply = `Great question regarding '${q}'. In production AWS environments, always follow the Well-Architected Framework: isolate workloads across multi-AZ subnets, enforce least privilege IAM, and monitor with CloudWatch metrics.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "ren",
          text: reply,
          timestamp: "Just now",
        },
      ]);
    }, 650);
  };

  const handleRunCli = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = cliInput.trim();
    if (!cmd) return;

    let output = "";
    const lower = cmd.toLowerCase();

    if (lower === "clear") {
      setCliHistory([]);
      setCliInput("");
      return;
    } else if (lower === "help") {
      output = "Available commands: aws s3 ls, aws ec2 describe-instances, aws iam list-users, aws vpc describe-vpcs, aws sts get-caller-identity, clear";
    } else if (lower.startsWith("aws s3 ls")) {
      output = `2026-10-12 04:12:19 finova-assets-prod
2026-10-14 09:20:41 finova-cloudtrail-audit-logs
2026-11-01 11:45:02 finova-database-backups-glacier`;
    } else if (lower.startsWith("aws ec2 describe-instances")) {
      output = JSON.stringify(
        {
          Reservations: [
            {
              Instances: [
                {
                  InstanceId: "i-078a9c2184bd1e90",
                  InstanceType: "t3.xlarge",
                  State: { Name: "running" },
                  PrivateIpAddress: "10.0.2.14",
                  SubnetId: "subnet-09ab1",
                },
                {
                  InstanceId: "i-09f14d88e402a6b2",
                  InstanceType: "t3.xlarge",
                  State: { Name: "running" },
                  PrivateIpAddress: "10.0.2.89",
                  SubnetId: "subnet-09ab2",
                },
              ],
            },
          ],
        },
        null,
        2
      );
    } else if (lower.startsWith("aws iam list-users")) {
      output = JSON.stringify(
        {
          Users: [
            { UserName: "devops-ci-deployer", Arn: "arn:aws:iam::948201847192:user/devops-ci-deployer" },
            { UserName: "audit-readonly", Arn: "arn:aws:iam::948201847192:user/audit-readonly" },
          ],
        },
        null,
        2
      );
    } else if (lower.startsWith("aws sts get-caller-identity")) {
      output = JSON.stringify(
        {
          UserId: "AROA4482910BCFA891",
          Account: "948201847192",
          Arn: "arn:aws:iam::948201847192:role/RebonCloudEngineer",
        },
        null,
        2
      );
    } else {
      output = `Unknown command: '${cmd}'. Type 'help' to see simulated commands.`;
    }

    setCliHistory((prev) => [...prev, { cmd, out: output }]);
    setCliInput("");
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-primary/40 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-primary/25 transition hover:scale-105"
        title="Open Ren AI Cloud Mentor & AWS Terminal"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white"></span>
        </span>
        <Sparkles className="h-4 w-4" />
        <span>Ask Ren & Terminal</span>
      </button>

      {/* Slide-out Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/[0.1] bg-[#0c0d14] text-foreground shadow-2xl"
            >
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-accent font-bold text-xs">
                    REN
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white">
                      Ren AI Cloud Mentor
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Architecture Advisor · Terminal · Knowledge
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/[0.06] bg-black/30 px-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("mentor")}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                    activeTab === "mentor"
                      ? "border-primary text-white"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Ask Ren</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cli")}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                    activeTab === "cli"
                      ? "border-primary text-white"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>AWS CLI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("knowledge")}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                    activeTab === "knowledge"
                      ? "border-primary text-white"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Architecture Rules</span>
                </button>
              </div>

              {/* TAB 1: MENTOR CHAT */}
              {activeTab === "mentor" && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          m.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                            m.role === "user"
                              ? "bg-primary text-white"
                              : "border border-white/[0.08] bg-white/[0.04] text-slate-200"
                          }`}
                        >
                          {m.text}
                        </div>
                        <span className="mt-1 text-[9px] text-muted-foreground">
                          {m.timestamp}
                        </span>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Quick Prompts */}
                  <div className="border-t border-white/[0.06] bg-black/20 p-2.5">
                    <p className="text-[10px] text-muted-foreground font-mono uppercase mb-1.5 px-1">
                      Quick Questions:
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {QUICK_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendQuestion(prompt)}
                          className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-white transition"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input form */}
                  <div className="border-t border-white/[0.08] p-3 bg-black/40">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendQuestion();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={inputQuestion}
                        onChange={(e) => setInputQuestion(e.target.value)}
                        placeholder="Ask Ren any AWS or architecture doubt..."
                        className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-primary p-2 text-white hover:bg-primary/80 transition"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: AWS CLI TERMINAL */}
              {activeTab === "cli" && (
                <div className="flex flex-1 flex-col overflow-hidden bg-black font-mono text-xs">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="text-[11px] text-muted-foreground border-b border-white/[0.08] pb-2">
                      REBON AWS CloudShell [us-east-1] · Type &apos;help&apos; for commands
                    </div>

                    {cliHistory.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-1.5 text-accent">
                          <span className="text-emerald-400">rebon@cloud:~$</span>
                          <span>{item.cmd}</span>
                        </div>
                        <pre className="text-[10px] text-slate-300 whitespace-pre-wrap bg-white/[0.02] p-2 rounded">
                          {item.out}
                        </pre>
                      </div>
                    ))}
                  </div>

                  {/* CLI input */}
                  <form onSubmit={handleRunCli} className="border-t border-white/[0.1] p-2 bg-[#08090f] flex items-center gap-2">
                    <span className="text-emerald-400 font-bold pl-1">&gt;</span>
                    <input
                      type="text"
                      value={cliInput}
                      onChange={(e) => setCliInput(e.target.value)}
                      placeholder="e.g. aws s3 ls, aws ec2 describe-instances..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-muted-foreground focus:outline-none"
                    />
                  </form>
                </div>
              )}

              {/* TAB 3: KNOWLEDGE RULES */}
              {activeTab === "knowledge" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Production heuristics every Cloud Engineer should know:
                  </p>
                  {KNOWLEDGE_BITES.map((bite, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-1">
                      <h4 className="font-bold text-accent text-xs">{bite.title}</h4>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {bite.rule}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RenMentorDrawer;
