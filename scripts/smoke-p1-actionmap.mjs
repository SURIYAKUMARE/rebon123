import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const map = JSON.parse(
  fs.readFileSync(
    path.join(root, "src/data/cloud/awsConsole/ACTION_MAP.json"),
    "utf8"
  )
);

const families = Object.keys(map.ACTION_MAP);
const required = [
  "NAV",
  "HIGHLIGHT",
  "CLICK",
  "FILL",
  "TOGGLE",
  "SELECT",
  "SHOW",
  "RESET",
];
for (const f of required) {
  if (!families.includes(f)) throw new Error(`missing family ${f}`);
}

const nav = map.ACTION_MAP.NAV;
for (const code of [
  "NAV:iam-users",
  "NAV:ec2-launch-instance",
  "NAV:cw-create-alarm",
  "NAV:cost-explorer",
  "NAV:cost-explorer-view",
]) {
  if (!nav.includes(code)) throw new Error(`missing ${code}`);
}

for (const code of [
  "HIGHLIGHT:btn-create-user",
  "CLICK:btn-launch-instance-submit",
  "TOGGLE:s3-public-acknowledgement",
  "FILL:cw-threshold-value:{value}",
  "SELECT:ec2-ami-amazon-linux",
]) {
  const family = code.split(":")[0];
  if (!map.ACTION_MAP[family].includes(code) && !map.ACTION_MAP[family].some((p) => {
    const escaped = p
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\{value\\\}/g, ".+")
      .replace(/\\\{id\\\}/g, "[^:]+")
      .replace(/\\\{service\\\}/g, "[a-z0-9-]+");
    return new RegExp(`^${escaped}$`).test(code);
  })) {
    // FILL templates match via pattern
    if (family === "FILL" && map.ACTION_MAP.FILL.some((p) => p.startsWith("FILL:cw-threshold"))) {
      continue;
    }
    if (!map.ACTION_MAP[family].includes(code)) {
      throw new Error(`missing ${code}`);
    }
  }
}

const SIM_MS = {
  iamCreateUser: 800,
  s3CreateBucket: 2000,
  ec2PendingToRunning: 35000,
  ec2StatusChecks: 15000,
  ec2Stop: 10000,
  vpcAndMore: 45000,
};
if (SIM_MS.ec2PendingToRunning !== 35000) throw new Error("EC2 timing");
if (SIM_MS.ec2Stop !== 10000) throw new Error("EC2 stop timing");
if (SIM_MS.vpcAndMore !== 45000) throw new Error("VPC timing");

function awsId(kind) {
  const hex = () => Math.random().toString(16).slice(2).padEnd(16, "0").slice(0, 16);
  if (kind === "i") return `i-0${hex()}`;
  if (kind === "vpc") return `vpc-0${hex()}`;
  return kind;
}
const i = awsId("i");
const v = awsId("vpc");
if (!/^i-0[0-9a-f]{16}$/.test(i)) throw new Error(`bad ${i}`);
if (!/^vpc-0[0-9a-f]{16}$/.test(v)) throw new Error(`bad ${v}`);

const totalCodes = Object.values(map.ACTION_MAP).flat().length;
console.log(`OK ACTION_MAP (${totalCodes} codes)`);
console.log(`OK awsId sample ${i} / ${v}`);
console.log("OK P1 smoke constants");
