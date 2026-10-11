import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const files = [];
function collect(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filename);
    else if (entry.name.endsWith(".mjs")) files.push(filename);
  }
}

for (const filename of fs.readdirSync(".")) {
  if (filename.endsWith(".mjs")) files.push(filename);
}
for (const directory of ["src", "scripts", "tests"]) collect(directory);

for (const filename of files) {
  const result = spawnSync(process.execPath, ["--check", filename], { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error("Syntax check failed:", filename);
    process.exit(1);
  }
}
console.log("Syntax checked", files.length, "ES module files.");
