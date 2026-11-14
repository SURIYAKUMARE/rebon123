import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDomain } from "@/contexts/DomainContext";
import { useAva } from "@/contexts/AvaContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DomainNavbar from "@/components/app/DomainNavbar";
import RenMentorDrawer from "@/components/mentor/RenMentorDrawer";
import LevelSelection from "@/components/learning/LevelSelection";
import InitialQuiz from "@/components/learning/InitialQuiz";
import VoiceAssessment from "@/components/learning/VoiceAssessment";
import LearningDashboard from "@/components/learning/LearningDashboard";
import CloudLevelSelection from "@/components/cloud/CloudLevelSelection";
import CloudInitialQuiz from "@/components/cloud/CloudInitialQuiz";
import { useRebonMode } from "@/components/cloud/RebonModeSwitcher";
import { StudentLessonCatalog } from "@/components/cloud/studentMode/StudentLessonCatalog";
import { ProfessionalLessonCatalog } from "@/components/cloud/professionalMode/ProfessionalLessonCatalog";
import { ModePlaceholder } from "@/components/cloud/ModePlaceholder";
import { BookOpen, Mic, ClipboardCheck, Route } from "lucide-react";
import { AUTH_REQUIRED } from "@/lib/authGate";
import {
  roleFromPlacement,
  catalogModeForRole,
  CLOUD_ROLE_LABELS,
  type CloudRole,
} from "@/data/cloud/cloudRole";
import {
  applyRoleUnlocks,
  fetchCloudPlacement,
  getCachedCloudRole,
  hydrateCloudProgressFromDb,
  saveCloudPlacement,
} from "@/data/cloud/cloudProfile";

type CommunicationStep = "level" | "quiz" | "voice" | "dashboard";
type CloudStep = "loading" | "level" | "quiz" | "result" | "catalog";

/**
 * Cloud Learn → placement → role → Student or Professional catalog.
 * Communication domain keeps assessment → roadmap.
 */
const Learning = () => {
  const { user, loading } = useAuth();
  const { domain, setSection } = useDomain();
  const { triggerAva } = useAva();
  const navigate = useNavigate();
  const [mode, setMode] = useRebonMode();
  const [commStep, setCommStep] = useState<CommunicationStep>("level");
  const [cloudStep, setCloudStep] = useState<CloudStep>("loading");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [cloudRole, setCloudRole] = useState<CloudRole | null>(null);
  const [placementScore, setPlacementScore] = useState(0);
  const [placementMax, setPlacementMax] = useState(0);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [isGeneratingRoadmap] = useState(false);
  const firstVisitTriggered = useRef(false);

  useEffect(() => {
    setSection("learning");
  }, [setSection]);

  useEffect(() => {
    if (AUTH_REQUIRED && !loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkCommunicationAssessment = async () => {
      if (!user || domain !== "communication") return;

      const { data } = await supabase
        .from("profiles")
        .select("assessment_completed, communication_level")
        .eq("user_id", user.id)
        .single();

      if (data?.assessment_completed) {
        setAssessmentCompleted(true);
        setSelectedLevel(data.communication_level);
        setCommStep("dashboard");
      } else if (!firstVisitTriggered.current) {
        firstVisitTriggered.current = true;
        triggerAva("first_visit", { level: "Beginner", domain });
      }
    };
    checkCommunicationAssessment();
  }, [user, domain, triggerAva]);

  useEffect(() => {
    if (domain !== "fullstack") return;
    // Auth still resolving — keep spinner; don't abort into a dead "loading" forever.
    if (loading) return;

    let cancelled = false;

    const loadCloudPath = async () => {
      setCloudStep("loading");

      const finishFromCache = () => {
        const cached = getCachedCloudRole();
        if (cached) {
          applyRoleUnlocks(cached);
          setCloudRole(cached);
          setCloudStep("catalog");
        } else {
          setCloudStep("level");
        }
      };

      // Guest / auth-optional: no Supabase user — use local cache, never hang.
      if (!user) {
        if (!cancelled) finishFromCache();
        return;
      }

      try {
        const timeout = new Promise<never>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("cloud placement timeout")),
            8_000
          )
        );
        await Promise.race([
          (async () => {
            await hydrateCloudProgressFromDb(user.id);
            const placement = await fetchCloudPlacement(user.id);
            if (cancelled) return;
            if (placement.assessmentCompleted && placement.role) {
              setCloudRole(placement.role);
              setCloudStep("catalog");
            } else {
              const cached = getCachedCloudRole();
              if (cached) {
                setCloudRole(cached);
                setCloudStep("catalog");
              } else {
                setCloudStep("level");
              }
            }
          })(),
          timeout,
        ]);
      } catch {
        if (!cancelled) finishFromCache();
      }
    };

    void loadCloudPath();
    return () => {
      cancelled = true;
    };
  }, [user, domain, loading]);

  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
    if (domain === "fullstack") {
      setCloudStep("quiz");
    } else {
      setCommStep("quiz");
    }
  };

  const handleCommQuizComplete = async (score: number, maxScore: number) => {
    if (user) {
      await supabase.from("quiz_results").insert({
        user_id: user.id,
        quiz_type: "initial",
        score,
        max_score: maxScore,
      });
    }
    setCommStep("voice");
  };

  const handleCloudQuizComplete = async (score: number, maxScore: number) => {
    const levelKey = selectedLevel || "moderate";
    const role = roleFromPlacement(score, maxScore, levelKey);
    const scorePct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Always unlock locally first so Continue never dead-ends on Supabase/auth.
    applyRoleUnlocks(role);
    setMode(catalogModeForRole(role));
    setPlacementScore(score);
    setPlacementMax(maxScore);
    setCloudRole(role);
    setCloudStep("result");

    if (!user) return;

    try {
      const persist = Promise.all([
        supabase.from("quiz_results").insert({
          user_id: user.id,
          quiz_type: "cloud_initial",
          score,
          max_score: maxScore,
        }),
        saveCloudPlacement(user.id, role, scorePct),
      ]);
      await Promise.race([
        persist,
        new Promise((_, reject) =>
          window.setTimeout(() => reject(new Error("persist timeout")), 6_000)
        ),
      ]);
    } catch {
      // Local unlock already applied — ignore remote persist failures.
    }
  };

  const handleVoiceComplete = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({
          assessment_completed: true,
          communication_level: selectedLevel,
        })
        .eq("user_id", user.id);
    }
    setAssessmentCompleted(true);
    setCommStep("dashboard");
    toast({
      title: "Assessment Complete!",
      description: "Your personalized learning roadmap is ready.",
    });
  };

  if ((AUTH_REQUIRED && loading) || isGeneratingRoadmap) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        {isGeneratingRoadmap && (
          <p className="text-muted-foreground animate-pulse">
            Internal AI is building your personalized roadmap...
          </p>
        )}
      </div>
    );
  }

  // Auth optional + still resolving: brief wait, then cloud path effect takes over.
  if (!AUTH_REQUIRED && loading && domain === "fullstack" && cloudStep === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-sky-400 border-t-transparent animate-spin mb-4" />
      </div>
    );
  }

  const communicationSteps = [
    { id: "level", label: "Select Level", icon: Route },
    { id: "quiz", label: "English Quiz", icon: ClipboardCheck },
    { id: "voice", label: "Voice Assessment", icon: Mic },
    { id: "dashboard", label: "Your Roadmap", icon: BookOpen },
  ];

  const currentStepIndex = communicationSteps.findIndex((s) => s.id === commStep);

  const renderCloudLearn = () => {
    if (cloudStep === "loading") {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        </div>
      );
    }

    if (cloudStep === "level") {
      return <CloudLevelSelection onSelect={handleLevelSelect} />;
    }

    if (cloudStep === "quiz" && selectedLevel) {
      return (
        <CloudInitialQuiz
          level={selectedLevel}
          onComplete={handleCloudQuizComplete}
        />
      );
    }

    if (cloudStep === "result" && cloudRole) {
      const pct =
        placementMax > 0
          ? Math.round((placementScore / placementMax) * 100)
          : 0;
      return (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg text-center pt-4"
        >
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-400 mb-4">
            Placement complete
          </p>
          <h2 className="font-display text-3xl font-semibold text-foreground mb-2">
            {CLOUD_ROLE_LABELS[cloudRole]}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            Score: {placementScore}/{placementMax} ({pct}%)
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            {cloudRole === "cloud_fresher"
              ? "You start in Student Mode — Day 1 Cloud Basics with Ren on the board."
              : "You skip Student Mode and start in Professional Mode — Ren teaches in the AWS console."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (cloudRole) {
                applyRoleUnlocks(cloudRole);
                setMode(catalogModeForRole(cloudRole));
              }
              setCloudStep("catalog");
            }}
            className="rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-black hover:bg-sky-400"
          >
            Start learning
          </button>
        </motion.div>
      );
    }

    if (mode === "student") return <StudentLessonCatalog cloudRole={cloudRole} />;
    if (mode === "professional")
      return <ProfessionalLessonCatalog cloudRole={cloudRole} />;
    return <ModePlaceholder mode="ai_professional" section="learn" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <DomainNavbar />

      <main className="mx-auto w-full max-w-4xl px-4 pt-28 pb-10 md:px-6">
        {renderCloudLearn()}
      </main>

      <RenMentorDrawer />
    </div>
  );
};

export default Learning;
