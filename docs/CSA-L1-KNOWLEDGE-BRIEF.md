# Knowledge Container + CSA L1 — brief for Gemini / team

## What Primary is

Primary is **not** a separate JSON dump folder. Authored lessons live as v2 `ProfessionalLessonFile` JSON. At runtime they **hydrate** into an in-memory `PrimaryKnowledgeRecord` (steps: board_teach, console_demo/practice, viva, doubt_gate).

```
lessons/PM-x.y_{english|tanglish}.json
  → normalizeLesson.ts
  → primaryStore.hydratePrimaryFromProfessionalLesson()
  → PrimaryKnowledgeRecord (keyed LESSON_ID:language)
```

Player (`ProfessionalConsoleLesson`) reads the lesson JSON directly (board + TeachableAwsConsole). Primary store powers alternate-path Q&A (local cache); Gemini API is **off** for this pass (`localOnly`).

## Schemas added / extended

| File | What |
|------|------|
| `src/types/knowledgeContainer.ts` | `RoleTrackId`, `role_tracks?` on metadata, `cursor?` on Primary steps |
| `src/types/professionalMode.ts` | `role_tracks?`, `role_order?` on curriculum lessons |
| `src/data/cloud/roleTrack.ts` | `l1_cloud_support_associate`, Finova hire copy |

## Knowledge container files

| File | Role |
|------|------|
| `knowledgeContainer/primaryStore.ts` | In-memory Primary; lang keys; hydrate |
| `knowledgeContainer/hydrateSteps.ts` | Lesson → Primary steps + cursor→NAV |
| `knowledgeContainer/seedCsaL1Cache.ts` | Authored doubt answers (Primary cache) |
| `knowledgeContainer/seedPrimaryDemo.ts` | PM-0.1 demo cache |
| `knowledgeContainer/secondaryStore.ts` | Staging (unused when localOnly) |
| `knowledgeContainer/thirdStore.ts` | Approved Q&A |
| `knowledgeContainer/promote.ts` | Staging → Third |
| `knowledgeContainer/README.md` | CSA L1 map |

## CSA L1 lesson data (entry role)

Track: `role_tracks: ["l1_cloud_support_associate"]` in `_curriculum.json`.

Lessons (Finova · Cloud Support Associate L1):  
PM-0.1, PM-1.1, PM-1.3, PM-1.4, PM-1.2, PM-1.5 (board CloudTrail), PM-5.1, PM-5.2, PM-5.3  
Path: `src/data/cloud/professional_mode/lessons/`

Each lesson has `company.your_role: "Cloud Support Associate (L1)"` and Finova framing.

## Learning UI wiring (this pass)

1. **Hire briefing** — `CsaHireOnboarding`: Ren face (`VoiceAvatar`) + Chrome TTS welcome  
2. **Catalog** — `ProfessionalLessonCatalog` filters to CSA L1 available lessons only  
3. **Click lesson** → `/lesson/PM-x.y` → `ProfessionalConsoleLesson` (board + AWS console)  
4. **Voice** — Chrome `speechSynthesis` only (`preferChromeTts`)  
5. **Doubts** — Primary/Third local cache only; no `/api/knowledge` Gemini call  

Unlock: place as Cloud Junior/Engineer, or finish Student Mode readiness.

## Out of scope still

Workspace tickets / Jira simulation, higher roles (VPC/EC2/S3/Cost), Sarvam TTS, Gemini doubts.
