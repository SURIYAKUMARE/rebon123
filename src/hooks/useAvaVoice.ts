import { useState, useCallback, useEffect, useRef } from "react";
import { safeFetchJson } from "@/lib/safeFetch";
import { logger } from "@/lib/logger";
import {
  GEMINI_VOICE_TRIAL,
  HYBRID_LOCAL_TTS_ENABLED,
  isVoiceAssetUrl,
  mapTeachLanguageToTtsLang,
  playMentorVoiceRequest,
  type MentorVoiceLang,
} from "@/services/mentorVoice";
import { useSettings } from "@/contexts/SettingsContext";

const SARVAM_PROXY_ENDPOINT = "/api/sarvam-tts";

type SarvamTtsResponse = {
  audios?: string[];
};

function sanitizeForSarvam(text: string): string {
  return text
    .replace(/\bAVA\b/g, "Ren")
    .replace(/\bAva\b/g, "Ren")
    .replace(/\bava\b/g, "ren")
    .trim();
}

async function callSarvamTTS(rawText: string): Promise<string> {
  const text = sanitizeForSarvam(rawText);
  if (!text) throw new Error("Empty text after sanitization");

  const MAX_CHARS = 490;
  const chunks: string[] = [];

  if (text.length <= MAX_CHARS) {
    chunks.push(text);
  } else {
    const parts = text.split(/(?<=[.!?।])\s+|(?<=,)\s+/);
    let current = "";
    for (const part of parts) {
      if ((current + " " + part).trim().length > MAX_CHARS && current) {
        chunks.push(current.trim());
        current = part;
      } else {
        current = (current + " " + part).trim();
      }
    }
    if (current) chunks.push(current);
  }

  const base64Parts: string[] = [];
  for (const chunk of chunks) {
    const result = await safeFetchJson<SarvamTtsResponse>(SARVAM_PROXY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: [chunk],
        target_language_code: "ta-IN",
        speaker: "priya",
        model: "bulbul:v3",
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
      timeoutMs: 20_000,
      retryOnce: true,
    });

    if (result.ok === false) {
      throw new Error(result.error.message);
    }

    const audio = result.data?.audios?.[0];
    if (!audio) throw new Error("Sarvam returned no audio data");
    base64Parts.push(audio);
  }

  return `data:audio/wav;base64,${base64Parts[0]}`;
}

function romanizeTamilText(text: string): string {
  // Pass-through helper kept for Chrome fallback; lesson JSON is already romanized.
  return text;
}

export type SpeakOptions = {
  onStart?: (durationMs: number) => void;
  onEnd?: () => void;
  /** Path A — static lesson MP3/WAV URL (skips TTS generation). */
  voiceAssetUrl?: string | null;
  language?: MentorVoiceLang | "english" | "tamil" | "tanglish";
  /** Force browser speechSynthesis (offline / no engine). */
  preferChromeTts?: boolean;
  /** Prefer local FastAPI engine (default true for Professional Mode). */
  preferLocalEngine?: boolean;
  /** Paid Sarvam path (default off when local engine preferred). */
  preferSarvam?: boolean;
};

/**
 * useAvaVoice — Ren mentor voice.
 *
 * Hybrid routing:
 *   Path A — voiceAssetUrl / pre-rendered URL → play immediately
 *   Path B — POST local rebon-voice-engine /speak → play blob
 *   Fallback — Chrome TTS (then optional Sarvam if explicitly requested)
 */
export const useAvaVoice = () => {
  const { teachLanguage } = useSettings();
  const [activeVoice, setActiveVoice] = useState<SpeechSynthesisVoice | null>(
    null
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  /** True only while waiting on Path B (dynamic TTS). Instant false for Path A. */
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const speakSeqRef = useRef(0);

  useEffect(() => {
    const load = () => {
      if (!window.speechSynthesis) return;
      const all = window.speechSynthesis.getVoices();
      if (!all.length) return;
      const noMale = all.filter((v) => {
        const n = v.name.toLowerCase();
        return (
          !n.includes("ravi") &&
          !n.includes("david") &&
          !n.includes("mark") &&
          !n.includes("male") &&
          !n.includes("guy")
        );
      });
      const pool = noMale.length ? noMale : all;
      const best =
        pool.find((v) => v.lang.includes("en-IN") && v.name.includes("Neerja")) ||
        pool.find((v) => v.lang.includes("en-IN") && v.name.includes("Google")) ||
        pool.find((v) => v.lang.includes("en-IN")) ||
        pool.find((v) => v.lang.includes("en-GB") && v.name.includes("Google")) ||
        pool[0];
      setActiveVoice(best ?? null);
    };
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = null;
  }, []);

  const stopAll = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    revokeObjectUrl();
    setIsSpeaking(false);
    setIsVoiceLoading(false);
  }, [revokeObjectUrl]);

  const playAudioUrl = useCallback(
    (
      url: string,
      opts?: { onStart?: (durationMs: number) => void; onEnd?: () => void }
    ) => {
      const audio = new Audio(url);
      activeAudioRef.current = audio;

      const kickOff = () => {
        const durationMs =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? Math.round(audio.duration * 1000)
            : 0;
        opts?.onStart?.(durationMs);
        audio.play().catch((err) => {
          logger.warn("useAvaVoice", "Audio.play() blocked (autoplay policy)", err);
          setIsSpeaking(false);
          setIsVoiceLoading(false);
          activeAudioRef.current = null;
          opts?.onEnd?.();
        });
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setIsVoiceLoading(false);
        activeAudioRef.current = null;
        if (!cancelledRef.current) opts?.onEnd?.();
      };
      audio.onerror = (e) => {
        logger.error("useAvaVoice", "Audio playback error", e);
        setIsSpeaking(false);
        setIsVoiceLoading(false);
        activeAudioRef.current = null;
        if (!cancelledRef.current) opts?.onEnd?.();
      };

      if (audio.readyState >= 1) kickOff();
      else audio.onloadedmetadata = () => kickOff();
    },
    []
  );

  const chromeTTSFallback = useCallback(
    (
      text: string,
      opts?: { onStart?: (durationMs: number) => void; onEnd?: () => void }
    ) => {
      if (!window.speechSynthesis) {
        opts?.onEnd?.();
        return;
      }
      const clean = sanitizeForSarvam(text);
      const romanized = romanizeTamilText(clean);
      const u = new SpeechSynthesisUtterance(romanized);
      if (activeVoice) u.voice = activeVoice;
      u.rate = 0.92;
      u.pitch = 1.0;
      const estMs = Math.min(
        120_000,
        Math.max(4_000, romanized.length * 75 + 2_000)
      );
      let started = false;
      u.onstart = () => {
        started = true;
        setIsVoiceLoading(false);
        if (!cancelledRef.current) opts?.onStart?.(estMs);
      };
      u.onend = () => {
        setIsSpeaking(false);
        setIsVoiceLoading(false);
        if (!cancelledRef.current) opts?.onEnd?.();
      };
      u.onerror = (ev) => {
        setIsSpeaking(false);
        setIsVoiceLoading(false);
        const err = (ev as SpeechSynthesisErrorEvent).error;
        if (err === "interrupted" || err === "canceled" || cancelledRef.current)
          return;
        if (!started) {
          window.setTimeout(() => {
            if (cancelledRef.current) return;
            window.speechSynthesis.speak(u);
          }, 120);
          return;
        }
        opts?.onEnd?.();
      };
      window.speechSynthesis.speak(u);
    },
    [activeVoice]
  );

  const resolveLang = useCallback(
    (opts: SpeakOptions): MentorVoiceLang => {
      const raw = opts.language || teachLanguage || "english";
      if (raw === "en" || raw === "ta" || raw === "tanglish") return raw;
      return mapTeachLanguageToTtsLang(String(raw));
    },
    [teachLanguage]
  );

  /**
   * Hybrid speak(text, voiceAssetUrl?):
   * Path A — asset URL → instant play
   * Path B — local TTS engine → brief loading then play
   */
  const speak = useCallback(
    (text: string, onEndOrOpts?: (() => void) | SpeakOptions) => {
      const opts: SpeakOptions =
        typeof onEndOrOpts === "function"
          ? { onEnd: onEndOrOpts }
          : onEndOrOpts || {};

      cancelledRef.current = false;
      const speakSeq = ++speakSeqRef.current;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      revokeObjectUrl();
      setIsSpeaking(true);

      const asset =
        opts.voiceAssetUrl ||
        (isVoiceAssetUrl(text) ? text : null);

      // Path A — pre-rendered. Skipped during the Gemini voice trial.
      if (!GEMINI_VOICE_TRIAL && asset && isVoiceAssetUrl(asset)) {
        setIsVoiceLoading(false);
        logger.info("useAvaVoice", "Path A — pre-rendered voice asset");
        playAudioUrl(asset, opts);
        return;
      }

      if (opts.preferChromeTts) {
        setIsVoiceLoading(false);
        chromeTTSFallback(text, opts);
        return;
      }

      const preferLocal = HYBRID_LOCAL_TTS_ENABLED;

      if (preferLocal) {
        setIsVoiceLoading(true);
        const lang = resolveLang(opts);
        void playMentorVoiceRequest({
          text,
          language: lang,
          voiceAssetUrl: null,
          signal: abortRef.current.signal,
        })
          .then(({ objectUrl }) => {
            if (cancelledRef.current || speakSeq !== speakSeqRef.current) {
              if (objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
              return;
            }
            objectUrlRef.current = objectUrl;
            setIsVoiceLoading(false);
            playAudioUrl(objectUrl, opts);
          })
          .catch((err) => {
            if (cancelledRef.current || speakSeq !== speakSeqRef.current) return;
            const message = err instanceof Error ? err.message : String(err);
            logger.warn(
              "useAvaVoice",
              "Local TTS unavailable — Chrome fallback",
              message
            );
            setIsVoiceLoading(false);
            chromeTTSFallback(text, opts);
          });
        return;
      }

      if (opts.preferSarvam) {
        setIsVoiceLoading(true);
        callSarvamTTS(text)
          .then((dataUrl) => {
            if (cancelledRef.current) return;
            setIsVoiceLoading(false);
            playAudioUrl(dataUrl, opts);
          })
          .catch((err) => {
            if (cancelledRef.current) return;
            logger.error("useAvaVoice", "Sarvam failed — Chrome fallback", err);
            setIsVoiceLoading(false);
            chromeTTSFallback(text, opts);
          });
        return;
      }

      setIsVoiceLoading(false);
      chromeTTSFallback(text, opts);
    },
    [playAudioUrl, chromeTTSFallback, resolveLang, revokeObjectUrl]
  );

  /** Explicit mentor API used by Professional Mode / hire briefing. */
  const playMentorVoice = useCallback(
    (
      text: string,
      language?: MentorVoiceLang | "english" | "tanglish",
      voiceAssetUrl?: string | null,
      opts?: Omit<SpeakOptions, "language" | "voiceAssetUrl">
    ) => {
      speak(text, {
        ...opts,
        language,
        voiceAssetUrl,
        preferLocalEngine: true,
      });
    },
    [speak]
  );

  const stop = useCallback(() => {
    stopAll();
  }, [stopAll]);

  return {
    speak,
    playMentorVoice,
    stop,
    activeVoice,
    isSpeaking,
    /** Path B only — show a brief spinner while local TTS generates. */
    isVoiceLoading,
    voices: [] as SpeechSynthesisVoice[],
  };
};
