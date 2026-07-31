const fs = require("fs");
const path = require("path");

const skip = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
]);

const em = "\u2014";
// UTF-8 em dash (E2 80 94) mis-decoded as Windows-1252 / Latin-1
const mojibake = "\u00e2\u20ac\u201d";

const exts = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".md",
  ".mdc",
  ".json",
  ".yml",
  ".yaml",
  ".css",
  ".prisma",
  ".example",
  ".sh",
  ".txt",
  ".svg",
  ".html",
]);

let files = 0;
let hits = 0;

function replaceDashes(c) {
  let n = 0;
  n += (c.match(new RegExp(em, "g")) || []).length;
  n += (c.match(new RegExp(mojibake, "g")) || []).length;
  if (n === 0) return { c, n };

  // Do not normalize generic " - " spacing - that collapses YAML/list indent.
  c = c.split(` ${em} `).join(" - ");
  c = c.split(em).join("-");
  c = c.split(` ${mojibake} `).join(" - ");
  c = c.split(mojibake).join("-");
  return { c, n };
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!exts.has(ext) && !ent.name.startsWith(".env")) continue;

    const raw = fs.readFileSync(p, "utf8");
    const { c, n } = replaceDashes(raw);
    if (n === 0) continue;

    fs.writeFileSync(p, c, "utf8");
    files += 1;
    hits += n;
    console.log(`${n}\t${p}`);
  }
}

walk(process.cwd());
console.log(`DONE files=${files} em-dashes=${hits}`);
