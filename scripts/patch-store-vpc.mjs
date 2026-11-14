import fs from "fs";
const p = "src/components/cloud/awsConsole/cloudscape/store.ts";
let s = fs.readFileSync(p, "utf8");

// Replace remaining idSuffix() call patterns with awsId
s = s.replace(
  /`\$\{name\}-\$\{idSuffix\(\)\}\.\$\{region\}\.elb\.amazonaws\.com`/g,
  "`${name}-${awsId(\"i\").slice(2, 10)}.${region}.elb.amazonaws.com`"
);
s = s.replace(
  /const id = `subnet-\$\{idSuffix\(\)\}\$\{idSuffix\(\)\}`\.slice\(0, 24\);/g,
  'const id = awsId("subnet");'
);
s = s.replace(
  /const id = `sg-\$\{idSuffix\(\)\}\$\{idSuffix\(\)\}`\.slice\(0, 20\);/g,
  'const id = awsId("sg");'
);
s = s.replace(
  /const id = `igw-\$\{idSuffix\(\)\}\$\{idSuffix\(\)\}`\.slice\(0, 21\);/g,
  'const id = awsId("igw");'
);

const createVpcNew = `  createVpc: async (opts) => {
    const region = get().identity.region;
    const mode = get().consoleMode;
    const azLetters = ["a", "b", "c"].slice(0, opts.azCount);
    const vpcId = awsId("vpc");
    const mainRtId = awsId("rtb");
    const dhcp = awsId("dopt");
    const withMore =
      opts.publicPerAz > 0 || opts.privatePerAz > 0 || opts.nat !== "none";

    const steps: VpcProvisionStep[] = withMore
      ? [
          { id: "vpc", label: "VPC", done: false },
          { id: "subnets", label: "Subnets", done: false },
          { id: "igw", label: "Internet gateway", done: false },
          { id: "rtb", label: "Route tables", done: false },
          ...(opts.nat !== "none"
            ? [{ id: "nat", label: "NAT gateways", done: false }]
            : []),
          { id: "dns", label: "DNS settings", done: false },
        ]
      : [{ id: "vpc", label: "VPC", done: false }];

    set({ vpcProvision: steps.map((st) => ({ ...st })) });

    await simulateOperation({
      durationMs: withMore
        ? scaledMs("vpcAndMore", mode)
        : scaledMs("iamCreateUser", mode),
      ticks: steps.length,
      onTick: (_p, tickIndex) => {
        set((st) => ({
          vpcProvision: (st.vpcProvision || []).map((step, i) =>
            i <= tickIndex ? { ...step, done: true } : step
          ),
        }));
      },
    });

    const [baseA, baseB] = opts.cidr.split("/")[0].split(".").map(Number);
    let octet = 0;
    const newSubnets: AccountSnapshot["subnets"] = [];
    for (let az = 0; az < opts.azCount; az++) {
      for (let p = 0; p < opts.publicPerAz; p++) {
        octet += 1;
        newSubnets.push({
          id: awsId("subnet"),
          name: \`\${opts.name}-public-\${azLetters[az]}\${opts.publicPerAz > 1 ? \`-\${p + 1}\` : ""}\`,
          state: "available",
          vpc: vpcId,
          cidr: \`\${baseA}.\${baseB}.\${octet}.0/24\`,
          az: \`\${region}\${azLetters[az]}\`,
          public_ip_on_launch: true,
        });
      }
      for (let p = 0; p < opts.privatePerAz; p++) {
        octet += 1;
        newSubnets.push({
          id: awsId("subnet"),
          name: \`\${opts.name}-private-\${azLetters[az]}\${opts.privatePerAz > 1 ? \`-\${p + 1}\` : ""}\`,
          state: "available",
          vpc: vpcId,
          cidr: \`\${baseA}.\${baseB}.\${octet}.0/24\`,
          az: \`\${region}\${azLetters[az]}\`,
          public_ip_on_launch: false,
        });
      }
    }

    const igwId = withMore ? awsId("igw") : null;
    const privateRtId = withMore ? awsId("rtb") : null;

    const mainRoutes = [
      { destination: opts.cidr, target: "local", status: "active" },
      ...(igwId
        ? [{ destination: "0.0.0.0/0", target: igwId, status: "active" }]
        : []),
    ];
    const privateRoutes = [
      { destination: opts.cidr, target: "local", status: "active" },
      ...(opts.nat !== "none"
        ? [
            {
              destination: "0.0.0.0/0",
              target: awsId("nat"),
              status: "active",
            },
          ]
        : []),
    ];

    set((st) => ({
      vpcProvision: null,
      vpcs: [
        ...st.vpcs,
        {
          id: vpcId,
          name: opts.name,
          state: "available" as const,
          cidr: opts.cidr,
          ipv6: null,
          dhcp,
          main_route_table: mainRtId,
        },
      ],
      subnets: [...st.subnets, ...newSubnets],
      igws: igwId
        ? [
            ...st.igws,
            {
              id: igwId,
              name: \`\${opts.name}-igw\`,
              state: "attached" as const,
              vpc: vpcId,
            },
          ]
        : st.igws,
      route_tables: [
        ...st.route_tables,
        {
          id: mainRtId,
          name: withMore ? \`\${opts.name}-public-rt\` : \`\${opts.name}-main-rt\`,
          vpc: vpcId,
          main: true,
          routes: mainRoutes,
        },
        ...(privateRtId
          ? [
              {
                id: privateRtId,
                name: \`\${opts.name}-private-rt\`,
                vpc: vpcId,
                main: false,
                routes: privateRoutes,
              },
            ]
          : []),
      ],
      route: { service: "vpc" as const, page: "vpcs", selectedId: null },
      flash: okFlash(
        withMore
          ? \`Successfully created VPC \${vpcId} with \${newSubnets.length} subnet(s).\`
          : \`Successfully created VPC \${vpcId}.\`
      ),
    }));
    get().log("create_vpc", "vpc", vpcId, {
      name: opts.name,
      cidr: opts.cidr,
      azCount: opts.azCount,
      nat: opts.nat,
      tenancy: opts.tenancy,
    });
  },`;

const start = s.indexOf("  createVpc: (opts) => {");
const endMarker = "  createAlarm:";
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}
s = s.slice(0, start) + createVpcNew + "\n\n" + s.slice(end);

// Fix any remaining ternary flash strings that weren't wrapped
s = s.replace(
  /flash: withMore\s*\n\s*\? `([^`]+)`\s*\n\s*: `([^`]+)`,/g,
  "flash: okFlash(withMore ? `$1` : `$2`),"
);

if (s.includes("idSuffix")) {
  console.log("WARNING: idSuffix still present");
  const lines = s.split("\n");
  lines.forEach((l, i) => {
    if (l.includes("idSuffix")) console.log(i + 1, l.trim());
  });
}

fs.writeFileSync(p, s);
console.log("store patched");
