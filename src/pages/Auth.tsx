import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  Terminal,
  CheckCircle2,
  Cloud,
  Server,
  Zap,
} from "lucide-react";

const TRACK_OPTIONS = [
  {
    id: "csa",
    name: "Cloud Support Associate (L1)",
    desc: "Finova service desk, IAM permissions & CloudWatch alarms",
    icon: Cloud,
  },
  {
    id: "devops",
    name: "DevOps & Infrastructure Engineer",
    desc: "Multi-AZ VPC, EC2 AutoScaling & Load Balancers",
    icon: Server,
  },
  {
    id: "sre",
    name: "SRE & Cloud Security Specialist",
    desc: "CIS Benchmark compliance & Incident War Room drills",
    icon: ShieldCheck,
  },
];

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("csa");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const { signIn, signUp, demoSignIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = (location.state as { from?: string })?.from || "/learning";

  useEffect(() => {
    if (user) {
      navigate(destination, { replace: true });
    }
  }, [user, navigate, destination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signin") {
        if (!email.trim() || !password.trim()) {
          toast({
            variant: "destructive",
            title: "Missing credentials",
            description: "Please enter both your email address and password.",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Authentication failed",
            description: error.message,
          });
        } else {
          toast({
            title: "Welcome back to REBON",
            description: "Session authenticated. Entering console...",
          });
          navigate(destination, { replace: true });
        }
      } else {
        if (!fullName.trim()) {
          toast({
            variant: "destructive",
            title: "Full name required",
            description: "Please enter your name for your verified proof credentials.",
          });
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          toast({
            variant: "destructive",
            title: "Password too short",
            description: "Password must be at least 6 characters long.",
          });
          setIsLoading(false);
          return;
        }

        const chosenTrackName =
          TRACK_OPTIONS.find((t) => t.id === selectedTrack)?.name || "Cloud Support Associate (L1)";

        const { error } = await signUp(email, password, fullName, chosenTrackName);
        if (error) {
          toast({
            variant: "destructive",
            title: "Account creation failed",
            description: error.message,
          });
        } else {
          toast({
            title: "Account initialized",
            description: `Welcome ${fullName}. Your cloud environment is ready.`,
          });
          navigate(destination, { replace: true });
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "System error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignIn = async (role: "csa" | "architect") => {
    setIsLoading(true);
    try {
      await demoSignIn(role);
      toast({
        title: role === "csa" ? "Logged in as Cloud Support Associate" : "Logged in as Solutions Architect",
        description: "Fast-track session active. No credit card or AWS keys needed.",
      });
      navigate(destination, { replace: true });
    } catch {
      toast({
        variant: "destructive",
        title: "Demo login failed",
        description: "Could not initialize demo session.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email to receive recovery instructions.",
      });
      return;
    }
    setResetSent(true);
    toast({
      title: "Password reset link dispatched",
      description: `Security token sent to ${resetEmail}. Check your inbox.`,
    });
    setTimeout(() => {
      setIsForgotPasswordOpen(false);
      setResetSent(false);
      setResetEmail("");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-foreground flex flex-col justify-between relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-[25%] -left-[10%] w-[55%] h-[55%] rounded-full opacity-20 blur-[130px]"
          style={{ background: "radial-gradient(circle, hsl(262 83% 58%), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[55%] h-[55%] rounded-full opacity-15 blur-[140px]"
          style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Top Navbar Header */}
      <header className="relative z-20 w-full px-6 md:px-14 py-6 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md bg-[#09090B]/60">
        <Link
          to="/"
          className="flex items-center gap-2 group text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>

        <Link to="/" className="font-display text-xl font-extrabold tracking-[0.08em] text-foreground">
          REBON
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Console Sandbox Active
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Platform Value & Live Assurance (Hidden on mobile) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-8 pr-4"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-white/5 border border-white/10 text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Proof-First Cloud Architecture
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Master the Cloud. <br />
                <span className="bg-gradient-to-r from-amber-400 via-primary to-emerald-400 bg-clip-text text-transparent">
                  Prove Your Value.
                </span>
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Step inside high-fidelity simulated AWS console environments, resolve live SRE incident drills, and build verifiable proof of work with Ren.
              </p>
            </div>

            {/* Feature Highlights Card */}
            <div className="space-y-3.5 bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Zero Cloud Bill Risk</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    100% simulated client-side console with 6 services (EC2, S3, IAM, VPC, CloudWatch, Billing).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">CIS Benchmark & SRE Drills</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Hands-on incident response war rooms and automatic CIS AWS foundation audits.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Verifiable Evidence Portfolio</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Generate cryptographic skill cards and radar charts proving your hands-on competencies.
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial / Mentor Note */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-primary flex items-center justify-center font-bold text-xs text-white shadow-glow">
                Ren
              </div>
              <p className="text-xs text-muted-foreground italic">
                "Not another course video. You do the work, I guide your mouse, you own the skill."
              </p>
            </div>
          </motion.div>

          {/* Right Column: Authentication Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-7 bg-[#121217]/90 border border-white/[0.08] shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur-xl relative"
          >
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5 mb-6">
              <div className="flex items-center gap-2 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    mode === "signin"
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    mode === "signup"
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                {mode === "signin" ? "Returning Member" : "New Candidate"}
              </span>
            </div>

            {/* Quick Demo Sign-in Fast-Track */}
            <div className="mb-6 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-transparent border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  Instant Test-Drive (No Password Needed)
                </span>
                <span className="text-[10px] text-muted-foreground">1-Click</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoSignIn("csa")}
                  disabled={isLoading}
                  className="h-8 text-xs border-amber-500/30 hover:border-amber-400 bg-background/50 hover:bg-amber-500/10 text-foreground justify-start"
                >
                  <Cloud className="w-3.5 h-3.5 mr-2 text-amber-400" />
                  Demo as Cloud Associate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoSignIn("architect")}
                  disabled={isLoading}
                  className="h-8 text-xs border-primary/30 hover:border-primary/60 bg-background/50 hover:bg-primary/10 text-foreground justify-start"
                >
                  <Server className="w-3.5 h-3.5 mr-2 text-primary" />
                  Demo as Solutions Architect
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <span className="relative px-3 bg-[#121217] text-[11px] uppercase tracking-widest text-muted-foreground">
                or continue with credentials
              </span>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5" /> Full Name
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="e.g. Vikram Aditya"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-white/[0.03] border-white/10 h-10 text-sm focus-visible:ring-primary focus-visible:border-primary"
                      />
                    </div>

                    {/* Career Track Selector */}
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs text-muted-foreground">Select Starting Focus Track</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {TRACK_OPTIONS.map((track) => {
                          const Icon = track.icon;
                          const isSelected = selectedTrack === track.id;
                          return (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => setSelectedTrack(track.id)}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? "bg-primary/15 border-primary text-foreground"
                                  : "bg-white/[0.02] border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                              }`}
                            >
                              <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-foreground">{track.name}</p>
                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{track.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="engineer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/[0.03] border-white/10 h-10 text-sm focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Password
                  </Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/[0.03] border-white/10 h-10 pr-10 text-sm focus-visible:ring-primary focus-visible:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "signin" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                    Remember this session on this machine
                  </label>
                </div>
              )}

              <Button
                type="submit"
                variant="hero"
                className="w-full mt-4 h-11 text-sm font-medium tracking-wide"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : mode === "signin" ? (
                  "Sign In to Console"
                ) : (
                  "Create Account & Start Learning"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                {mode === "signin" ? "Don't have an account yet?" : "Already enrolled in REBON?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-primary hover:underline transition-all ml-1"
                >
                  {mode === "signin" ? "Register new account" : "Sign in here"}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer Assurance */}
      <footer className="relative z-10 py-5 text-center border-t border-white/[0.06] text-xs text-muted-foreground/80 bg-[#09090B]/60 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-center gap-6 px-4">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            256-Bit TLS Encrypted
          </span>
          <span>•</span>
          <span>Zero Cloud Billing Guarantee</span>
          <span>•</span>
          <span>CIS AWS Foundations Benchmark Compliant</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#18181F] border border-white/10 rounded-2xl p-6 shadow-2xl relative"
            >
              <h3 className="font-display text-lg font-bold text-foreground">Reset Password</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Enter your account email. We will generate a secure reset link to restore console credentials.
              </p>

              {resetSent ? (
                <div className="my-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-emerald-400">Recovery Instructions Sent</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Check your email inbox or spam folder for your reset token.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="resetEmail" className="text-xs text-muted-foreground">
                      Email address
                    </Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="engineer@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="bg-white/[0.04] border-white/10 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsForgotPasswordOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" variant="hero" className="text-xs">
                      Send Reset Link
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
