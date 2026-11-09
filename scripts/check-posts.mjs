// Validates content/posts/*.md against docs/POST_TEMPLATE.md (Malware Analysis posts only).
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content/posts");
const H2 = ["Summary", "Concepts used in this sample", "High-level overview", "Indicators of compromise",
  "Execution flow", "Reverse engineering notes", "Detection", "MITRE ATT&CK", "Confidence and limits", "References"];
const OPTIONAL = new Set(["Reverse engineering notes", "References"]);
const IOC = ["Files", "Registry", "Mutexes", "Command lines", "Network", "Packet correlation", "Cross-run consistency", "Other indicators"];
const IOC_REQUIRED = IOC.slice(0, 5);
const STATUS = new Set(["Dropped", "Downloaded", "Modified", "Pre-existing"]);
let bad = 0, legacy = 0;
const fail = (f, m) => { console.error(`${f}: ${m}`); bad++; };

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".md"))) {
  const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
  if (data.category !== "Malware Analysis") continue;
  for (const k of ["title", "description", "authors", "category", "date"]) if (!data[k]) fail(f, `missing frontmatter ${k}`);
  const lines = content.split("\n");
  let inCode = false; const h2 = []; const ioc = []; const flow = []; let sect = "";
  for (const l of lines) {
    if (l.startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    let m;
    if ((m = l.match(/^## (.+)$/))) { h2.push(m[1].trim()); sect = m[1].trim(); }
    else if ((m = l.match(/^### (.+)$/))) {
      if (sect === "Indicators of compromise") ioc.push(m[1].trim());
      if (sect === "Execution flow") flow.push(m[1].trim());
    }
  }
  const unknown = h2.filter((h) => !H2.includes(h));
  if (unknown.length) fail(f, `unknown H2: ${unknown.join("; ")}`);
  const idx = h2.filter((h) => H2.includes(h)).map((h) => H2.indexOf(h));
  if (idx.some((v, i) => i && v < idx[i - 1])) fail(f, "H2 sections out of order");
  for (const r of H2.filter((h) => !OPTIONAL.has(h))) if (!h2.includes(r)) fail(f, `missing H2 "${r}"`);
  const base = (t) => IOC.find((n) => t === n || t.startsWith(n + " "));
  const got = ioc.map(base);
  for (const r of IOC_REQUIRED) if (!got.includes(r)) fail(f, `IOC section missing "### ${r}"`);
  if (got.some((g) => !g)) fail(f, `unknown IOC H3: ${ioc.filter((t) => !base(t)).join("; ")}`);
  const gi = got.filter(Boolean).map((g) => IOC.indexOf(g));
  if (gi.some((v, i) => i && v < gi[i - 1])) fail(f, "IOC H3s out of order");
  const files = content.split(/^### Files\b.*$/m)[1]?.split(/^#{2,3} /m)[0] ?? "";
  const rows = files.split("\n").filter((l) => l.startsWith("|"));
  if (rows.length) {
    const head = rows[0].split("|").slice(1, -1).map((c) => c.trim());
    const si = head.indexOf("Status");
    if (si < 0) { legacy++; console.warn(`${f}: warning, Files table has no Status column (legacy format)`); }
    else for (const r of rows.slice(2)) {
      const v = r.split("|").slice(1, -1)[si]?.trim();
      if (!STATUS.has(v)) fail(f, `Files row has invalid Status "${v}"`);
    }
  }
  const conf = content.split(/^## Confidence and limits$/m)[1]?.split(/^## /m)[0] ?? "";
  for (const lab of ["Observed.", "Not established."]) if (!conf.includes(`**${lab}**`)) fail(f, `Confidence and limits missing **${lab}**`);
  if (!flow.length) fail(f, "Execution flow has no H3 steps");
  else if (!/^Sandbox tags and heuristics reviewed/.test(flow.at(-1))) fail(f, 'last Execution flow H3 must be "Sandbox tags and heuristics reviewed"');
}
if (bad) { console.error(`\n${bad} problem(s)`); process.exit(1); }
console.log(`all posts match the template${legacy ? ` (${legacy} still need a Files Status column)` : ""}`);
