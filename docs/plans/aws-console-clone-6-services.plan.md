# Plan: AWS Console Clone Fidelity — 6 Services (Professional Mode)

> ECC plan + architect. Next: TDD workflow. Lesson content is OUT OF SCOPE.

## Thesis

**Familiarity is the product.** A student who practices only in Rebon must walk into a company AWS Console already knowing *where* every control lives, *how* each flow works, and *how long* operations take — so nothing feels new. That muscle memory (layout, labels, side-nav hierarchy, settings, empty states, Work-mode timing) is worth more than any cert checklist.

Professional Mode uses a high-fidelity AWS Console **illusion** (no real AWS backends). Ren teaches + students practice only inside this clone. Launch surface: **IAM · VPC · EC2 · S3 · CloudWatch · Billing/CE**.

Learn and Work share the **same AppLayout chrome** (side nav, breadcrumbs, footer). Learn only compresses long `SIM_MS` waits for Ren demos — it never strips console UI.

## Current state (audit)

| Service | Core flows | Gaps |
|---------|------------|------|
| IAM | Users/groups/roles/policies + wizards | IdP stub; trust options “coming soon” |
| VPC | VPC+more provision, subnets, SG, IGW, RT | NAT + 7 side-nav stubs |
| EC2 | Instances, launch, SG, ASG, LB | Key pairs + 8 stubs |
| S3 | Buckets, create, objects/BPA/policy | Account BPA + 5 stubs |
| CloudWatch | Alarms, dashboards, logs, Insights UI | Metrics browser; Insights hardcoded |
| Billing | Dashboard, CE, Budgets | Bills page + payment stubs |

Shared: `AwsConsole`, `AwsTopNav`, `store.ts`, `SIM_MS` / `simulateOperation`, ACTION_MAP whitelist ≫ executor dispatch. **No unit tests** under `awsConsole/` yet. `shellContract.environmentIds` only lists IAM.

## Phases

### P0 — Illusion backbone (NOW)
1. Wire all 6 `environmentIds` in `shellContract.ts`
2. Shared AWS-style stub empty panel (never crash; real empty copy)
3. Unit tests: `scaledMs`, `awsId`, `simulateOperation` abort, account ID helpers
4. Expand `executeAction` NAV dispatch for all 6 service junior entry points

### P1 — Junior blockers ✅
- EC2 key pairs · VPC NAT · S3 account BPA · Billing Bills · CW metrics pick + seed Insights
- ACTION_MAP codes + store mutations + TDD per flow
- Smoke: `npx tsx scripts/smoke-console-p1.ts`

### P2 — Chrome polish ✅
- Services menu / search / region / account fidelity; home widgets; CloudShell across 6
- Billing search aliases · S3 regional · ACTION_MAP chrome dispatch · CW/Billing shell cmds
- Smoke: `npx tsx scripts/smoke-console-p2.ts`

### F0–F2 — Real-AWS familiarity ✅
- Learn ≡ Work AppLayout (side nav + breadcrumbs always)
- Empty states: real AWS tone (no “lab/simulated”)
- Side nav: no Create-* leaves; VPC Endpoints/Peering/VPN; Logs Insights; EventBridge out of CW
- Account menu → Organizations / Security credentials / Sign out; Health ≠ CloudWatch
- IAM: access keys only via My security credentials (+ one-time .csv modal)
- Settings: density + Default Region applies next sign-in
- Work timing: NAT ~90s, status checks ~90s, stop ~30s (Learn still scaled)
- Smoke: `npx tsx scripts/smoke-console-fidelity.ts`

### P3 — Depth ✅
- Full Services mega-menu catalog (~52 services, 13 categories) + landing pages
- Network ACLs list + read-only detail (default rule 100 / * deny)
- IAM Identity providers (add SAML/OIDC)
- Target groups list/detail + LB↔TG seed link
- Cost allocation tags + Cost Explorer Tag/Region filters
- Smoke: `npx tsx scripts/smoke-console-p3.ts`

### P3+ (optional next)
- ~~Create role: enable all 5 trusted-entity tiles~~ ✅
- Full Create ALB / Create target group multi-step wizards
- Launch instance / Create VPC field-complete polish
- NACL edit rules (today read-only)

## Non-goals
- Lesson / viva / Gemini content
- Real AWS APIs
- Full AWS surface (Lambda, RDS, Orgs, …)
- AI Companion Mode

## Definition of Done (6-service launch)
- Student finds Users / Instances / Buckets / VPCs / Alarms / Cost Explorer without leaving clone
- Creates show AWS-like wait (`SIM_MS`); long ops visible in Work mode
- Stubs never crash; AWS-style empty panels
- ACTION_MAP drives junior happy paths for all 6
- Unit tests cover timing/IDs/mutations; smoke actionmap green

## TDD order (P0)
1. RED: shellContract 6 env IDs + simulateOperation/awsId/scaledMs tests
2. GREEN: implement contract + stub panel helper
3. RED→GREEN: executeAction NAV for 6-service entry pages
4. Smoke: `npm run smoke:actionmap` + `smoke:tsc`
