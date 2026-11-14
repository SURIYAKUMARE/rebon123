/**
 * Generate 24 Finova L1 mailbox tickets (Console / IAM / CloudWatch lanes).
 * Run: node scripts/generate-l1-mailbox.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(
  __dirname,
  "../src/data/cloud/professional_mode/mailbox"
);
fs.mkdirSync(path.join(ROOT, "l1"), { recursive: true });

const ME = {
  name: "You",
  email: "cloud-support@finova.tech",
  title: "Cloud Support Associate (L1)",
};
const ACCOUNT = "847291635028";
const REGION = "ap-south-1";

function T(p) {
  return {
    schema_version: 1,
    role_id: "l1_cloud_support_associate",
    content_status: "ready",
    duration_minutes: p.duration_minutes ?? 8,
    ...p,
  };
}

function mail(from, subject, body, priority = "P3", attachments) {
  return {
    message_id: `${subject.slice(0, 12)}-${Math.random().toString(36).slice(2, 6)}`,
    from,
    to: [ME],
    subject,
    body,
    received_at_label: "Today",
    priority,
    ...(attachments ? { attachments } : {}),
  };
}

function check(id, instruction, confirm_label) {
  return { id, kind: "checklist", instruction, confirm_label };
}
function observe(id, instruction, question, accept_keywords, hint, capture_as) {
  return {
    id,
    kind: "observe",
    instruction,
    question,
    accept_keywords,
    hint,
    ...(capture_as ? { capture_as } : {}),
  };
}
function reply(groups, required, model, bonus, reject) {
  return {
    min_words: 15,
    max_words: 200,
    accept_keywords: groups,
    required_groups: required,
    ...(bonus ? { bonus_groups: bonus } : {}),
    ...(reject ? { reject_keywords: reject } : {}),
    model_reply: model,
    max_attempts_before_model: 3,
  };
}
function g(id, label, any_of) {
  return { id, label, any_of };
}

const people = {
  priya: { name: "Priya Nair", email: "priya.nair@finova.tech", title: "IT Onboarding" },
  ren: { name: "Ren", email: "ren.mentor@finova.tech", title: "L1 Desk Lead" },
  arjun: { name: "Arjun Mehta", email: "arjun.mehta@finova.tech", title: "Infrastructure Lead" },
  meera: { name: "Meera Iyer", email: "meera.iyer@finova.tech", title: "Payments Eng Manager" },
  kavya: { name: "Kavya Shah", email: "kavya.shah@finova.tech", title: "New Analyst" },
  rahul: { name: "Rahul Dev", email: "rahul.dev@finova.tech", title: "Developer" },
  security: { name: "Security Desk", email: "security@finova.tech", title: "Security" },
  oncall: { name: "L2 On-call", email: "oncall@finova.tech", title: "Cloud Ops L2" },
};

const tickets = [
  T({
    ticket_id: "FIN-L1-001", tier: 1, sequence: 1, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"] },
    email: mail(people.priya, "Welcome to Finova — confirm your AWS account ID",
      `Hi,\n\nWelcome to Finova cloud support.\n\n1) Open finova-dev console\n2) Find the 12-digit Account ID\n3) Reply with Account ID + alias\n\nDo not share passwords.\n\n— Priya`, "P4"),
    work: { environment: "checklist", steps: [
      check("s1", "Open account menu and find the 12-digit Account ID.", "I found the Account ID"),
      observe("s2", "Capture the Account ID for your reply.", "Account ID?", [ACCOUNT, "8472", "finova-dev"], `Sim ID is ${ACCOUNT}.`, "account_id"),
    ]},
    reply: reply([g("id", "states account id", [ACCOUNT, "account id", "8472"]), g("alias", "mentions finova-dev", ["finova-dev", "finova", "dev"])], ["id", "alias"],
      `Hi Priya, confirmed Account ID ${ACCOUNT} on finova-dev. — L1`),
    debrief: { english: "Always know which account you are in.", tanglish: "Account confirm pannathukku apram touch pannunga." },
  }),
  T({
    ticket_id: "FIN-L1-002", tier: 1, sequence: 2, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"], tickets_closed: ["FIN-L1-001"] },
    email: mail(people.ren, "Quick check — which Region do Finova prod workloads run in?",
      `Hey,\n\nProve Region discipline.\nFinova India prod = Mumbai ap-south-1.\nReply with Region name AND code.\nTrap: us-east-1 looks empty but nothing is deleted.\n\n— Ren`, "P4"),
    work: { environment: "checklist", steps: [
      check("s1", "Find the Region selector top-right.", "I found Region selector"),
      observe("s2", "Confirm India prod Region code.", "Region code?", [REGION, "mumbai"], "Mumbai = ap-south-1", "region"),
    ]},
    reply: reply([g("code", "names ap-south-1", [REGION, "apsouth1"]), g("city", "names Mumbai", ["mumbai", "india"])], ["code"],
      "Ren — Finova prod is Mumbai, ap-south-1. I will check Region before every ticket.", ["city"]),
    debrief: { english: "Wrong Region = fake missing resources.", tanglish: "Wrong Region = fake missing. Always check." },
  }),
  T({
    ticket_id: "FIN-L1-003", tier: 1, sequence: 3, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"], tickets_closed: ["FIN-L1-002"] },
    email: mail(people.arjun, "Use search — open IAM without hunting the mega-menu",
      `Team,\n\nUse console search. Open IAM. Reply confirming you used search.\n\n— Arjun`, "P4"),
    work: { environment: "checklist", steps: [
      check("s1", "Use search (or Services) and open IAM.", "IAM is open"),
      check("s2", "Confirm account context before leaving.", "Account context checked"),
    ]},
    reply: reply([g("iam", "mentions IAM", ["iam", "identity"]), g("search", "mentions search/nav", ["search", "navigate", "opened"])], ["iam"],
      "Opened IAM via console search on finova-dev. — L1", ["search"]),
    debrief: { english: "Search bar > wandering Services menu.", tanglish: "Search use pannunga." },
  }),
  T({
    ticket_id: "FIN-L1-004", tier: 1, sequence: 4, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"], tickets_closed: ["FIN-L1-003"] },
    email: mail(people.meera, "URGENT? Fix Mumbai VPC for payments — please handle",
      `Hi,\n\nPayments feels slow. Someone said fix the Mumbai VPC routes.\nCan you change them?\n\n— Meera`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Verify account + Region. Do NOT change VPC.", "Verified — no VPC change"),
      check("s2", "Escalate: VPC changes are out of L1 scope.", "Escalated to Ren / Engineer"),
    ]},
    reply: reply([
      g("check", "mentions account/region check", ["account", "region", "ap-south", "verified"]),
      g("scope", "out of scope / escalated", ["escalat", "out of scope", "cloud engineer", "not l1", "ren"]),
    ], ["check", "scope"],
      "Hi Meera — verified finova-dev / ap-south-1. VPC changes out of L1 scope; escalated. No networking changes made. — L1",
      null, ["i fixed the vpc", "changed route", "deleted subnet"]),
    debrief: { english: "Know what NOT to touch. Escalate cleanly.", tanglish: "Touch panna koodathu-nu theriyanum." },
  }),
  T({
    ticket_id: "FIN-L1-005", tier: 2, sequence: 5, service: "iam",
    source_lessons: ["PM-0.1", "PM-1.1"], unlock: { lessons_complete: ["PM-0.1", "PM-1.1"], tickets_closed: ["FIN-L1-004"] },
    email: mail(people.kavya, "Cannot sign in to AWS console — first day",
      `Hi,\n\nJoined today. Console login fails.\nUsername: kavya.analyst\nPlease help — do NOT email me a password in this thread.\n\n— Kavya`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Confirm user kavya.analyst exists / open in IAM.", "Found the user"),
      check("s2", "Plan password reset + require change next login. No secrets in reply.", "Reset plan confirmed"),
    ]},
    reply: reply([
      g("user", "names user", ["kavya", "analyst"]),
      g("reset", "password/console reset", ["reset", "password", "console", "sign-in"]),
      g("safe", "safe channel", ["not email password", "secure", "require", "change at next"]),
    ], ["user", "reset"],
      "Hi Kavya — found kavya.analyst. Initiated console password reset with require-change. Use approved reset channel — not this thread. — L1",
      ["safe"], ["password is", "pwd:", "temp123", "administratoraccess"]),
    debrief: { english: "Never paste secrets into mail.", tanglish: "Password-ah mail-la paste pannaathinga." },
  }),
  T({
    ticket_id: "FIN-L1-006", tier: 1, sequence: 6, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"], tickets_closed: ["FIN-L1-004"] },
    email: mail(people.rahul, "All our EC2 instances disappeared!!!",
      `HELP\n\nI opened console and EC2 list is EMPTY. Did someone delete production?\n\n— Rahul`, "P2"),
    work: { environment: "checklist", steps: [
      check("s1", "Ask/check: which Region is selected? Likely us-east-1 trap.", "Checked Region"),
      observe("s2", "What Region should Finova India workloads use?", "Correct Region?", [REGION, "mumbai"], "Switch to ap-south-1", "region"),
    ]},
    reply: reply([
      g("calm", "calms / not deleted", ["not deleted", "still there", "wrong region", "region", "empty"]),
      g("fix", "tells correct region", [REGION, "mumbai"]),
    ], ["calm", "fix"],
      "Rahul — instances are not deleted. You were likely in the wrong Region. Switch to ap-south-1 (Mumbai) and refresh. — L1"),
    debrief: { english: "False alarm: wrong Region looks like deletion.", tanglish: "Wrong Region = empty list. Calm reply." },
  }),
  T({
    ticket_id: "FIN-L1-007", tier: 1, sequence: 7, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"], tickets_closed: ["FIN-L1-006"] },
    email: mail(people.meera, "About to run a change — am I in prod or dev?",
      `Before I click anything: how do I confirm I'm in finova-dev not prod?\nReply with what to check (Account ID / alias).\n\n— Meera`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Open account menu: compare alias finova-dev vs finova-prod.", "Compared aliases"),
      observe("s2", "Dev Account ID for this sim?", "Dev Account ID?", [ACCOUNT], ACCOUNT, "account_id"),
    ]},
    reply: reply([
      g("how", "how to check", ["account", "alias", "top right", "menu", "id"]),
      g("dev", "mentions finova-dev", ["finova-dev", "dev", ACCOUNT]),
    ], ["how", "dev"],
      `Check top-right account menu: alias should be finova-dev and ID ${ACCOUNT} before any change. — L1`),
    debrief: { english: "Verify account before every change.", tanglish: "Change-ku munnaadi account verify." },
  }),
  T({
    ticket_id: "FIN-L1-008", tier: 1, sequence: 8, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"], tickets_closed: ["FIN-L1-007"] },
    email: mail(people.ren, "Desk habit — pin IAM + CloudWatch",
      `L1s should pin IAM and CloudWatch and know Recently visited.\nConfirm you set favorites and reply what you pinned.\n\n— Ren`, "P4"),
    work: { environment: "checklist", steps: [
      check("s1", "Pin / favorite IAM for fast access (or confirm habit).", "IAM pinned/confirmed"),
      check("s2", "Pin / favorite CloudWatch.", "CloudWatch pinned/confirmed"),
    ]},
    reply: reply([
      g("iam", "mentions IAM", ["iam"]),
      g("cw", "mentions CloudWatch", ["cloudwatch", "monitor"]),
    ], ["iam", "cw"],
      "Pinned IAM and CloudWatch to favorites. Will use Recently visited for speed. — L1"),
    debrief: { english: "Desk speed = favorites + search.", tanglish: "Favorites + search = speed." },
  }),
  T({
    ticket_id: "FIN-L1-009", tier: 2, sequence: 9, service: "console",
    source_lessons: ["PM-0.1"], unlock: { lessons_complete: ["PM-0.1"], tickets_closed: ["FIN-L1-008"] },
    email: mail(people.meera, "Mumbai is slow — is it us or AWS?",
      `Payments latency up in Mumbai. Before we blame Finova code, check if AWS has a regional issue for ap-south-1.\nReply with what you checked and recommendation.\n\n— Meera`, "P2"),
    work: { environment: "checklist", steps: [
      check("s1", "Check AWS Health / status for ap-south-1 (or note no open AWS event in sim).", "Checked AWS Health for Region"),
      check("s2", "Decide: escalate to app team vs wait on AWS event.", "Decision recorded"),
    ]},
    reply: reply([
      g("health", "checked AWS/region health", ["health", "aws", "region", "ap-south", "status", "event"]),
      g("next", "next step", ["finova", "app", "escalate", "monitor", "no aws issue", "continue"]),
    ], ["health", "next"],
      "Checked AWS Health for ap-south-1 — no blocking regional event in sim. Recommend continue Finova app triage while monitoring Health. — L1"),
    debrief: { english: "Rule out AWS-side before blaming the app.", tanglish: "AWS Health paathutu app blame pannunga." },
  }),
  T({
    ticket_id: "FIN-L1-010", tier: 1, sequence: 10, service: "iam",
    source_lessons: ["PM-1.1"], unlock: { lessons_complete: ["PM-1.1"], tickets_closed: ["FIN-L1-005"] },
    email: mail(people.arjun, "Is rahul.dev in the Developers group?",
      `Quick read-only check: list groups for rahul.dev and reply.\n\n— Arjun`, "P4"),
    work: { environment: "checklist", steps: [
      check("s1", "Open IAM user rahul.dev → Groups.", "Opened user groups"),
      observe("s2", "What group is he in? (sim: Developers)", "Group name?", ["developers", "developer"], "Developers", "group"),
    ]},
    reply: reply([
      g("user", "names user", ["rahul"]),
      g("group", "names Developers", ["developers", "developer"]),
    ], ["user", "group"],
      "rahul.dev is in the Developers group. — L1"),
    debrief: { english: "Read-only checks are valid L1 work.", tanglish: "Read-only check-um L1 work." },
  }),
  T({
    ticket_id: "FIN-L1-011", tier: 1, sequence: 11, service: "iam",
    source_lessons: ["PM-1.1"], unlock: { lessons_complete: ["PM-1.1"], tickets_closed: ["FIN-L1-010"] },
    email: mail(people.priya, "Offboarding — disable analyst console + keys",
      `Analyst left. Disable console access and deactivate access keys for lea.analyst.\nDo NOT delete the user (audit).\nAsk me for HR ticket number in your reply.\n\n— Priya`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Disable console login for lea.analyst.", "Console disabled"),
      check("s2", "Deactivate access keys (keep for evidence).", "Keys deactivated"),
      check("s3", "Do not delete the IAM user.", "User retained"),
    ]},
    reply: reply([
      g("actions", "disabled console/keys", ["disable", "deactivate", "console", "key"]),
      g("nodelete", "did not delete", ["not delete", "retained", "audit", "kept"]),
      g("hr", "asks HR ticket", ["hr", "ticket", "reference"]),
    ], ["actions", "nodelete"],
      "Disabled console and deactivated keys for lea.analyst. User not deleted (audit). Please share HR ticket #. — L1",
      ["hr"], ["deleted the user", "administratoraccess"]),
    debrief: { english: "Offboard = disable, don't destroy evidence.", tanglish: "Disable pannunga — delete pannaathinga." },
  }),
  T({
    ticket_id: "FIN-L1-012", tier: 2, sequence: 12, service: "iam",
    source_lessons: ["PM-1.3"], unlock: { lessons_complete: ["PM-1.3"], tickets_closed: ["FIN-L1-011"] },
    email: mail(people.ren, "Can analyst role delete S3 objects?",
      `Read the attached policy. Can AnalystReadOnly delete objects?\nReply with Allow actions you see.\n\n— Ren`, "P4",
      [{ name: "AnalystReadOnly.json", kind: "json", content: '{\n  "Effect": "Allow",\n  "Action": ["s3:GetObject", "s3:ListBucket"],\n  "Resource": "*"\n}' }]),
    work: { environment: "checklist", steps: [
      check("s1", "Read attached policy JSON.", "Policy read"),
      observe("s2", "Is DeleteObject allowed?", "Delete allowed? (yes/no)", ["no", "not", "getobject", "list"], "Only Get/List — no delete", "answer"),
    ]},
    reply: reply([
      g("no", "says cannot delete", ["no", "cannot", "not delete", "read-only"]),
      g("actions", "names get/list", ["getobject", "listbucket", "get", "list"]),
    ], ["no", "actions"],
      "AnalystReadOnly allows s3:GetObject and s3:ListBucket only — no DeleteObject. — L1"),
    debrief: { english: "Read the JSON before guessing.", tanglish: "JSON padichutu guess pannaathinga." },
  }),
  T({
    ticket_id: "FIN-L1-013", tier: 2, sequence: 13, service: "iam",
    source_lessons: ["PM-1.4"], unlock: { lessons_complete: ["PM-1.4"], tickets_closed: ["FIN-L1-012"] },
    email: mail(people.rahul, "Access Denied on s3:PutObject",
      `Error:\nAccessDenied: User: arn:aws:iam::847291635028:user/rahul.dev is not authorized to perform: s3:PutObject on resource: arn:aws:s3:::finova-reports/*\n\nWhat is missing? Who owns the fix?\n\n— Rahul`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Extract principal, action, resource from the error.", "Parsed Access Denied"),
      check("s2", "Decide: missing PutObject on finova-reports — route to bucket owner / scoped policy, not Admin.", "Routed scoped fix"),
    ]},
    reply: reply([
      g("cause", "missing put/permission", ["putobject", "permission", "not authorized", "denied", "missing"]),
      g("resource", "bucket/reports", ["finova-reports", "s3", "bucket"]),
      g("route", "scoped fix not admin", ["scoped", "owner", "policy", "not admin", "least"]),
    ], ["cause", "resource"],
      "rahul.dev lacks s3:PutObject on finova-reports. Request a scoped allow (or group policy) from bucket owner — not AdministratorAccess. — L1",
      ["route"], ["administratoraccess"]),
    debrief: { english: "Parse the error: who / action / resource.", tanglish: "Who + action + resource parse pannunga." },
  }),
  T({
    ticket_id: "FIN-L1-014", tier: 2, sequence: 14, service: "iam",
    source_lessons: ["PM-1.2"], unlock: { lessons_complete: ["PM-1.2"], tickets_closed: ["FIN-L1-013"] },
    email: mail(people.rahul, "Lambda can't read DynamoDB — paste my access keys?",
      `My Lambda fails on DynamoDB. Can I put my IAM user access keys in the env vars?\n\n— Rahul`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Reject long-lived user keys in Lambda.", "Rejected keys-in-env"),
      check("s2", "Correct approach: IAM role on the function (instance/task role pattern).", "Recommend function role"),
    ]},
    reply: reply([
      g("no", "don't paste keys", ["no", "do not", "don't", "never", "keys"]),
      g("role", "use role", ["role", "execution role", "instance profile", "assume"]),
    ], ["no", "role"],
      "Do not paste user access keys into Lambda. Attach an IAM role to the function with DynamoDB read only. — L1",
      null, ["here is my key", "akia"]),
    debrief: { english: "Roles for services — not long-lived user keys.", tanglish: "Service-ku role — user keys illa." },
  }),
  T({
    ticket_id: "FIN-L1-015", tier: 2, sequence: 15, service: "iam",
    source_lessons: ["PM-1.1", "PM-1.3"], unlock: { lessons_complete: ["PM-1.1"], tickets_closed: ["FIN-L1-014"] },
    email: mail(people.meera, "Just give me AdministratorAccess / root — faster",
      `We're blocked. Give my user AdministratorAccess or share root. Speed matters.\n\n— Meera`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Refuse Admin/root shortcuts.", "Refused Admin/root"),
      check("s2", "Ask for the specific action + resource needed.", "Asked for scoped need"),
    ]},
    reply: reply([
      g("refuse", "refuses admin/root", ["no", "cannot", "won't", "refuse", "not share root", "not administrator"]),
      g("scoped", "asks scoped need", ["scoped", "specific", "action", "resource", "least", "what do you need"]),
    ], ["refuse", "scoped"],
      "I can't grant AdministratorAccess or share root. Tell me the exact action + resource — we'll request least privilege. — L1",
      null, ["here's root", "administratoraccess attached"]),
    debrief: { english: "Push back on Admin/root. Ask for scoped need.", tanglish: "Admin/root refuse — scoped need kelunga." },
  }),
  T({
    ticket_id: "FIN-L1-016", tier: 3, sequence: 16, service: "iam",
    source_lessons: ["PM-1.4"], unlock: { lessons_complete: ["PM-1.4"], tickets_closed: ["FIN-L1-015"] },
    email: mail(people.security, "P1 — Access key found in public GitHub",
      `Key AKIA… (redacted) for user deploy.bot found in a public repo.\nDeactivate key (do not delete yet). Notify Security. Open incident.\n\n— Security`, "P1"),
    work: { environment: "checklist", steps: [
      check("s1", "Deactivate the exposed access key (keep for evidence).", "Key deactivated"),
      check("s2", "Notify Security / open incident — do not paste the secret in reply.", "Security notified"),
    ]},
    reply: reply([
      g("deact", "deactivated key", ["deactivat", "disabled", "revoked"]),
      g("sec", "security/incident", ["security", "incident", "notified"]),
      g("nodelete", "kept evidence", ["not delete", "evidence", "retained", "kept"]),
    ], ["deact", "sec"],
      "Deactivated exposed access key on deploy.bot (retained for evidence). Security notified / incident opened. Secret not pasted here. — L1",
      ["nodelete"], ["akia", "secret key is"]),
    debrief: { english: "Contain first: deactivate, don't destroy evidence.", tanglish: "Deactivate first — evidence vechikkunga." },
  }),
  T({
    ticket_id: "FIN-L1-017", tier: 3, sequence: 17, service: "iam",
    source_lessons: ["PM-1.5"], unlock: { lessons_complete: ["PM-1.5"], tickets_closed: ["FIN-L1-016"] },
    email: mail(people.arjun, "Who changed the payments policy last night?",
      `Need CloudTrail facts: actor, event name, time, source IP for payments policy change.\nAttachment has a sample event excerpt.\n\n— Arjun`, "P2",
      [{ name: "cloudtrail-excerpt.json", kind: "json", content: '{\n  "eventName": "PutUserPolicy",\n  "userIdentity": { "userName": "ops.lead" },\n  "eventTime": "2026-09-25T22:14:03Z",\n  "sourceIPAddress": "103.21.244.12"\n}' }]),
    work: { environment: "checklist", steps: [
      check("s1", "Read CloudTrail excerpt attachment.", "Excerpt read"),
      observe("s2", "Who was the actor?", "Actor username?", ["ops.lead", "ops"], "ops.lead", "actor"),
    ]},
    reply: reply([
      g("actor", "actor", ["ops.lead", "ops"]),
      g("event", "event", ["putuserpolicy", "policy"]),
      g("when", "time", ["22:14", "2026-09-25", "eventtime"]),
      g("ip", "source ip", ["103.21.244.12", "sourceip", "ip"]),
    ], ["actor", "event"],
      "CloudTrail: PutUserPolicy by ops.lead at 2026-09-25T22:14:03Z from 103.21.244.12. — L1",
      ["when", "ip"]),
    debrief: { english: "Investigation = facts, not guesses.", tanglish: "Facts mattum — guess illa." },
  }),
  T({
    ticket_id: "FIN-L1-018", tier: 1, sequence: 18, service: "cloudwatch",
    source_lessons: ["PM-5.1"], unlock: { lessons_complete: ["PM-5.1"], tickets_closed: ["FIN-L1-002"] },
    email: mail(people.meera, "Is payments-api CPU high right now?",
      `Check CloudWatch dashboard for payments-api CPU last 1h.\nSim value: peak ~72% at 10:40.\nReply with value + window.\n\n— Meera`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Open CloudWatch dashboards / metrics for payments-api.", "Opened metrics"),
      observe("s2", "Peak CPU % in sim?", "Peak %?", ["72", "seventy"], "72%", "cpu"),
    ]},
    reply: reply([
      g("cpu", "cpu value", ["72", "cpu"]),
      g("window", "time window", ["1h", "hour", "10:40", "last"]),
    ], ["cpu"],
      "payments-api CPU peaked ~72% in the last 1h (around 10:40 in sim). — L1", ["window"]),
    debrief: { english: "Report value + time window.", tanglish: "Value + time window solunga." },
  }),
  T({
    ticket_id: "FIN-L1-019", tier: 1, sequence: 19, service: "cloudwatch",
    source_lessons: ["PM-5.1"], unlock: { lessons_complete: ["PM-5.1"], tickets_closed: ["FIN-L1-018"] },
    email: mail(people.rahul, "Graph is flat — is monitoring broken?",
      `CPU graph is a flat line. Monitoring dead?\n\n— Rahul`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Check time range / period — often too wide or wrong metric.", "Checked range/period"),
      check("s2", "Confirm metric namespace/dimension for the instance.", "Confirmed metric identity"),
    ]},
    reply: reply([
      g("notbroken", "not necessarily broken", ["not broken", "time range", "period", "wrong metric", "flat"]),
      g("fix", "what to check", ["range", "period", "dimension", "namespace", "refresh"]),
    ], ["notbroken", "fix"],
      "Flat graphs are often wrong time range/period or wrong metric dimensions — not dead monitoring. Adjust range and confirm dimensions. — L1"),
    debrief: { english: "False alarm: range/period before 'monitoring is broken'.", tanglish: "Range/period first." },
  }),
  T({
    ticket_id: "FIN-L1-020", tier: 2, sequence: 20, service: "cloudwatch",
    source_lessons: ["PM-5.2"], unlock: { lessons_complete: ["PM-5.2"], tickets_closed: ["FIN-L1-019"] },
    email: mail(people.oncall, "HighCPU alarm in ALARM — need handoff",
      `Alarm HighCPU-payments in ALARM.\nThreshold 80% for 5 min. Confirm sustained and hand off facts to L2.\n\n— On-call`, "P2"),
    work: { environment: "checklist", steps: [
      check("s1", "Open alarm: confirm state ALARM + threshold.", "Alarm details checked"),
      check("s2", "Handoff note ready for L2 (no silent ack).", "Handoff prepared"),
    ]},
    reply: reply([
      g("state", "ALARM", ["alarm", "state"]),
      g("thresh", "threshold", ["80", "threshold", "5 min", "five"]),
      g("hand", "handoff L2", ["l2", "on-call", "handoff", "escalat"]),
    ], ["state", "hand"],
      "HighCPU-payments is ALARM (threshold 80%/5m). Sustained in sim. Handing to L2 on-call with metric link/context. — L1",
      ["thresh"]),
    debrief: { english: "L1 triages and hands off with facts.", tanglish: "Facts-oda handoff." },
  }),
  T({
    ticket_id: "FIN-L1-021", tier: 2, sequence: 21, service: "cloudwatch",
    source_lessons: ["PM-5.2"], unlock: { lessons_complete: ["PM-5.2"], tickets_closed: ["FIN-L1-020"] },
    email: mail(people.meera, "Alarm stuck INSUFFICIENT_DATA — outage?",
      `Alarm shows INSUFFICIENT_DATA for an hour. Are we down?\n\n— Meera`, "P4"),
    work: { environment: "checklist", steps: [
      check("s1", "Explain INSUFFICIENT_DATA ≠ outage (stopped instance / missing metrics).", "Explained state"),
      check("s2", "Check if instance/metrics stopped publishing.", "Checked publishers"),
    ]},
    reply: reply([
      g("mean", "explains insufficient", ["insufficient", "not outage", "missing metric", "stopped", "no data"]),
      g("next", "next check", ["instance", "metric", "publish", "agent", "running"]),
    ], ["mean", "next"],
      "INSUFFICIENT_DATA means metrics aren't arriving (often stopped instance) — not automatically an outage. Checking publishers next. — L1"),
    debrief: { english: "Know alarm states: OK / ALARM / INSUFFICIENT_DATA.", tanglish: "Moonu state theriyanum." },
  }),
  T({
    ticket_id: "FIN-L1-022", tier: 2, sequence: 22, service: "cloudwatch",
    source_lessons: ["PM-5.2"], unlock: { lessons_complete: ["PM-5.2"], tickets_closed: ["FIN-L1-021"] },
    email: mail(people.arjun, "Create ALB 5xx alarm → SNS finova-ops-alerts",
      `Please create (or draft) alarm: ALB 5xx > 10 for 5 minutes → SNS finova-ops-alerts.\nReply with the settings you used.\n\n— Arjun`, "P3"),
    work: { environment: "checklist", steps: [
      check("s1", "Confirm metric: ALB HTTPCode_Target_5XX_Count (or sim equivalent).", "Metric confirmed"),
      check("s2", "Threshold >10 for 5 minutes; action SNS finova-ops-alerts.", "Threshold + SNS set in plan"),
    ]},
    reply: reply([
      g("metric", "5xx metric", ["5xx", "alb", "http"]),
      g("thresh", "threshold 10 / 5 min", ["10", "5 min", "five", "threshold"]),
      g("sns", "sns topic", ["finova-ops-alerts", "sns"]),
    ], ["metric", "sns"],
      "Alarm plan: ALB 5xx count > 10 for 5 minutes → notify SNS finova-ops-alerts. — L1",
      ["thresh"]),
    debrief: { english: "Config replies must include metric, threshold, action.", tanglish: "Metric + threshold + SNS solunga." },
  }),
  T({
    ticket_id: "FIN-L1-023", tier: 2, sequence: 23, service: "cloudwatch",
    source_lessons: ["PM-5.3"], unlock: { lessons_complete: ["PM-5.3"], tickets_closed: ["FIN-L1-022"] },
    email: mail(people.oncall, "Logs Insights — count timeouts last 30m",
      `Run (or simulate) Logs Insights on /finova/payments last 30 minutes. Count 'timeout' errors.\nAttachment has sample lines. Sim answer: 7.\n\n— On-call`, "P2",
      [{ name: "payments-sample.log", kind: "log", content: "timeout\nok\ntimeout\ntimeout\nok\ntimeout\ntimeout\nok\ntimeout\ntimeout\n" }]),
    work: { environment: "checklist", steps: [
      check("s1", "Open log group /finova/payments (or read attachment).", "Logs opened"),
      observe("s2", "How many timeout lines in sample?", "Count?", ["7", "seven"], "7 timeouts", "count"),
    ]},
    reply: reply([
      g("count", "count 7", ["7", "seven"]),
      g("what", "timeouts", ["timeout", "error"]),
    ], ["count", "what"],
      "Logs Insights (sample): 7 timeout errors in /finova/payments last 30m window. — L1"),
    debrief: { english: "Log search returns a number + scope.", tanglish: "Count + log group solunga." },
  }),
  T({
    ticket_id: "FIN-L1-024", tier: 3, sequence: 24, service: "cloudwatch",
    source_lessons: ["PM-5.2", "PM-5.3"], unlock: { lessons_complete: ["PM-5.2", "PM-5.3"], tickets_closed: ["FIN-L1-023"] },
    email: mail(people.meera, "P1 — payments 5xx spike — status update please",
      `Customers seeing errors. Need a STATUS UPDATE (not a code fix):\n- metric trend\n- alarm state\n- log signal\n- escalation\n\n— Meera`, "P1"),
    work: { environment: "checklist", steps: [
      check("s1", "Pull metric + alarm + log signals into one timeline.", "Timeline assembled"),
      check("s2", "Escalate to L2/on-call; L1 sends status not a silent fix.", "Escalated + status ready"),
    ]},
    reply: reply([
      g("status", "status update", ["status", "spike", "5xx", "customers"]),
      g("signals", "metric/alarm/logs", ["metric", "alarm", "log", "cpu", "timeout"]),
      g("esc", "escalated", ["escalat", "l2", "on-call"]),
    ], ["status", "esc"],
      "Status: payments 5xx spike observed; HighCPU/5xx alarm context + timeout logs reviewed. Escalated to L2 on-call. L1 monitoring and will update. — L1",
      ["signals"]),
    debrief: { english: "Incident comms: facts + escalate + next update.", tanglish: "Status + escalate + update." },
  }),
];

const index = {
  schema_version: 1,
  role_id: "l1_cloud_support_associate",
  company: "Finova Technologies",
  wip_limit: 3,
  tickets: tickets.map((t) => ({
    ticket_id: t.ticket_id,
    tier: t.tier,
    sequence: t.sequence,
    file: `l1/${t.ticket_id}.json`,
  })),
};

fs.writeFileSync(path.join(ROOT, "_l1_desk.json"), JSON.stringify(index, null, 2) + "\n");
for (const t of tickets) {
  fs.writeFileSync(path.join(ROOT, "l1", `${t.ticket_id}.json`), JSON.stringify(t, null, 2) + "\n");
}
console.log("wrote", tickets.length, "tickets");
console.log(
  "by service",
  Object.fromEntries(
    ["console", "iam", "cloudwatch"].map((s) => [
      s,
      tickets.filter((t) => t.service === s).length,
    ])
  )
);
