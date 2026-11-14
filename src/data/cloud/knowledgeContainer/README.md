# Three-Tier Knowledge Container & Data Flywheel

## Model

| Tier | Purpose |
|------|---------|
| **PRIMARY** | Authored lesson trees — topics, steps, vivas, BOARD/CONSOLE orchestration, ACTION_MAP |
| **SECONDARY** | Staging for Gemini answers to unscripted doubts (`pending_review`) |
| **THIRD** | Verified Q&A store — human-approved doubts live here permanently |

```
Student ask
  → Primary author cache?  → serve (source: primary)
  → Third verified Q&A?    → serve (source: third)
  → miss → Gemini
           → Secondary (pending_review)
Admin Approve → Third upsert; Secondary = approved
Admin Reject  → Secondary = rejected (no Third write)
```

## Constraints

- Each lesson **part** ≤ **25 minutes** (`LESSON_PART_MAX_MINUTES`).
- Board text stays English; speech follows student language preference.
- Console actions must be ACTION_MAP whitelist codes.
- Student doubt promotions **never** write into Primary lesson trees.

## CSA Level 1 — Cloud Support Associate (learning)

Career track id: `l1_cloud_support_associate` (on `_curriculum.json` via `role_tracks`).
Framing: hired at **Finova Technologies** as **Cloud Support Associate (L1)**. Ren mentors as a senior. Workspace tickets are out of scope here.

| Order | Lesson | Focus |
|------:|--------|--------|
| 1 | PM-0.1 | Console orientation (Day 1) |
| 2 | PM-1.1 | Users, groups, access resets |
| 3 | PM-1.3 | Reading IAM policies |
| 4 | PM-1.4 | Debugging Access Denied |
| 5 | PM-1.2 | Roles — trust vs permissions (read) |
| 6 | PM-1.5 | CloudTrail fields (board-only) |
| 7 | PM-5.1 | Dashboards and metrics |
| 8 | PM-5.2 | Alarms |
| 9 | PM-5.3 | Log groups + Insights correlation |

### Authoring checklist

1. Write v2 `ProfessionalLessonFile` under `professional_mode/lessons/PM-x.y_{english,tanglish}.json` (no `status: stub`).
2. Register import in `professional_mode/index.ts` (CSA set is already listed).
3. Tag curriculum: `role_tracks: ["l1_cloud_support_associate"]`, `available: true` when English hydrates clean.
4. Hydrator (`hydrateSteps.ts` → `primaryStore.ts`) emits `board_teach` / `console_*` / `viva` / `doubt_gate`; store key is `LESSON_ID:language`.
5. Board text identical across languages; speech may differ.
6. Seed common doubts in `seedCsaL1Cache.ts`.
7. Validate: `npx tsx scripts/validate-primary.ts`

## Key files

| Layer | Path |
|-------|------|
| Schemas | `src/types/knowledgeContainer.ts` |
| Primary | `src/data/cloud/knowledgeContainer/primaryStore.ts` |
| Hydrate | `src/data/cloud/knowledgeContainer/hydrateSteps.ts` |
| CSA seed | `src/data/cloud/knowledgeContainer/seedCsaL1Cache.ts` |
| Secondary | `src/data/cloud/knowledgeContainer/secondaryStore.ts` |
| Third | `src/data/cloud/knowledgeContainer/thirdStore.ts` |
| Promote | `src/data/cloud/knowledgeContainer/promote.ts` |
| Lessons | `src/data/cloud/professional_mode/lessons/` |
| Curriculum | `src/data/cloud/professional_mode/_curriculum.json` |
| Server | `server/knowledgeOrchestrator.ts` |
| API | `POST /api/knowledge`, `POST /api/knowledge-promote` |
| Event bus | `src/services/renEventBus.ts` |
| Review UI | `KnowledgeStagingReviewPanel.tsx` |
| DB | `secondary_container_staging`, `third_container_qa` migrations |

## Next phase

- Workspace tickets / situated Jira-style tasks for CSA L1
- Higher role tracks (VPC/EC2/S3/Cost)
- Elevating selected Third Q&A into Primary execution steps (authoring tool)

## Smoke

```bash
npx tsx scripts/smoke-knowledge-containers.ts
npx tsx scripts/validate-primary.ts
```
