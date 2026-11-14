/**
 * Generate condensed MVP Student (10) + Professional R2/R3 lesson JSON.
 * Run: node scripts/generate-mvp-lessons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SM = path.join(ROOT, "src/data/cloud/student_mode");
const PM = path.join(ROOT, "src/data/cloud/professional_mode/lessons");

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("wrote", path.relative(ROOT, file));
}

function smLesson({ day, title, duration, en, tg }) {
  const build = (lang, pack) => ({
    day,
    part: "A",
    language: lang,
    title,
    duration_minutes: duration,
    blocks: pack.blocks,
    lesson_summary: pack.summary,
    doubt_session: pack.doubt,
  });
  writeJson(path.join(SM, `day${day}_lesson_english.json`), build("english", en));
  writeJson(path.join(SM, `day${day}_lesson_tanglish.json`), build("tanglish", tg));
}

function smWorkspace(day, items) {
  writeJson(path.join(SM, `day${day}_workspace.json`), {
    day,
    language: "english",
    items,
  });
}

function block(n, type, heading, board, voice, check) {
  return {
    block: n,
    type,
    heading,
    board_text: board,
    ren_voice: voice,
    check_question: check || null,
  };
}

function openCheck(q, ok, bad, keywords) {
  return {
    question: q,
    expected_response_type: "open",
    accept_keywords: keywords,
    ren_response_if_correct: ok,
    ren_response_if_incorrect: bad,
  };
}

// ─── Student Mode: 10 condensed fundamentals (NO console) ───────────────────

const STUDENT = [
  {
    day: 1,
    title: "Meet Ren — What Cloud Really Is",
    duration: 14,
    en: {
      blocks: [
        block(0, "lesson_intro", "STUDENT MODE · LESSON 1 OF 10",
          "Student Mode = cloud literacy BEFORE the console.\n\nToday:\n• Who Ren is and how she teaches\n• Cloud = rent, not own\n• Why this mode exists\n\nNo AWS console today. Board + voice only.",
          "I am Ren. I spent years in cloud at top companies, then left because schools and courses were not making people job-ready. This Student Mode is short on purpose — ten lessons of fundamentals, then you earn the console in Professional Mode. Today: what cloud actually is."),
        block(1, "concept_intro", "CLOUD = RENT, NOT OWN",
          "Cloud computing = using computers, storage, and software over the internet that someone else owns and maintains.\n\nLike electricity: you do not buy a power plant. You connect, use, and pay for what you used.\n\nBig providers: AWS · Azure · Google Cloud",
          "Cloud means you rent technology over the internet instead of buying servers for your office. You never touch a physical machine. You pay for what you use. AWS, Azure, and Google Cloud own the data centers. That rent-versus-own shift is the whole foundation.",
          openCheck("In one sentence — what makes cloud different from buying your own servers?",
            "Yes — you rent instead of own. That changes money, speed, and who fixes the hardware.",
            "Think rent versus buy. Cloud is renting someone else's computers over the internet.",
            ["rent", "own", "buy", "internet", "pay", "use"])),
        block(2, "why_companies", "WHY THIS MODE COMES FIRST",
          "College often jumps to buttons before mental models.\nResult: people click without knowing why the bill exists.\n\nRebon order:\n1) Understand the problem cloud solves\n2) Then touch the console in Professional Mode",
          "I will not throw you into the console on day one. First you need a mental model. When you later open AWS, every service will map to a business problem — not a random menu.",
          openCheck("Why do we delay the console in Student Mode?",
            "Correct — fundamentals first so console clicks have meaning.",
            "Because clicking without a model creates button-pushers, not engineers.",
            ["fundament", "mental", "model", "understand", "before", "why"])),
        block(3, "mistake_simulation", "JUNIOR TRAP",
          "Trap: memorizing service names with no picture of rent vs own.\nHabit: always ask — what problem does this solve for the business?",
          "Juniors memorize EC2, S3, VPC like vocabulary lists. Useless under pressure. Habit: every concept must answer what business pain it removes."),
        block(4, "summary", "LOCK IT IN",
          "• Cloud = rent infrastructure over the internet\n• Student Mode = literacy before console\n• Next: why companies actually pay for cloud",
          "Lock it: cloud is rent, not own. Ten short lessons. Console comes after you earn it."),
      ],
      summary: { board_text: "Cloud = rent. Console later.", ren_voice: "Lesson 1 done. You know the deal." },
      doubt: { ren_opening: "Any doubt on rent versus own?", wait_for_response: true, ren_closing: "Good. See you in lesson 2." },
    },
    tg: {
      blocks: [
        block(0, "lesson_intro", "STUDENT MODE · LESSON 1 OF 10",
          "Student Mode = cloud literacy BEFORE the console.\n\nToday:\n• Who Ren is and how she teaches\n• Cloud = rent, not own\n• Why this mode exists\n\nNo AWS console today. Board + voice only.",
          "Naan Ren. Top companies-la cloud work panniten. College system job-ready people create pannala — adhaan naan teach panren. Student Mode short — pathu lessons fundamentals. Console Professional Mode-la. Innikku: cloud enna nu clear aaganum."),
        block(1, "concept_intro", "CLOUD = RENT, NOT OWN",
          "Cloud computing = using computers, storage, and software over the internet that someone else owns and maintains.\n\nLike electricity: you do not buy a power plant. You connect, use, and pay for what you used.\n\nBig providers: AWS · Azure · Google Cloud",
          "Cloud naa internet moolama computers rent panrathu — office-la server vangi vechikkura maadhiri illa. Use pannadhukku mattum pay. AWS, Azure, Google Cloud data centers own panraanga.",
          openCheck("Oru sentence-la — cloud buying servers-kitten enna different?",
            "Sari — rent, own illa. Adhaan foundation.",
            "Rent versus buy think pannunga. Cloud = internet-la vera yaarodhu computers rent.",
            ["rent", "own", "buy", "internet", "pay", "use"])),
        block(2, "why_companies", "WHY THIS MODE COMES FIRST",
          "College often jumps to buttons before mental models.\nResult: people click without knowing why the bill exists.\n\nRebon order:\n1) Understand the problem cloud solves\n2) Then touch the console in Professional Mode",
          "Day one-lae console-la push panna matten. First mental model. Apram AWS open pannumbodhu every service-ku meaning irukkum.",
          openCheck("Student Mode-la console delay panradhu yen?",
            "Correct — fundamentals first, then clicks have meaning.",
            "Model illama click panna button-pusher aaguvinga, engineer illa.",
            ["fundament", "mental", "model", "understand", "before", "why"])),
        block(3, "mistake_simulation", "JUNIOR TRAP",
          "Trap: memorizing service names with no picture of rent vs own.\nHabit: always ask — what problem does this solve for the business?",
          "Juniors EC2 S3 VPC list maadhiri padichuttu irupaanga. Pressure-la useless. Habit: every concept business pain remove panradhaa nu kelunga."),
        block(4, "summary", "LOCK IT IN",
          "• Cloud = rent infrastructure over the internet\n• Student Mode = literacy before console\n• Next: why companies actually pay for cloud",
          "Lock: cloud = rent. Pathu short lessons. Console earn pannathukku apram."),
      ],
      summary: { board_text: "Cloud = rent. Console later.", ren_voice: "Lesson 1 done. Clear-aa irukanum." },
      doubt: { ren_opening: "Rent versus own-la doubt irukka?", wait_for_response: true, ren_closing: "Nalla. Lesson 2-ku varom." },
    },
    ws: [
      { id: "D1-Q1", type: "quiz", question: "Cloud computing means:", options: ["Renting infrastructure over the internet", "Buying office servers forever", "Coding offline only", "Sharing one root password"], correct_index: 0, explanation: "Cloud = rent, not own." },
      { id: "D1-Q2", type: "quiz", question: "Student Mode delays the console because:", options: ["Mental models come before clicks", "AWS is free only later", "Console is broken", "Ren cannot speak"], correct_index: 0, explanation: "Literacy first." },
    ],
  },
  {
    day: 2,
    title: "Why Companies Pay for Cloud",
    duration: 14,
    en: {
      blocks: [
        block(0, "lesson_intro", "LESSON 2 · WHY CLOUD WON",
          "Today:\n• Speed to market\n• Cost shape (pay for use)\n• Survive traffic spikes\n\nFinova-shaped stakes with ₹.",
          "Lesson 2. Companies do not buy cloud for fashion. They buy speed, flexible cost, and survival when traffic explodes."),
        block(1, "why_companies", "BEFORE vs AFTER",
          "Before cloud:\n• Crores upfront for hardware\n• Weeks to procure\n• Guess capacity wrong → crash or waste\n\nWith cloud:\n• Start near zero\n• Scale in minutes\n• Pay for what you use",
          "Before cloud, a startup spent months and crores before writing product code. Guess ten servers — too few and you crash on launch day; too many and you bleed money idle. Cloud lets you start small and expand in minutes.",
          openCheck("Name two business reasons companies moved to cloud.",
            "Speed and flexible cost — or survival under spikes. Good.",
            "Think time-to-launch and what happens when traffic goes 20x overnight.",
            ["speed", "cost", "scale", "spike", "pay", "use", "fast"])),
        block(2, "concept_intro", "COST SHAPE",
          "CapEx: big buy now, hope you guessed right.\nOpEx: monthly bill that follows usage.\n\nCloud shifts most infrastructure spend toward OpEx.",
          "CapEx is buying a generator. OpEx is the electricity bill. Cloud mostly feels like OpEx — the bill follows demand. That is why CFOs care."),
        block(3, "example", "FINOVA LENS",
          "Finova launches a festival payment promo.\nTraffic can 15x for six hours.\nPhysical rack: crash or overbuy.\nCloud: scale up for the window, scale down after.",
          "Finova runs festival traffic. Six hours of madness. With cloud they add capacity for the window and release it after. That flexibility is why they pay AWS."),
        block(4, "summary", "LOCK IT IN",
          "• Cloud wins on speed, cost shape, spike survival\n• Next: how elasticity and regions actually help",
          "Companies pay for speed and survival. Next lesson — how the technology delivers that."),
      ],
      summary: { board_text: "Speed · cost shape · spike survival", ren_voice: "Lesson 2 locked." },
      doubt: { ren_opening: "Doubt on CapEx versus OpEx?", wait_for_response: true, ren_closing: "Onward." },
    },
    tg: {
      blocks: [
        block(0, "lesson_intro", "LESSON 2 · WHY CLOUD WON",
          "Today:\n• Speed to market\n• Cost shape (pay for use)\n• Survive traffic spikes\n\nFinova-shaped stakes with ₹.",
          "Lesson 2. Companies fashion-ku cloud vanga maataanga. Speed, flexible cost, traffic explode aana survival — adhaan."),
        block(1, "why_companies", "BEFORE vs AFTER",
          "Before cloud:\n• Crores upfront for hardware\n• Weeks to procure\n• Guess capacity wrong → crash or waste\n\nWith cloud:\n• Start near zero\n• Scale in minutes\n• Pay for what you use",
          "Cloud-ku munnadi startup months and crores waste pannitu product code ezhuduvaanga. Cloud-la small-aa start panni minutes-la scale.",
          openCheck("Rendu business reasons solunga — companies cloud-ku move aana reason?",
            "Speed and flexible cost — or spike survival. Nalla.",
            "Launch speed and 20x traffic overnight think pannunga.",
            ["speed", "cost", "scale", "spike", "pay", "use", "fast"])),
        block(2, "concept_intro", "COST SHAPE",
          "CapEx: big buy now, hope you guessed right.\nOpEx: monthly bill that follows usage.\n\nCloud shifts most infrastructure spend toward OpEx.",
          "CapEx = generator vangradhu. OpEx = electricity bill. Cloud mostly OpEx feel — bill demand follow aagum."),
        block(3, "example", "FINOVA LENS",
          "Finova launches a festival payment promo.\nTraffic can 15x for six hours.\nPhysical rack: crash or overbuy.\nCloud: scale up for the window, scale down after.",
          "Finova festival traffic. Aru hours madness. Cloud-la window-ku capacity add panni apram release. Adhaan AWS bill."),
        block(4, "summary", "LOCK IT IN",
          "• Cloud wins on speed, cost shape, spike survival\n• Next: how elasticity and regions actually help",
          "Speed and survival. Next — technology how deliver panradhu."),
      ],
      summary: { board_text: "Speed · cost shape · spike survival", ren_voice: "Lesson 2 locked." },
      doubt: { ren_opening: "CapEx OpEx-la doubt?", wait_for_response: true, ren_closing: "Ok, next." },
    },
    ws: [
      { id: "D2-Q1", type: "quiz", question: "Cloud cost usually feels most like:", options: ["OpEx that follows usage", "One forever CapEx purchase", "Free forever", "Only salary cost"], correct_index: 0, explanation: "Pay for use." },
      { id: "D2-Q2", type: "quiz", question: "Festival traffic 15x for 6 hours — best cloud move:", options: ["Scale up for the window, then down", "Buy a permanent rack today", "Ignore and hope", "Turn off the product"], correct_index: 0, explanation: "Elasticity." },
    ],
  },
];

// Continue student lessons 3-10 in compact form via helper
function makeStudentRest() {
  const specs = [
    {
      day: 3,
      title: "How Cloud Helps — Elasticity & Regions",
      duration: 14,
      focus: "Elasticity = rubber band capacity. Region = city of data centers. AZ = separate building for failure isolation.",
      why: "You pick Mumbai (ap-south-1) for Indian users to cut latency.",
      habit: "Always ask: which Region, and can this survive one AZ failing?",
      keywords: ["elastic", "region", "az", "scale", "mumbai", "latency"],
    },
    {
      day: 4,
      title: "Shared Responsibility — Who Fixes What",
      duration: 13,
      focus: "Cloud provider secures the cloud. You secure what you put in the cloud (accounts, data, configs).",
      why: "Finova still owns IAM mistakes and open buckets — AWS does not magically secure bad configs.",
      habit: "Never say 'AWS will handle it' for your passwords, policies, or public data.",
      keywords: ["shared", "responsibility", "provider", "customer", "you", "iam", "config"],
    },
    {
      day: 5,
      title: "Service Families Map",
      duration: 15,
      focus: "Five families: Identity · Compute · Storage · Network · Observe. Each solves a different pain.",
      why: "You do not memorize 200 services — you map pain → family first.",
      habit: "Ticket arrives → name the family before the product name.",
      keywords: ["identity", "compute", "storage", "network", "observe", "family"],
    },
    {
      day: 6,
      title: "Identity & Compute — Why They Exist",
      duration: 14,
      focus: "Identity (IAM): who can do what. Compute (EC2/Lambda): where code runs.",
      why: "Without identity, anyone can burn ₹. Without compute, the app has nowhere to run.",
      habit: "Least privilege — never Admin as a shortcut.",
      keywords: ["iam", "identity", "compute", "ec2", "least", "privilege", "who"],
    },
    {
      day: 7,
      title: "Storage & Network — Why They Exist",
      duration: 14,
      focus: "Storage (S3): durable objects. Network (VPC): private neighborhood for resources.",
      why: "Photos, receipts, backups → storage. Isolated private space → network.",
      habit: "Never leave a bucket public 'just for testing' in a company account.",
      keywords: ["s3", "storage", "vpc", "network", "private", "bucket"],
    },
    {
      day: 8,
      title: "Observe — Why Monitoring Exists",
      duration: 13,
      focus: "CloudWatch and friends: metrics, alarms, logs — eyes on production.",
      why: "Without observe, you learn about outages from angry customers first.",
      habit: "Alarm before dashboard tourism — know what wakes you at 2am.",
      keywords: ["cloudwatch", "monitor", "alarm", "metric", "log", "observe"],
    },
    {
      day: 9,
      title: "Finova Company Lens",
      duration: 14,
      focus: "Finova = payments. Orders, money, trust. Outage = ₹ and reputation.",
      why: "Every service choice must protect money movement and customer trust.",
      habit: "Translate every tech topic into: orders · money · trust.",
      keywords: ["finova", "payment", "money", "trust", "order", "outage"],
    },
    {
      day: 10,
      title: "Capstone — Ready for Professional Mode",
      duration: 15,
      focus: "Say it back: rent vs own, why companies pay, five families, Finova stakes. Then readiness check.",
      why: "Professional Mode = Finova hire. Console unlocks after you prove literacy.",
      habit: "Before every console open: Region, account, and what ticket pain you are solving.",
      keywords: ["rent", "family", "finova", "ready", "professional", "console"],
    },
  ];

  for (const s of specs) {
    const enBlocks = [
      block(0, "lesson_intro", `LESSON ${s.day} OF 10`,
        `${s.title}\n\nFocus:\n${s.focus}\n\nStill no console — board literacy only.`,
        `Lesson ${s.day}. ${s.focus} I will keep this tight — model, Finova story, trap, check, habit.`),
      block(1, "concept_intro", "MENTAL MODEL",
        s.focus,
        s.focus,
        openCheck(`In your words — what is the core idea of lesson ${s.day}?`,
          "Good — you own the model.",
          `Say it simpler: ${s.focus.slice(0, 80)}…`,
          s.keywords)),
      block(2, "example", "COMPANY STORY",
        s.why,
        s.why),
      block(3, "mistake_simulation", "TRAP + HABIT",
        `Trap juniors fall into.\n\nHabit: ${s.habit}`,
        `Trap exists. Habit to keep: ${s.habit}`,
        openCheck("What habit will you keep from this lesson?",
          "That habit will save you on the desk.",
          s.habit,
          s.keywords)),
      block(4, "summary", "LOCK IT IN",
        `• ${s.focus}\n• ${s.habit}\n• ${s.day < 10 ? "Next lesson continues the map" : "Next: Readiness Check → Professional Mode"}`,
        s.day < 10
          ? `Lesson ${s.day} locked. Keep going.`
          : "Capstone done. Take the Readiness Check when you are ready — seventy percent unlocks Professional Mode."),
    ];
    const tgBlocks = [
      block(0, "lesson_intro", `LESSON ${s.day} OF 10`,
        `${s.title}\n\nFocus:\n${s.focus}\n\nStill no console — board literacy only.`,
        `Lesson ${s.day}. ${s.focus} Short and clear — model, Finova, trap, check, habit.`),
      block(1, "concept_intro", "MENTAL MODEL",
        s.focus,
        s.focus,
        openCheck(`Lesson ${s.day} core idea unna words-la solunga?`,
          "Nalla — model unkitta irukku.",
          `Simple-aa: ${s.focus.slice(0, 80)}…`,
          s.keywords)),
      block(2, "example", "COMPANY STORY",
        s.why,
        s.why),
      block(3, "mistake_simulation", "TRAP + HABIT",
        `Trap juniors fall into.\n\nHabit: ${s.habit}`,
        `Trap irukku. Habit: ${s.habit}`,
        openCheck("Indha lesson-la entha habit vechikkuringa?",
          "Adhu desk-la save pannum.",
          s.habit,
          s.keywords)),
      block(4, "summary", "LOCK IT IN",
        `• ${s.focus}\n• ${s.habit}\n• ${s.day < 10 ? "Next lesson continues the map" : "Next: Readiness Check → Professional Mode"}`,
        s.day < 10
          ? `Lesson ${s.day} locked. Continue.`
          : "Capstone over. Readiness Check — seventy percent pass aana Professional Mode unlock."),
    ];
    STUDENT.push({
      day: s.day,
      title: s.title,
      duration: s.duration,
      en: {
        blocks: enBlocks,
        summary: { board_text: s.title, ren_voice: `Lesson ${s.day} done.` },
        doubt: { ren_opening: "Any doubt before we close?", wait_for_response: true, ren_closing: "Good." },
      },
      tg: {
        blocks: tgBlocks,
        summary: { board_text: s.title, ren_voice: `Lesson ${s.day} done.` },
        doubt: { ren_opening: "Doubt irukka?", wait_for_response: true, ren_closing: "Ok." },
      },
      ws: [
        {
          id: `D${s.day}-Q1`,
          type: "quiz",
          question: `Lesson ${s.day} core idea is closest to:`,
          options: [s.focus.slice(0, 90), "Buy more office printers", "Ignore Regions forever", "Share root passwords"],
          correct_index: 0,
          explanation: s.focus,
        },
        {
          id: `D${s.day}-Q2`,
          type: "quiz",
          question: "Best habit from this lesson:",
          options: [s.habit, "Skip checks", "Click randomly", "Memorize only jargon"],
          correct_index: 0,
          explanation: s.habit,
        },
      ],
    });
  }
}

makeStudentRest();

for (const lesson of STUDENT) {
  smLesson(lesson);
  smWorkspace(lesson.day, lesson.ws);
}

writeJson(path.join(SM, "_curriculum.json"), {
  mode: "student",
  status: "live",
  canonical_track: "SM-10",
  console_required: false,
  total_days: 10,
  hours_ceiling: 3,
  hours_per_day: 0.25,
  days: STUDENT.map((l) => ({
    day: l.day,
    title: l.title,
    lesson_parts: [`day${l.day}`],
    workspace: `day${l.day}_workspace.json`,
    has_readiness_badge: l.day === 10,
  })),
  readiness_check: "readiness_check.json",
});

writeJson(path.join(SM, "_sm_track.json"), {
  schema_version: 2,
  mode: "student",
  canonical: true,
  console_required: false,
  teaching_level: "principal_mentor_l5",
  languages: ["english", "tanglish"],
  estimated_hours_per_language: 2.5,
  lesson_count: 10,
  readiness: { check_id: "readiness", pass_threshold: 0.7, unlocks: "professional_mode" },
  notes: "Max 10 lessons — fundamentals only, no console. Condensed from prior 22-lesson plan.",
  units: [
    { unit_id: "SM-A", title: "Cloud literacy", lessons: STUDENT.slice(0, 5).map((l) => ({ id: `SM-D${l.day}`, title: l.title, duration_minutes: l.duration })) },
    { unit_id: "SM-B", title: "Families + Finova + readiness", lessons: STUDENT.slice(5).map((l) => ({ id: `SM-D${l.day}`, title: l.title, duration_minutes: l.duration })) },
  ],
});

// ─── Professional R2/R3 authored lessons ────────────────────────────────────

function pmLesson({ id, title, session, sessionName, role, roleTracks, order, service, practiceTarget, en, tg }) {
  const base = (lang, pack) => ({
    lesson_id: id,
    lesson_title: title,
    session_id: session,
    session_name: sessionName,
    mode: "professional",
    language: lang,
    schema_version: 2,
    duration_minutes: 18,
    teaching_level: "principal_mentor_l5",
    company: {
      name: "Finova Technologies",
      your_role: role,
      current_account: "finova-dev",
      manager: "Arjun Mehta (Infrastructure Lead)",
    },
    account: {
      account_id: "847291635028",
      account_name: "finova-dev",
      region: "ap-south-1",
    },
    lesson_intro: pack.intro,
    whiteboard_intro: pack.board,
    segments: pack.segments,
    session_close: pack.close,
  });
  writeJson(path.join(PM, `${id}_english.json`), base("english", en));
  writeJson(path.join(PM, `${id}_tanglish.json`), base("tanglish", tg));
  return { id, roleTracks, order };
}

const PM_META = [];

function makePm({ id, title, session, sessionName, role, roleTracks, order, openTarget, practiceTarget, topic }) {
  const en = {
    intro: {
      heading: `${role} · ${id}`,
      board_text: `${title}\nFinova · finova-dev · ap-south-1\n\nWhy before how:\n${topic.why}\n\nMental model:\n${topic.model}\n\nYou will: watch → learn → practice one navigation.`,
      ren_voice: `I am Ren. ${topic.why} Mental model: ${topic.model} I demonstrate, then you practice. Least privilege and Region discipline stay non-negotiable.`,
    },
    board: {
      duration_seconds: 40,
      board_text: `${title}\n• ${topic.model}\n• Mistake: ${topic.trap}\n• Habit: ${topic.habit}`,
      ren_voice: `Board picture: ${topic.model}. Juniors usually: ${topic.trap}. Your habit: ${topic.habit}.`,
    },
    segments: [
      {
        id: "S1",
        type: "demonstrate",
        title: `Open ${topic.serviceLabel}`,
        setup_voice: `Watch — we open ${topic.serviceLabel} the way a real ticket starts.`,
        steps: [
          { voice: `Navigate to ${topic.serviceLabel}. Confirm Region ap-south-1 before you trust the empty list.`, cursor: { action: "navigate", target: openTarget }, pause_ms: 1100 },
          { voice: topic.demoLine, cursor: { action: "highlight", target: openTarget }, pause_ms: 900 },
        ],
        lesson_voice: topic.lessonLine,
        check: {
          voice: topic.checkQ,
          wait_for_input: true,
          accept_keywords: topic.keywords,
          response_if_correct: topic.checkOk,
          response_if_incorrect: topic.checkBad,
        },
      },
      {
        id: "S2",
        type: "teach",
        title: "Company story + trap",
        steps: [
          { voice: topic.story, cursor: { action: "highlight", target: openTarget }, pause_ms: 1000 },
          { voice: `Trap: ${topic.trap}. Habit: ${topic.habit}`, cursor: null, pause_ms: 800 },
        ],
        check: {
          voice: "What habit will you keep from this lesson?",
          wait_for_input: true,
          accept_keywords: topic.keywords.concat(["habit", "region", "least"]),
          response_if_correct: "That habit is desk gold.",
          response_if_incorrect: topic.habit,
        },
      },
      {
        id: "S3",
        type: "practice",
        title: "Your turn",
        instruction_voice: `Your turn. Open ${topic.serviceLabel} yourself. Start every ticket here.`,
        target: practiceTarget,
        success_targets: [practiceTarget, openTarget],
        hint_after_seconds: 20,
        hint_voice: `Use search or Services menu — land on ${topic.serviceLabel}.`,
        completion_voice: "Good. You found the service. That is how Ops and Engineer days begin.",
      },
      {
        id: "S4",
        type: "ask",
        title: "Say it back",
        question: topic.checkQ,
        wait_for_input: true,
        accept_keywords: topic.keywords,
        response_if_correct: topic.checkOk,
        response_if_incorrect: topic.checkBad,
      },
    ],
    close: {
      ren_voice: `Close ${id}. ${topic.habit}`,
      summary_points: [topic.model, topic.habit, "Region + account before panic"],
      doubt_session: {
        ren_opening: "Doubt on this service family?",
        wait_for_response: true,
        ren_closing: "See you on the next ticket lesson.",
      },
    },
  };

  const tg = {
    intro: {
      heading: `${role} · ${id}`,
      board_text: en.intro.board_text,
      ren_voice: `Naan Ren. ${topic.why} Mental model: ${topic.model} Naan demonstrate panren, neenga practice. Least privilege and Region — non-negotiable.`,
    },
    board: {
      duration_seconds: 40,
      board_text: en.board.board_text,
      ren_voice: `Board: ${topic.model}. Juniors: ${topic.trap}. Habit: ${topic.habit}.`,
    },
    segments: [
      {
        id: "S1",
        type: "demonstrate",
        title: `Open ${topic.serviceLabel}`,
        setup_voice: `Paathuko — ticket start aagura maadhiri ${topic.serviceLabel} open panrom.`,
        steps: [
          { voice: `${topic.serviceLabel}-ku po. Region ap-south-1 confirm pannu.`, cursor: { action: "navigate", target: openTarget }, pause_ms: 1100 },
          { voice: topic.demoLine, cursor: { action: "highlight", target: openTarget }, pause_ms: 900 },
        ],
        lesson_voice: topic.lessonLine,
        check: {
          voice: topic.checkQ,
          wait_for_input: true,
          accept_keywords: topic.keywords,
          response_if_correct: topic.checkOk,
          response_if_incorrect: topic.checkBad,
        },
      },
      {
        id: "S2",
        type: "teach",
        title: "Company story + trap",
        steps: [
          { voice: topic.story, cursor: { action: "highlight", target: openTarget }, pause_ms: 1000 },
          { voice: `Trap: ${topic.trap}. Habit: ${topic.habit}`, cursor: null, pause_ms: 800 },
        ],
        check: {
          voice: "Indha lesson-la entha habit vechikkuringa?",
          wait_for_input: true,
          accept_keywords: topic.keywords.concat(["habit", "region", "least"]),
          response_if_correct: "Adhu desk gold.",
          response_if_incorrect: topic.habit,
        },
      },
      {
        id: "S3",
        type: "practice",
        title: "Your turn",
        instruction_voice: `Ungal turn. ${topic.serviceLabel} neenga open pannunga.`,
        target: practiceTarget,
        success_targets: [practiceTarget, openTarget],
        hint_after_seconds: 20,
        hint_voice: `Search illa Services menu use panni ${topic.serviceLabel} find pannunga.`,
        completion_voice: "Nalla. Service find aachu.",
      },
      {
        id: "S4",
        type: "ask",
        title: "Say it back",
        question: topic.checkQ,
        wait_for_input: true,
        accept_keywords: topic.keywords,
        response_if_correct: topic.checkOk,
        response_if_incorrect: topic.checkBad,
      },
    ],
    close: {
      ren_voice: `${id} close. ${topic.habit}`,
      summary_points: [topic.model, topic.habit, "Region + account before panic"],
      doubt_session: {
        ren_opening: "Doubt irukka?",
        wait_for_response: true,
        ren_closing: "Next ticket lesson-la paakalam.",
      },
    },
  };

  PM_META.push(pmLesson({ id, title, session, sessionName, role, roleTracks, order, openTarget, practiceTarget, en, tg }));
}

const R2 = "l2_cloud_operations";
const R3 = "cloud_engineer";

makePm({
  id: "PM-2.1", title: "VPC Architecture: The Building Blocks", session: "PM-2", sessionName: "VPC",
  role: "Cloud Engineer", roleTracks: [R3], order: 1, openTarget: "service-vpc", practiceTarget: "service-vpc",
  topic: {
    serviceLabel: "VPC",
    why: "Finova apps need a private neighborhood — not a flat public LAN.",
    model: "VPC = your private AWS network. Subnets = rooms. Route tables = doors.",
    trap: "Treating default VPC as 'good enough' for production payments.",
    habit: "Draw public vs private before you create anything.",
    demoLine: "This is the VPC console — where network tickets begin.",
    lessonLine: "If connectivity fails, start with VPC, subnet, route, security group — in that order.",
    story: "Finova payment API in a public subnet with open SSH — auditors will end you. Private compute, controlled entry.",
    checkQ: "What is a VPC in one sentence?",
    checkOk: "Your private network in AWS — rooms and doors for resources.",
    checkBad: "Think private neighborhood for your cloud resources.",
    keywords: ["vpc", "private", "network", "subnet", "route"],
  },
});

makePm({
  id: "PM-2.2", title: "Building a VPC From Scratch", session: "PM-2", sessionName: "VPC",
  role: "Cloud Engineer", roleTracks: [R3], order: 2, openTarget: "service-vpc", practiceTarget: "create-vpc",
  topic: {
    serviceLabel: "VPC",
    why: "Blank account needs a designed network before EC2 land.",
    model: "CIDR first, then public/private subnets, then routes.",
    trap: "Overlapping CIDRs across accounts — VPN hell later.",
    habit: "Write the CIDR plan on the board before Create VPC.",
    demoLine: "Create VPC is where design becomes real.",
    lessonLine: "Never invent CIDRs under ticket pressure — use the agreed plan.",
    story: "Finova staging overlapped prod CIDR — hybrid connectivity broke for a week.",
    checkQ: "What do you decide before clicking Create VPC?",
    checkOk: "CIDR and public/private layout — design first.",
    checkBad: "CIDR plan and subnet roles before the button.",
    keywords: ["cidr", "subnet", "public", "private", "plan", "design"],
  },
});

makePm({
  id: "PM-2.3", title: "Security Groups in Practice", session: "PM-2", sessionName: "VPC",
  role: "Cloud Engineer", roleTracks: [R3], order: 3, openTarget: "service-vpc", practiceTarget: "service-vpc",
  topic: {
    serviceLabel: "VPC",
    why: "Wrong SG rules = either outage or open-to-world disaster.",
    model: "Security Group = stateful allow-list on the ENI. Default deny inbound.",
    trap: "0.0.0.0/0 on SSH 'temporarily'.",
    habit: "Source should be another SG or known CIDR — never lazy open.",
    demoLine: "Security groups live with the network story even when edited near EC2.",
    lessonLine: "Allow only what the ticket needs. Temporary means ticket with expiry.",
    story: "An L2 opened 22 to the world to 'debug'. Scanners found it in minutes.",
    checkQ: "What does a security group do by default for inbound?",
    checkOk: "Deny inbound unless you allow — stateful allow-list.",
    checkBad: "Default deny inbound. You add allows carefully.",
    keywords: ["security", "group", "deny", "allow", "inbound", "sg"],
  },
});

makePm({
  id: "PM-2.4", title: "Troubleshooting Connectivity", session: "PM-2", sessionName: "VPC",
  role: "Cloud Engineer", roleTracks: [R3], order: 4, openTarget: "service-vpc", practiceTarget: "service-vpc",
  topic: {
    serviceLabel: "VPC",
    why: "Timeout tickets are network until proven otherwise.",
    model: "Path: SG → NACL → route → subnet → reachability.",
    trap: "Blaming the app before checking routes and SG.",
    habit: "Trace the path on paper before changing five things.",
    demoLine: "Connectivity failures start in VPC views — not random restarts.",
    lessonLine: "Change one control at a time. Prove the hop.",
    story: "Finova checkout timeouts — missing route to NAT, not the Java bug everyone chased.",
    checkQ: "Name the order you check when traffic times out.",
    checkOk: "SG, NACL, route, subnet — then app.",
    checkBad: "Network path first: SG, route, subnet.",
    keywords: ["sg", "route", "nacl", "subnet", "timeout", "path"],
  },
});

makePm({
  id: "PM-3.1", title: "Launching EC2 Correctly", session: "PM-3", sessionName: "EC2",
  role: "Cloud Operations Associate", roleTracks: [R2, R3], order: 1, openTarget: "service-ec2", practiceTarget: "launch-instance",
  topic: {
    serviceLabel: "EC2",
    why: "Bad launches create forever tickets — wrong subnet, open SSH, long-lived keys.",
    model: "AMI + type + network + IAM role + storage. Keys are last resort.",
    trap: "Public IP + 0.0.0.0/0 SSH for convenience.",
    habit: "Private subnet + Session Manager + instance profile.",
    demoLine: "EC2 Instances — Ops lives here for day-2 compute tickets.",
    lessonLine: "Launch is a checklist, not a feeling.",
    story: "A Finova 'quick' bastion with open SSH became a crypto-miner host.",
    checkQ: "Name two things you set correctly before launch.",
    checkOk: "Subnet/network and IAM role — not open SSH as default.",
    checkBad: "Network placement and identity — least privilege access.",
    keywords: ["subnet", "iam", "role", "private", "launch", "ssm", "session"],
  },
});

makePm({
  id: "PM-3.2", title: "Auto Scaling Groups", session: "PM-3", sessionName: "EC2",
  role: "Cloud Engineer", roleTracks: [R3], order: 2, openTarget: "service-ec2", practiceTarget: "service-ec2",
  topic: {
    serviceLabel: "EC2",
    why: "Festival traffic must add and remove capacity without human heroics.",
    model: "ASG = desired/min/max + health replace. Policy decides when.",
    trap: "Fixed fleet sized for peak 24/7 — burning ₹.",
    habit: "Scale on a metric that matches user pain — not vanity CPU only.",
    demoLine: "Compute capacity planning starts from EC2 thinking — ASG is the rubber band.",
    lessonLine: "ASG replaces unhealthy instances. That is reliability, not just cost.",
    story: "Finova UPI spike — ASG saved checkout while a fixed fleet would have melted.",
    checkQ: "What problem does an Auto Scaling Group solve?",
    checkOk: "Add/remove capacity automatically and replace unhealthy nodes.",
    checkBad: "Rubber-band capacity and health replacement.",
    keywords: ["asg", "scale", "auto", "capacity", "health", "min", "max"],
  },
});

makePm({
  id: "PM-3.3", title: "Application Load Balancer", session: "PM-3", sessionName: "EC2",
  role: "Cloud Engineer", roleTracks: [R3], order: 3, openTarget: "service-ec2", practiceTarget: "service-ec2",
  topic: {
    serviceLabel: "EC2",
    why: "Users hit a stable entry — not one fragile instance IP.",
    model: "ALB distributes to healthy targets across AZs.",
    trap: "Single instance with Elastic IP as 'the website'.",
    habit: "Health checks must match real app readiness.",
    demoLine: "Load balancing belongs with compute design — one entry, many healthy workers.",
    lessonLine: "If targets are unhealthy, ALB will not save a bad deploy.",
    story: "Finova marketing site on one instance — AZ blip took payments help pages down.",
    checkQ: "Why use an ALB instead of one instance IP?",
    checkOk: "Stable entry and distribute only to healthy targets.",
    checkBad: "Health-aware distribution across instances/AZs.",
    keywords: ["alb", "load", "balancer", "healthy", "target", "az"],
  },
});

makePm({
  id: "PM-3.4", title: "Right-Sizing and Troubleshooting", session: "PM-3", sessionName: "EC2",
  role: "Cloud Operations Associate", roleTracks: [R2, R3], order: 4, openTarget: "service-ec2", practiceTarget: "service-ec2",
  topic: {
    serviceLabel: "EC2",
    why: "CPU alarms and slow apps often mean wrong size or noisy neighbor — not more YAML.",
    model: "Right-size = match CPU/mem to real metrics. Troubleshoot: status checks → system → app.",
    trap: "Upsizing forever instead of finding the leak.",
    habit: "Read metrics before you resize; resize before you rebuild the world.",
    demoLine: "EC2 list plus CloudWatch thoughts — Ops triage starts here.",
    lessonLine: "Instance status check failed is infrastructure. 2/2 ok but app slow is application.",
    story: "Finova batch job on t-class burstable — CPU credit exhaustion looked like 'random slowness'.",
    checkQ: "Before resizing, what do you check?",
    checkOk: "Metrics and status checks — prove the bottleneck.",
    checkBad: "Evidence first: CPU, memory, status checks.",
    keywords: ["metric", "size", "cpu", "status", "check", "right"],
  },
});

makePm({
  id: "PM-4.1", title: "S3 Fundamentals and Security", session: "PM-4", sessionName: "S3",
  role: "Cloud Operations Associate", roleTracks: [R2, R3], order: 1, openTarget: "service-s3", practiceTarget: "service-s3",
  topic: {
    serviceLabel: "S3",
    why: "Object storage holds receipts, KYC images, exports — trust lives here.",
    model: "Bucket = container. Object = file. Block Public Access is your seatbelt.",
    trap: "Public bucket 'for testing' in a shared account.",
    habit: "Account BPA on. Prove public access is impossible before you celebrate.",
    demoLine: "S3 home — every storage access ticket starts with the bucket list.",
    lessonLine: "Encryption and BPA are not optional on Finova data.",
    story: "A public KYC prefix leaked — brand damage worse than the engineering fix.",
    checkQ: "What is the first security control you verify on S3?",
    checkOk: "Block Public Access — seatbelt before fancy policies.",
    checkBad: "BPA and who can read objects.",
    keywords: ["s3", "bucket", "public", "bpa", "block", "object"],
  },
});

makePm({
  id: "PM-4.2", title: "Lifecycle Rules and Cost Control", session: "PM-4", sessionName: "S3",
  role: "Cloud Engineer", roleTracks: [R3], order: 2, openTarget: "service-s3", practiceTarget: "service-s3",
  topic: {
    serviceLabel: "S3",
    why: "Logs and exports grow forever — silence is an expensive bill.",
    model: "Lifecycle moves or expires objects by age/prefix.",
    trap: "Keep everything in Standard 'just in case'.",
    habit: "Every log bucket needs a lifecycle on day one.",
    demoLine: "Buckets without lifecycle are future cost incidents.",
    lessonLine: "Cost is an engineering requirement — not only FinOps later.",
    story: "Finova access logs in Standard for 18 months — six-figure surprise.",
    checkQ: "What does an S3 lifecycle rule do?",
    checkOk: "Transition or expire objects automatically by rule.",
    checkBad: "Auto move/delete old objects to control cost.",
    keywords: ["lifecycle", "expire", "transition", "cost", "log"],
  },
});

makePm({
  id: "PM-4.3", title: "Access Control and Incidents", session: "PM-4", sessionName: "S3",
  role: "Cloud Operations Associate", roleTracks: [R2, R3], order: 3, openTarget: "service-s3", practiceTarget: "create-bucket",
  topic: {
    serviceLabel: "S3",
    why: "Access Denied and leak tickets land on Ops first.",
    model: "Identity policy + bucket policy + BPA — all three matter.",
    trap: "Widening bucket policy to * to 'unblock' a ticket.",
    habit: "Reproduce with the principal's identity — then tighten, never *.",
    demoLine: "Create bucket carefully — naming and blockers prevent future incidents.",
    lessonLine: "Incident: contain public exposure first, then root-cause policy.",
    story: "Someone set Principal * to fix a partner integration — weekend incident.",
    checkQ: "Why is Principal * on a bucket policy dangerous?",
    checkOk: "It can open access far beyond the ticket — blast radius.",
    checkBad: "Wildcard principal = potential public or cross-account blast.",
    keywords: ["policy", "principal", "access", "denied", "public", "bpa"],
  },
});

console.log("PM lessons generated:", PM_META.length);
console.log("Student lessons:", STUDENT.length);
