/**
 * Temporary voice feature switches for testing.
 * Flip these when you want recording / hybrid TTS back.
 */

/** Ren teaching voice — Path A assets + Path B local FastAPI TTS. */
export const HYBRID_LOCAL_TTS_ENABLED = true;

/**
 * Off: Gemini TTS hit quota and delayed every line.
 * Saved clips and the local voice play instead.
 */
export const GEMINI_VOICE_TRIAL = false;

/**
 * Student mic "record → save session" flows (VoiceAssessment, Scenario,
 * TaskAssessment, AssessmentQuiz voice answers). Off while we burn tests
 * so we don't flood voice_sessions / stored audio.
 * Lesson viva listening (useSpeechRecognition) is separate and stays on.
 */
export const STUDENT_AUDIO_RECORDING_ENABLED = false;
