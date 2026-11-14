# Workspace Architecture — Student + Professional (mailbox desk)

**Status:** Accepted design (2026-09-26)  
**Agents:** [Plan workspace SM+Pro](1745db05-836a-493c-9a0e-2bfd402c597e) · [Architect mailbox schemas](3b863d6a-de2d-44e0-bb42-74f4d85e11c0)  
**Product feel:** Short lessons teach; workspace makes users feel like Finova employees (role by role).

---

## Locked decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Student Work unlock | Opens with Student Mode (practice freely); Learn still sequential |
| 2 | Student pass bar | Attempt all items; day complete when score ≥ **6/8** (retry missed) |
| 3 | Student mix per lesson | **4 MCQ + 2 True/False + 2 Short answer** (no console) |
| 4 | Pro Work model | **Finova mailbox desk** — mail → work → reply |
| 5 | Pro MVP scope | **CSA L1 only** (Console / IAM / CloudWatch); Ops/CE desks later |
| 6 | Reply grading | Local keyword-group rubric (no LLM); ignore global “accept any” for Pro replies |

---

## Student Mode Work

- Strengthen fundamentals only.
- Formats: multiple choice, true/false, short answer (keyword graded).
- 8 items × 10 lessons ≈ 80 items.
- UI: existing `StudentWorkCatalog` + panel item renderers.

## Professional Mode Work (entry role)

```
Inbox mail (problem lives ONLY here)
    → Start work (console steps / checklist)
    → Done → Reply to email (what I did)
    → Graded → Closed → next mail arrives
```

| Tier | Feel | After |
|------|------|--------|
| 1 | Normal desk / console hygiene | PM-0.1 |
| 2 | Simple tickets | PM-1.x / PM-5.1 |
| 3 | Harder L1 judgment | PM-1.4+ / PM-5.2+ |

Every task has: `mail` + `work` + `reply` rubric.

## Schemas (code)

- `src/types/studentMode.ts` — extended workspace item types  
- `src/types/proMailbox.ts` — mailbox ticket + lifecycle  
- `src/lib/keywordGrader.ts` — shared short-answer / reply grading  
- `src/data/cloud/professional_mode/mailbox/` — L1 desk tickets  

## Build order

1. Shared grader + types ← now  
2. Student 80 items + panel ← now  
3. Finova Desk UI + Tier-1 mails (checklist / light console) ← now  
4. Full console action capture for Tier 2–3 ← next  
5. Ops / CE desks ← later  

## Non-goals

- Companion mode  
- Full 77 stub bank conversion  
- Paying salary 😄 — only the *feeling* of company work  
