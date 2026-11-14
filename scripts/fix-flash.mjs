import fs from "fs";
const p = "src/components/cloud/awsConsole/cloudscape/store.ts";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/flash:\s*`([^`]+)`/g, (_m, content) => {
  if (String(content).includes("okFlash") || String(content).includes("errFlash")) {
    return _m;
  }
  return `flash: okFlash(\`${content}\`)`;
});
fs.writeFileSync(p, s);
console.log("done");
