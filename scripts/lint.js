import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
/** @type {string[]} */
const files = [];

/**
 * @param {string} directory
 */
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (name.endsWith(".js")) files.push(full);
  }
}

walk(path.join(root, "src"));
walk(path.join(root, "scripts"));

let failed = false;
for (const file of files) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) {
    failed = true;
    process.stderr.write(check.stderr || check.stdout);
  }
  const source = readFileSync(file, "utf8");
  if (/\beval\s*\(/.test(source) || /\bnew\s+Function\s*\(/.test(source)) {
    failed = true;
    process.stderr.write(`forbidden dynamic execution in ${file}\n`);
  }
}

if (failed) process.exit(1);
process.stdout.write(`lint ok (${files.length} files)\n`);
