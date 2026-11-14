import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAvaVoice } from "@/hooks/useAvaVoice";
import { FINOVA_HIRE } from "@/data/cloud/roleTrack";

const HIRE_SEEN_KEY = "rebon_csa_l1_hire_letter_next";

type Phase = "card" | "brief" | "sign" | "fly";

type Box = { top: number; left: number; width: number; height: number };

type SpokenWord = { sentence: number; text: string; weight: number };

type Props = {
  onContinue: () => void;
};

function markCeremony(active: boolean) {
  if (active) document.documentElement.dataset.hireCeremony = "1";
  else delete document.documentElement.dataset.hireCeremony;
  window.dispatchEvent(new Event("rebon-hire-ceremony"));
}

function profileTarget(): Box {
  const el = document.getElementById("rebon-profile-anchor");
  const rect = el?.getBoundingClientRect();
  if (rect && rect.width > 0) {
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  }
  return { top: 16, left: window.innerWidth - 72, width: 40, height: 40 };
}

function letterHome(): Box {
  const width = Math.min(520, Math.max(300, window.innerWidth * 0.38));
  const height = Math.min(760, Math.max(420, window.innerHeight * 0.78));
  const left = window.innerWidth * 0.34 - width / 2;
  const top = (window.innerHeight - height) / 2;
  return { top, left: Math.max(24, left), width, height };
}

function spokenWords(speech: string): SpokenWord[] {
  const sentences = speech
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const words: SpokenWord[] = [];
  sentences.forEach((sentence, sentenceIndex) => {
    sentence.split(/\s+/).forEach((text) => {
      const weight = Math.max(1, text.replace(/[^a-z0-9]/gi, "").length);
      words.push({ sentence: sentenceIndex, text, weight });
    });
  });
  return words;
}

/**
 * Hire offer. The card opens into a letter in the center.
 * Ren stands on the right, mouth open only while audio plays.
 * The letter lights each word as she reads it, then the user signs.
 */
export function CsaHireOnboarding({ onContinue }: Props) {
  const { stop, isSpeaking, isVoiceLoading, playMentorVoice } = useAvaVoice();
  const [phase, setPhase] = useState<Phase>("card");
  const [home, setHome] = useState<Box>(() =>
    typeof window === "undefined"
      ? { top: 80, left: 80, width: 480, height: 640 }
      : letterHome()
  );
  const [target, setTarget] = useState<Box | null>(null);
  const [activeWord, setActiveWord] = useState(-1);
  const words = useMemo(() => spokenWords(FINOVA_HIRE.welcomeSpeech), []);
  const startedSpeech = useRef(false);
  const sentenceRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const signRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const mouthOpen = phase === "brief" && isSpeaking && !isVoiceLoading;
  const activeSentence = activeWord >= 0 ? words[activeWord]?.sentence ?? -1 : -1;

  useLayoutEffect(() => {
    markCeremony(true);
    return () => markCeremony(false);
  }, []);

  useEffect(() => {
    const onResize = () => setHome(letterHome());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (phase !== "brief" || startedSpeech.current) return;
    startedSpeech.current = true;
    let advanced = false;
    let frame = 0;
    const weights = words.reduce((sum, word) => sum + word.weight, 0);
    const advance = () => {
      if (advanced) return;
      advanced = true;
      window.cancelAnimationFrame(frame);
      stop();
      setActiveWord(words.length - 1);
      window.setTimeout(() => setPhase("sign"), 500);
    };
    playMentorVoice(FINOVA_HIRE.welcomeSpeech, "en", null, {
      onStart: (durationMs) => {
        const ms = durationMs > 800 ? durationMs : weights * 78;
        const startedAt = performance.now();
        let shown = -1;
        const tick = () => {
          if (advanced) return;
          const progress = Math.min(1, (performance.now() - startedAt) / ms);
          let cursor = 0;
          let index = words.length - 1;
          const mark = progress * weights;
          for (let i = 0; i < words.length; i += 1) {
            cursor += words[i].weight;
            if (cursor >= mark) {
              index = i;
              break;
            }
          }
          if (index !== shown) {
            shown = index;
            setActiveWord(index);
          }
          if (progress < 1) frame = window.requestAnimationFrame(tick);
        };
        frame = window.requestAnimationFrame(tick);
      },
      onEnd: advance,
    });
    const fallback = window.setTimeout(advance, 75000);
    return () => {
      window.clearTimeout(fallback);
      window.cancelAnimationFrame(frame);
    };
  }, [phase, playMentorVoice, stop, words]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const node = sentenceRefs.current[activeSentence];
    if (!node || !scrollerRef.current) return;
    const scroller = scrollerRef.current;
    const top = node.offsetTop - scroller.clientHeight / 2 + node.clientHeight / 2;
    scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [activeSentence]);

  useEffect(() => {
    if (phase !== "sign" || !signRef.current || !scrollerRef.current) return;
    const scroller = scrollerRef.current;
    const node = signRef.current;
    scroller.scrollTo({
      top: node.offsetTop,
      behavior: "smooth",
    });
  }, [phase]);

  const finish = () => {
    stop();
    markCsaHireSeen();
    onContinue();
  };

  const beginFly = () => {
    setTarget(profileTarget());
    setPhase("fly");
  };

  const sheet =
    phase === "fly" && target
      ? { ...target, borderRadius: 999 }
      : { ...home, borderRadius: 18 };

  let wordCursor = 0;

  return (
    <div
      className={`fixed inset-0 z-[80] overflow-hidden ${
        phase === "fly" ? "pointer-events-none bg-transparent" : "bg-[#07080c]"
      }`}
    >
      <img
        src="/ren-lobby-closed.png"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover object-[72%_center] transition-opacity duration-500 ${
          mouthOpen || phase === "fly" ? "opacity-0" : "opacity-100"
        }`}
      />
      <img
        src="/ren-lobby-open.png"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover object-[72%_center] transition-opacity duration-200 ${
          mouthOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <AnimatePresence>
        {phase === "card" && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            onClick={() => setPhase("brief")}
            style={{ top: home.top, left: home.left, width: home.width }}
            className="absolute rounded-sm border border-amber-200/30 bg-[#12151c]/92 px-8 py-9 text-left shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
          >
            <p className="text-[11px] uppercase tracking-[0.32em] text-amber-200/80">
              Finova Technologies
            </p>
            <div className="my-5 h-px w-12 bg-amber-200/50" />
            <p className="text-3xl font-semibold tracking-tight text-white">Offer</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{FINOVA_HIRE.role}</p>
            <p className="mt-8 text-[11px] uppercase tracking-[0.22em] text-sky-200/80">
              Open
            </p>
          </motion.button>
        )}
      </AnimatePresence>

      {phase !== "card" && (
        <motion.div
          className="absolute flex flex-col overflow-hidden border border-amber-200/25 bg-[#10141c]/90 text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
          initial={false}
          animate={sheet}
          transition={{ duration: phase === "fly" ? 0.9 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => {
            if (phase === "fly") finish();
          }}
        >
          {phase === "fly" ? (
            <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-amber-100">
              F
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-white/10 px-7 py-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-amber-200/80">
                    Finova Technologies
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {FINOVA_HIRE.role}
                  </h1>
                </div>
                {phase === "brief" && (
                  <button
                    type="button"
                    onClick={() => {
                      stop();
                      setPhase("sign");
                    }}
                    className="text-xs font-medium text-amber-200/80 hover:text-amber-100 underline underline-offset-4 transition"
                  >
                    Skip to sign &rarr;
                  </button>
                )}
              </div>
              <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                {FINOVA_HIRE.welcomeSpeech
                  .split(/(?<=[.!?])\s+/)
                  .map((sentence) => sentence.trim())
                  .filter(Boolean)
                  .map((sentence, sentenceIndex) => {
                    const parts = sentence.split(/\s+/);
                    const sentenceStart = wordCursor;
                    wordCursor += parts.length;
                    const state =
                      activeSentence < 0
                        ? "waiting"
                        : sentenceIndex < activeSentence
                          ? "read"
                          : sentenceIndex === activeSentence
                            ? "current"
                            : "ahead";
                    return (
                      <p
                        key={sentence}
                        ref={(node) => {
                          sentenceRefs.current[sentenceIndex] = node;
                        }}
                        className={`mb-4 text-[15px] leading-7 transition-colors duration-300 ${
                          state === "current"
                            ? "text-white"
                            : state === "read"
                              ? "text-slate-400"
                              : "text-slate-600"
                        }`}
                      >
                        {parts.map((part, partIndex) => {
                          const index = sentenceStart + partIndex;
                          const lit = index === activeWord;
                          return (
                            <span
                              key={`${sentenceIndex}-${partIndex}`}
                              className={
                                lit
                                  ? "rounded-sm bg-amber-200/20 text-amber-50"
                                  : undefined
                              }
                            >
                              {part}
                              {partIndex < parts.length - 1 ? " " : ""}
                            </span>
                          );
                        })}
                      </p>
                    );
                  })}
                <div ref={signRef} className="pt-2">
                  {phase === "sign" ? <OfferSignature onSigned={beginFly} /> : null}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

function OfferSignature({ onSigned }: { onSigned: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const distance = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 2, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const drawAutoSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.beginPath();
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const sx = Math.max(20, rect.width * 0.15);
    const sy = rect.height * 0.65;
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + 30, sy - 35, sx + 50, sy + 15, sx + 85, sy - 20);
    ctx.bezierCurveTo(sx + 120, sy - 40, sx + 140, sy + 10, sx + 175, sy - 5);
    ctx.bezierCurveTo(sx + 200, sy - 25, sx + 230, sy + 10, sx + 260, sy - 15);
    ctx.stroke();
    setSigned(true);
  };

  const handleNextClick = () => {
    if (!signed) {
      drawAutoSignature();
      setTimeout(onSigned, 200);
    } else {
      onSigned();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-200">Sign with your cursor, or click Next.</p>
        <button
          type="button"
          onClick={drawAutoSignature}
          className="text-xs text-amber-200/80 hover:text-amber-100 underline underline-offset-4 transition cursor-pointer"
        >
          {signed ? "Signed ✓" : "Click to auto-sign"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="mt-3 h-28 w-full touch-none border-b border-white/30 bg-white/[0.02] cursor-crosshair rounded-t"
        onPointerDown={(event) => {
          drawing.current = true;
          const p = point(event);
          last.current = p;
          const ctx = canvasRef.current?.getContext("2d");
          ctx?.beginPath();
          ctx?.moveTo(p.x, p.y);
          event.currentTarget.setPointerCapture(event.pointerId);
          setSigned(true);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext("2d");
          const p = point(event);
          const prev = last.current;
          if (!ctx || !prev) return;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          distance.current += Math.hypot(p.x - prev.x, p.y - prev.y);
          last.current = p;
          setSigned(true);
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
          setSigned(true);
        }}
        onPointerCancel={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleNextClick}
          className="rounded-sm bg-amber-200 px-6 py-2.5 text-sm font-semibold text-[#12151c] transition hover:bg-amber-100 shadow-md cursor-pointer active:scale-95"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

import { markCsaHireSeen, hasSeenCsaHire } from "./csaHireStorage";
export { hasSeenCsaHire };
