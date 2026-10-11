import fs from "node:fs";
import path from "node:path";

const files = ["README.md", ...fs.readdirSync("docs").filter((name) => name.endsWith(".md")).map((name) => path.join("docs", name))];
const scripts = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts;
const errors = [];
const anchors = (source) => new Set(source.split(/\r?\n/)
  .filter((line) => /^#{1,6} /.test(line))
  .map((line) => line.replace(/^#{1,6} /, "").toLowerCase()
    .replaceAll("`", "").replace(/[^\w\s-]/g, "").replace(/\s/g, "-")));

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  if (source.split(/\r?\n/).filter((line) => line.startsWith("```")).length % 2) {
    errors.push(file + ": unmatched code fence");
  }
  const prose = source.replace(/```[\s\S]*?```/g, "");
  for (const [, target] of prose.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(target)) continue;
    const [filename, anchor] = target.split("#");
    const resolved = filename ? path.resolve(path.dirname(file), filename) : path.resolve(file);
    if (!fs.existsSync(resolved)) errors.push(file + ": missing link " + target);
    else if (anchor && resolved.endsWith(".md") && !anchors(fs.readFileSync(resolved, "utf8")).has(anchor)) {
      errors.push(file + ": missing heading " + target);
    }
  }
  for (const [, command] of source.matchAll(/npm(?:\.cmd)? (?:--prefix client )?run ([\w:-]+)/g)) {
    if (!scripts[command]) errors.push(file + ": unknown npm script " + command);
  }
  for (const [, json] of source.matchAll(/```json\r?\n([\s\S]*?)```/g)) {
    try { JSON.parse(json); } catch { errors.push(file + ": invalid JSON example"); }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Validated links, examples, fences, and script references in", files.length, "documents.");
