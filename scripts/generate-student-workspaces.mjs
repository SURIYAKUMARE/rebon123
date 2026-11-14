/**
 * Generate Student Mode workspaces: 4 MCQ + 2 T/F + 2 short answer per day.
 * Run: node scripts/generate-student-workspaces.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SM = path.resolve(__dirname, "../src/data/cloud/student_mode");

const DAYS = [
  {
    day: 1,
    topic: "cloud rent vs own",
    mcq: [
      ["Cloud computing primarily means:", ["Renting infrastructure over the internet", "Buying office servers forever", "Coding without internet", "Sharing one root password"], 0, "Rent, not own."],
      ["Student Mode delays the console because:", ["Mental models come before clicks", "AWS is free only later", "Console is broken", "Ren cannot speak"], 0, "Literacy first."],
      ["Which is a major cloud provider?", ["AWS", "Only a local PC shop", "A single office UPS", "A whiteboard"], 0, "AWS is a major provider."],
      ["Paying only for what you use is closest to:", ["OpEx / usage billing", "Buying a generator once", "Ignoring capacity", "Free forever"], 0, "Usage-shaped bill."],
    ],
    tf: [
      ["Cloud means you must buy and house physical servers yourself.", false, "Cloud = rent someone else's data center."],
      ["Understanding rent vs own should come before clicking the AWS console.", true, "That is why Student Mode is fundamentals first."],
    ],
    sa: [
      ["In one or two sentences, what makes cloud different from buying servers?", "You rent infrastructure over the internet and pay for what you use instead of owning hardware.", [["rent", "own", "buy"], ["internet", "use", "pay"]], "rent vs own"],
      ["Why does Ren delay the console in Student Mode?", "So you build a mental model before buttons — otherwise you become a clicker without judgment.", [["mental", "model", "understand"], ["before", "console", "click"]], "model before console"],
    ],
  },
  {
    day: 2,
    topic: "why companies pay",
    mcq: [
      ["Companies moved to cloud mainly for:", ["Speed, flexible cost, and spike survival", "Fashion only", "Slower launches", "Fixed forever capacity"], 0, "Business reasons."],
      ["CapEx is closest to:", ["Big buy now", "Monthly usage bill", "Free credits only", "Ignoring hardware"], 0, "Capital expense."],
      ["Festival traffic 15x for 6 hours — best move:", ["Scale up for the window, then down", "Buy a permanent rack today", "Ignore and hope", "Turn the product off"], 0, "Elasticity."],
      ["OpEx cloud bills usually follow:", ["Actual usage", "Guessed peak forever", "Office rent only", "Laptop price"], 0, "Pay for use."],
    ],
    tf: [
      ["Cloud cost always looks like one forever CapEx purchase.", false, "Cloud usually feels like OpEx."],
      ["Being unable to scale can kill a product even if users love it.", true, "Friendster-style failure pattern."],
    ],
    sa: [
      ["Name two business reasons companies pay for cloud.", "Speed to market and flexible cost or surviving traffic spikes.", [["speed", "fast", "launch"], ["cost", "scale", "spike", "pay"]], "speed + cost/spike"],
      ["What is CapEx vs OpEx in plain words?", "CapEx is buying big upfront; OpEx is ongoing usage-shaped spend.", [["capex", "buy", "upfront"], ["opex", "bill", "usage", "monthly"]], "capex/opex"],
    ],
  },
  {
    day: 3,
    topic: "elasticity and regions",
    mcq: [
      ["Elasticity means:", ["Capacity can stretch and shrink with demand", "Servers never change", "Only one region forever", "Deleting accounts weekly"], 0, "Rubber-band capacity."],
      ["ap-south-1 is:", ["Mumbai Region", "Virginia", "Ireland", "A VPC only"], 0, "Mumbai."],
      ["An Availability Zone is best thought of as:", ["A separate failure domain / building cluster in a Region", "A password", "A billing coupon", "A laptop"], 0, "Failure isolation."],
      ["Wrong Region often causes:", ["High latency for users", "Free forever compute", "No need for IAM", "Automatic Admin"], 0, "Geography matters."],
    ],
    tf: [
      ["Regions are just cosmetic labels with no latency impact.", false, "Geography affects latency."],
      ["Multi-AZ thinking helps survive one building/power failure.", true, "Blast radius."],
    ],
    sa: [
      ["What question should you ask about Region before deploying?", "Which Region is closest to users, and can we survive one AZ failing?", [["region", "mumbai", "latency", "user"], ["az", "fail", "survive"]], "region + AZ"],
      ["Explain elasticity in one sentence.", "Cloud capacity can grow and shrink with demand so you do not wait weeks for hardware.", [["scale", "elastic", "grow", "shrink", "demand"]], "stretch with demand"],
    ],
  },
  {
    day: 4,
    topic: "shared responsibility",
    mcq: [
      ["Shared responsibility means:", ["Provider secures the cloud; you secure what you put in it", "AWS owns your passwords", "You never configure anything", "Root is always safe"], 0, "Split of duties."],
      ["An open public bucket is whose problem first?", ["The customer's configuration", "Only AWS hardware", "The electricity grid", "DNS alone"], 0, "Your config."],
      ["IAM mistakes are mainly:", ["Customer responsibility", "Always AWS bug", "Impossible", "Fixed by Region"], 0, "You own identity config."],
      ["Best habit:", ["Never assume AWS magically secures bad configs", "Share root with everyone", "Disable MFA always", "Ignore policies"], 0, "Own your configs."],
    ],
    tf: [
      ["AWS automatically fixes your weak IAM policies.", false, "You own identity and access config."],
      ["Provider owns physical data centers; you still own accounts and data access.", true, "Classic shared model."],
    ],
    sa: [
      ["In shared responsibility, what do YOU still own?", "Accounts, identity, data access, and application/config choices.", [["iam", "account", "password", "data", "config", "policy"]], "your configs"],
      ["Why is 'AWS will handle it' a dangerous junior phrase?", "It ignores customer-side security like IAM, buckets, and keys.", [["iam", "bucket", "config", "customer", "you"]], "you still own configs"],
    ],
  },
  {
    day: 5,
    topic: "service families",
    mcq: [
      ["Before naming a product, map pain to a:", ["Service family", "Random emoji", "Salary band", "Laptop brand"], 0, "Family first."],
      ["Identity family mainly answers:", ["Who can do what", "How big a disk is", "Which AZ has rain", "CDN pop count"], 0, "Who/what."],
      ["Observe family exists to:", ["See metrics, alarms, logs before customers scream", "Delete VPCs", "Issue credit cards", "Paint servers"], 0, "Eyes on prod."],
      ["Compute family is about:", ["Where code runs", "Only email", "Only DNS", "Only billing PDFs"], 0, "Run code."],
    ],
    tf: [
      ["Memorizing 200 service names beats knowing five families.", false, "Families first."],
      ["Ticket arrives → name the family before the product name.", true, "Desk habit."],
    ],
    sa: [
      ["List the five service families we use.", "Identity, compute, storage, network, observe.", [["identity", "iam"], ["compute"], ["storage", "s3"], ["network", "vpc"], ["observe", "monitor", "cloudwatch"]], "five families"],
      ["Why map business pain to a family first?", "So you pick the right problem class before drowning in product names.", [["pain", "family", "problem", "map"]], "pain → family"],
    ],
  },
  {
    day: 6,
    topic: "identity and compute",
    mcq: [
      ["IAM exists to answer:", ["Who can do what", "How fast disks spin", "Rain in Mumbai", "Font size"], 0, "Identity."],
      ["Least privilege means:", ["Only permissions the job needs", "Always AdministratorAccess", "Share root", "Disable logs"], 0, "Least privilege."],
      ["EC2/Lambda exist to:", ["Run compute / code", "Only store photos", "Only draw VPCs", "Only send SMS"], 0, "Compute."],
      ["Admin as a shortcut is:", ["A trap juniors take", "Best practice always", "Required by AWS", "Free"], 0, "Trap."],
    ],
    tf: [
      ["Without identity controls, anyone can burn money and data.", true, "IAM protects the estate."],
      ["Least privilege means giving everyone Admin so tickets close faster.", false, "Opposite."],
    ],
    sa: [
      ["What problem does IAM solve?", "Controls who can do what so strangers cannot burn ₹ or steal data.", [["who", "permission", "access", "identity"], ["allow", "deny", "policy"]], "who can do what"],
      ["State the least-privilege habit in one line.", "Never grant Admin as a shortcut — only what the job needs.", [["least", "privilege", "admin", "need", "job"]], "least privilege"],
    ],
  },
  {
    day: 7,
    topic: "storage and network",
    mcq: [
      ["S3 is best thought of as:", ["Durable object storage", "A VPC router", "An IAM user", "A CPU type"], 0, "Objects."],
      ["VPC is best thought of as:", ["Your private network neighborhood", "A photo album", "A password vault only", "A invoice PDF"], 0, "Private network."],
      ["Leaving a bucket public 'just for testing' in company accounts is:", ["Dangerous habit", "Always required", "Free security", "Region setting"], 0, "Danger."],
      ["Network family exists so resources can:", ["Talk privately with controlled doors", "Ignore identity", "Skip backups", "Delete CloudTrail"], 0, "Private paths."],
    ],
    tf: [
      ["Public buckets in shared company accounts are a common leak pattern.", true, "BPA matters."],
      ["VPC is only about prettier diagrams, not isolation.", false, "Isolation is the point."],
    ],
    sa: [
      ["Why does storage (S3) exist as a family?", "To keep durable objects like receipts and images without owning disks.", [["object", "storage", "file", "durable", "s3"]], "objects"],
      ["Why does network (VPC) exist?", "Private neighborhood so apps are not flat on the public internet.", [["private", "network", "vpc", "isolate", "subnet"]], "private network"],
    ],
  },
  {
    day: 8,
    topic: "observe",
    mcq: [
      ["Observe / CloudWatch exists so you:", ["See problems before customers scream", "Delete IAM forever", "Skip Regions", "Share root"], 0, "Eyes on prod."],
      ["Best habit:", ["Alarm before dashboard tourism", "Only look after outage tweets", "Disable all alarms", "Ignore logs"], 0, "Alarm first."],
      ["Metrics and logs help you:", ["Triage incidents with evidence", "Avoid accounts", "Skip least privilege", "Turn off MFA"], 0, "Evidence."],
      ["No monitoring usually means:", ["Customers tell you first", "Perfect uptime forever", "Free compute", "Auto IAM"], 0, "Blind ops."],
    ],
    tf: [
      ["Dashboards without alarms are enough for production.", false, "Alarms wake you; tourism does not."],
      ["Observability is optional for payment systems.", false, "Trust requires eyes."],
    ],
    sa: [
      ["What problem does monitoring solve?", "You learn about failures from metrics/alarms — not only angry customers.", [["alarm", "metric", "log", "monitor", "outage", "customer"]], "see before scream"],
      ["What is one sticky observe habit?", "Know what alarm wakes you at 2am before browsing dashboards.", [["alarm", "2am", "wake", "threshold"]], "alarm habit"],
    ],
  },
  {
    day: 9,
    topic: "Finova lens",
    mcq: [
      ["Finova stakes are mainly:", ["Orders, money, trust", "Wallpaper color", "Coffee brand", "Desk plants"], 0, "Payments trust."],
      ["An outage at Finova risks:", ["₹ and reputation", "Only fonts", "Only emoji", "Only Region names"], 0, "Money + trust."],
      ["Map every tech topic into:", ["Orders · money · trust", "Memes only", "Random ports", "Unused AZs"], 0, "Business lens."],
      ["Cloud literacy missing during an outage causes:", ["Slower recovery and blame chaos", "Automatic refunds forever", "Free Admin", "No tickets"], 0, "Literacy matters."],
    ],
    tf: [
      ["At a payments company, trust is optional.", false, "Trust is the product."],
      ["Translate cloud topics into business stakes, not jargon only.", true, "Ren's company lens."],
    ],
    sa: [
      ["What three stakes define Finova's lens?", "Orders, money, and trust.", [["order"], ["money", "rupee", "payment"], ["trust", "reputation"]], "orders money trust"],
      ["Why does cloud literacy matter on outage day?", "People who understand families recover faster and protect money/trust.", [["outage", "recover", "literacy", "trust", "money"]], "recover + trust"],
    ],
  },
  {
    day: 10,
    topic: "capstone readiness",
    mcq: [
      ["Professional Mode unlocks after:", ["Fundamentals + readiness pass", "Buying a server", "Ignoring IAM", "Skipping Region forever"], 0, "Gate."],
      ["Before every console open, check:", ["Region, account, and ticket pain", "Only wallpaper", "Only coffee", "Only timezone jokes"], 0, "Habit."],
      ["Cloud =", ["Rent, not own", "Own forever racks only", "No bills ever", "No identity"], 0, "Foundation."],
      ["Service families help you:", ["Map pain before product names", "Skip shared responsibility", "Avoid monitoring", "Share root"], 0, "Map first."],
    ],
    tf: [
      ["You are ready for Professional Mode without any fundamentals.", false, "Literacy first."],
      ["Console work without Region/account discipline creates fake 'missing' resources.", true, "Classic trap."],
    ],
    sa: [
      ["Say the Student Mode story in two sentences.", "Cloud is rent not own; companies pay for speed and survival; families map pain; then console in Professional Mode.", [["rent", "own", "cloud"], ["family", "professional", "console", "speed"]], "rent + families + pro"],
      ["What habit do you take into Professional Mode?", "Before every console open: Region, account, and what ticket pain you are solving.", [["region"], ["account"], ["ticket", "pain", "problem"]], "region account pain"],
    ],
  },
];

function hints(en) {
  return {
    ren_hint_english: en,
    ren_hint_tanglish: en,
  };
}

function buildDay(spec) {
  const items = [];
  spec.mcq.forEach((row, i) => {
    const [question, options, correct_index, explanation] = row;
    items.push({
      id: `D${spec.day}-Q${i + 1}`,
      type: "quiz",
      question,
      options,
      correct_index,
      ...hints("Think about the lesson mental model."),
      explanation,
    });
  });
  spec.tf.forEach((row, i) => {
    const [statement, correct, explanation] = row;
    items.push({
      id: `D${spec.day}-TF${i + 1}`,
      type: "true_false",
      statement,
      correct,
      ...hints("True or false — watch for the junior trap."),
      explanation,
    });
  });
  spec.sa.forEach((row, i) => {
    const [question, model_answer, groups, label] = row;
    const accept_keywords = groups.map((g, gi) => ({
      id: `g${gi + 1}`,
      label: `${label} part ${gi + 1}`,
      any_of: g,
    }));
    items.push({
      id: `D${spec.day}-SA${i + 1}`,
      type: "short_answer",
      question,
      model_answer,
      accept_keywords,
      required_groups: accept_keywords.map((g) => g.id),
      ...hints("Use your own words — hit the key idea."),
      explanation: model_answer,
    });
  });
  return {
    day: spec.day,
    language: "english",
    pass_threshold: 0.75,
    items,
  };
}

for (const spec of DAYS) {
  const file = path.join(SM, `day${spec.day}_workspace.json`);
  fs.writeFileSync(file, JSON.stringify(buildDay(spec), null, 2) + "\n");
  console.log("wrote", path.basename(file), "items", buildDay(spec).items.length);
}
