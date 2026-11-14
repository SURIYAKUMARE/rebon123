# Rebon MVP Learning Architecture

**Status:** Phase 0 **LOCKED** — ready for content authoring  
**Date:** 2026-09-26  
**Deciders:** Founder + Ren product architecture  
**Decisions file:** [PHASE0_FOUNDER_DECISIONS.md](./PHASE0_FOUNDER_DECISIONS.md)  
**Out of scope for this phase:** AI Companion Mode, full company Workspace ticket simulation (next after both learn modes)

---

## 1. Product intent

Today’s college/cloud education fails students: theory without judgment, labs without tickets, no mentor who has lived production. Rebon’s MVP teaching product is:

| Mode | Job to be done |
|------|----------------|
| **Student Mode** | Build *cloud literacy* before anyone touches a console — what cloud is, why companies pay for it, how services map to business outcomes. |
| **Professional Mode** | Train someone *as if they just joined Finova* in a real starting role, then promote role-by-role with console-first, ticket-shaped lessons. |

**Voice (final):** Gemini TTS for emotional English + Tanglish, pre-rendered Path A. Local/edge TTS was wiring only.

**After both modes’ learning content is complete:** Workspace = real-world company scenarios/tasks (separate phase).

---

## 2. Ren teaching style (the “level” you asked for)

Ren is not a chatbot tutor. Schema and content must encode this persona:

> A highly experienced cloud engineer who worked at top MNCs through senior/principal depth in the cloud domain. She left because the industry is short of skilled people and formal education does not create them. She teaches with energy, clarity, and production scars — so learners *understand deeply, remember long, and can act practically*.

### Style level: **Principal Mentor (L5 teaching bar)**

| Dimension | Required bar |
|-----------|----------------|
| **Authority** | Speaks from production desk reality (₹, latency, tickets, blame, least privilege) — never textbook-only. |
| **Energy** | Direct, warm, high signal; no dead lecture voice. |
| **Depth** | Every concept gets a *mental model* + *why it exists* + *what breaks if you ignore it*. |
| **Retention** | Forced recall checks; one sticky habit per lesson. |
| **Practical** | “What you do Monday morning” beats definition dumps. |
| **Empathy** | Assumes the learner was failed by the system — teaches as the mentor she wished she had. |

Encoded in: `src/data/cloud/ren.v1.json` + `validatePedagogyBundle()` in `learningArchitecture.ts`.

### Every lesson MUST encode these pedagogical blocks

```
1. WHY_BEFORE_HOW     — business / human problem first
2. MENTAL_MODEL       — one durable picture (board-worthy)
3. COMPANY_STORY      — Indian/Finova-shaped example with concrete stakes
4. MISTAKE_OR_TRAP    — what juniors get wrong in week 1
5. CHECK              — learner says it back (mic / short answer)
6. PRACTICAL_HABIT    — one action they will repeat forever
```

These are first-class fields (or segment types), not optional prose. Missing beats → publish/voice-render blocked (Student v1 / Pro v3 = error; legacy Pro v2 = warn).

---

## 3. Mode map & gates

```
[Onboarding]
    │
    ├─► Student Mode (10 fundamentals lessons)
    │       gate G1: readiness ≥70% after Lesson 10
    │
    └─► Professional Mode (role ladder R1–R3)
            requires: Student complete OR placement skip / R1 test-out (G4)
            start role: Cloud Support Associate L1
            promote → next role when G3 passes (≥75% promotion review)
```

| Gate | Rule (locked) |
|------|----------------|
| G0 | Placement picks default mode; Student always open |
| G1 | Student 10 lessons + Readiness ≥70% → Finova hire → Professional |
| G2 | Within-role lesson unlock by `role_order` |
| G3 | Role complete + Promotion Review ≥75% → next role |
| G4 | Strong placement (`cloud_engineer`) may test-out of R1 |

Progress storage MVP: **local-only**.

---

## 4. Student Mode — curriculum design (10 lessons)

**Principle:** Zero AWS console. Board + Ren voice. Short track so learners stay engaged.

**Canonical:** `src/data/cloud/student_mode/_sm_track.json` + `day1…day10_*`

| Lesson | Title |
|--------|-------|
| SM-D1 | Meet Ren — What Cloud Really Is |
| SM-D2 | Why Companies Pay for Cloud |
| SM-D3 | How Cloud Helps — Elasticity & Regions |
| SM-D4 | Shared Responsibility |
| SM-D5 | Service Families Map |
| SM-D6 | Identity & Compute |
| SM-D7 | Storage & Network |
| SM-D8 | Observe — Monitoring |
| SM-D9 | Finova Company Lens |
| SM-D10 | Capstone → Readiness unlocks Pro |

~2.5 hours per language.

---

## 5. Professional Mode — role ladder + 6 services

**Principle:** Role is the curriculum spine. At any moment the learner sees **only the active role’s lessons and services** — not all six services at once. Six services is the MVP *ladder ceiling* across promotions.

| Active role | Services taught now | Sessions |
|-------------|---------------------|----------|
| CSA L1 (entry) | Console · IAM · CloudWatch | PM-0, PM-1, PM-5 |
| Ops (after promote) | EC2 · S3 (day-2) | PM-3, PM-4 (Ops-tagged) |
| Cloud Engineer | VPC · EC2 build · S3 lifecycle | PM-2 + CE-tagged PM-3/4 |

Promote when the role’s lessons are done → next role’s catalog replaces the previous.

---

## 6. Shared voice contract (Gemini Path A)

```
public/audio/lessons/{LESSON_ID}/{language}/
  manifest.json     // v1 hash→url | v2 line_id+voice_profile
  *.mp3             // Gemini-rendered final
```

- Teaching lines = Path A (instant).
- Live doubts = Path B / live API (not pre-recorded).
- Student + Professional share the same prerender pipeline.

Types: `VoiceManifestV1` / `VoiceManifestV2` in `learningArchitecture.ts`.

---

## 7. Phased build order (authoring next)

1. ~~Freeze schemas + Phase 0~~ **DONE**
2. **Author Student Mode** SM-0…SM-6 (EN + Tanglish) against `StudentLessonV1`
3. **Polish Professional R1** (PM-0, PM-1, PM-5) to L5 beats
4. **Author Professional R2** (EC2 + S3 triage) + **R3** (VPC + build)
5. **Gemini prerender** Path A for shipped lessons
6. **Workspace phase** (after learning content done)

---

## 8. Architect follow-ups (accepted + implemented)

1. Shared core + mode envelopes — types in `learningArchitecture.ts`
2. Publish validator — `validatePedagogyBundle` / `validateStudentLessonV1`
3. `_roles.json` — R1–R3 live, entry_speech, must_know, promotion ≥75%
4. Voice manifest v1 + v2 types
5. Migration: PM IDs stay `PM-x.y`; Student rebuilds as SM track; Day N frozen as seed

---

## 9. Planner follow-ups (accepted + Phase 0 closed)

| Conflict | Resolution |
|----------|------------|
| Three Student curricula | Canonical = **SM track only**; no console in Student |
| Day 1 showed console | Console teaching → Professional PM-0 only |
| Open founder questions | All five **locked** in PHASE0_FOUNDER_DECISIONS.md |

---

## 10. Non-goals (explicit)

- AI Companion Mode (`ai_professional` hidden)
- Full multi-ticket company Workspace simulation (next phase)
- Teaching every AWS service / R4–R5 full content / PM-6 as launch blockers
- Runtime live Gemini for every line (Path A pre-render only)
- Rewriting the console simulator wholesale

---

## 11. How this answers “schemas + teaching style level”

| Ask | Design answer |
|-----|----------------|
| Student vs Pro | Separate modes, separate schemas; Student never requires console. |
| Role matter | `_roles.json` ladder + `role_tracks` on every Pro lesson. |
| Six services | Console + IAM + CloudWatch + EC2 + S3 + **VPC**. |
| Teaching style level | **Principal Mentor L5** — mandatory six pedagogy blocks. |
| Ren character | `ren.v1.json` persona_story + style_level_rubric + validator. |
| Enforcement | Validator blocks incomplete lessons from voice render / publish. |
| Depth | **10** SM lessons (~2.5h) + R1–R3 Pro live. |

---

## 12. Artifact map

| Artifact | Path |
|----------|------|
| Architecture (this doc) | `docs/learning/MVP_LEARNING_ARCHITECTURE.md` |
| Phase 0 lock | `docs/learning/PHASE0_FOUNDER_DECISIONS.md` |
| TypeScript schemas + validator | `src/types/learningArchitecture.ts` |
| Ren L5 persona | `src/data/cloud/ren.v1.json` |
| Student track outline | `src/data/cloud/student_mode/_sm_track.json` |
| Pro role ladder | `src/data/cloud/professional_mode/_roles.json` |
| Pro curriculum (existing) | `src/data/cloud/professional_mode/_curriculum.json` |
