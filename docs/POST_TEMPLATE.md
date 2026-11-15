# Malware-analysis post template

Every post in `content/posts/` with `category: Malware Analysis` follows this layout, so a reader always finds the same
thing in the same place. Copy `docs/post-skeleton.md`, fill it in, then run `npm run check-posts`.

## Frontmatter

```yaml
---
title: "Type:Platform/Family.Variant!suffix"    # Microsoft malware name only, nothing after it
description: Background of the sample, from the evidence only.
authors: [Y2GX64]
category: Malware Analysis
date: YYYY-MM-DD
---
```

**Title.** Use the Microsoft malware naming convention, `Type:Platform/Family.Variant!suffix` (for example `Ransom:MSIL/Cryptolocker.A`), and nothing after the name. Take the name from the analyst report or from a Microsoft detection that was checked. If the name is only a case label or is unverified, convert it to the Microsoft form, add a "Detection-style name" row to the Summary table stating the source and that it was not checked, and note any mismatch with the observed platform (for example a .NET file labelled `Win32` instead of `MSIL`). If no name exists, use a neutral descriptive title and say why.

**Description.** Background of the sample: file size, architecture and framework, header timestamp (with the caveat that it can be altered), the name the sample uses for itself, and how it relates to earlier builds or families. Facts from the evidence only. No behaviour or findings, and no family history from outside sources.

Opening italic line (before `## Summary`): analysis date, and what the post re-checks (report, sandbox runs, packet captures).

## Section order (H2, fixed)

| # | H2 | Contents |
|---|---|---|
| 1 | `## Summary` | 2 to 3 short paragraphs. One bold sentence with the headline finding. Then the fact table: Sample, SHA-256 (taken from the analyst report), Detection-style name (when the title uses one that is not verified), Header timestamp, Environment, Evidence. Last line says whether a standalone execution-chain report accompanies the post. |
| 2 | `## Concepts used in this sample` | 4 to 6 bullets, term in bold, one or two sentences each. Define terms a newcomer needs for this post only. |
| 3 | `## High-level overview` | The SVG "at a glance" figure (5 to 6 steps), then the analyst's own flow chart if one exists. |
| 4 | `## Indicators of compromise` | H3s in this order, see below. |
| 5 | `## Execution flow` | Numbered H3 steps in the order things happened. Ends with the sandbox-heuristics H3. |
| 6 | `## Reverse engineering notes` | **Optional.** Static/code findings that do not fit a step (unpacking, crypto, config decoding, YARA). |
| 7 | `## Detection` | Bullets by data source: file, registry, process, network. YARA goes here. |
| 8 | `## MITRE ATT&CK` | Table: Tactic, Technique, Evidence. Mark analyst mappings that are not in the sandbox's matrix. End with the techniques deliberately not tagged. |
| 9 | `## Confidence and limits` | Bold run-in paragraphs in this order: `**Observed.**`, `**From the code only.**` (when relevant), `**Inferred.**`, `**Not established.**`. Then `### Corrections to earlier reports` (table) when an earlier report existed. A closing italic `*Sources: ...*` line is allowed. |
| 10 | `## References` | Links used. Omit only if there are none. |

No numbered H2s, no other H2 names. Per-step detail belongs in H3s.

## Indicators of compromise (H3 order)

1. `### Files` table: Path (full, absolute), Status, Hash, Role. State which bulk files were left out and why. Say "No exfiltration bundle observed" when true. Status is one of four fixed words, written alone in the cell (the blog renders them as coloured badges):
   - `Dropped`: created on disk by the sample or a child process during the run (self-copies, unpacked payloads, scripts, config, ransom notes).
   - `Downloaded`: fetched from the network and written to disk. Name the source URL or host in Role.
   - `Modified`: existed before and was changed by the sample (overwritten, patched, renamed, encrypted).
   - `Pre-existing`: assumed to already be on the host and not created by the sample, but significant to the chain (abused system binaries or LOLBins, a legitimate app that gets side-loaded, a file the sample reads or expects). Say in Role why it matters and why it is assumed present (for example "ships with Windows", "installed by the lure").
   Group rows by status in this order: Downloaded, Dropped, Modified, Pre-existing. Only list pre-existing files that matter; do not inventory the OS. If a file's origin could not be established, say so in Role and pick the closest status.
2. `### Registry` table: Key, Value, Purpose. Name the single autostart key rather than implying wider persistence.
3. `### Mutexes` list them, or "None observed" plus why (tool cannot see them).
4. `### Command lines` one code block, verbatim.
5. `### Network` table: Indicator, Role. Mark lab infrastructure as not an indicator.
6. `### Packet correlation` frame ranges, endpoints, bytes, mapped to a step. Omit if there is no capture.
7. `### Cross-run consistency` what changed between runs vs. what stayed identical. Say "single run" if there was one.
8. `### Other indicators` optional: host artifacts, ransom-note text, strings, related infrastructure. Always last.

Files, Registry, Mutexes, Command lines and Network are always present. Write "None observed" (when the tool could see it) or "Not recorded in the evidence used for this post." instead of deleting a heading.

## Execution flow rules

- H3 titles are `N. Name` (`1. Delivery`, `2. Self-copy and persistence`). Delivery or lure is step 1 when there is one. Use numbered steps for anything sequential.
- Each step: what happens, the evidence (frame numbers, paths), a screenshot figure if you have one.
- Final H3 is `### Sandbox tags and heuristics reviewed`: list every scary tag or lookalike string that is benign, and why.
- Multi-chain campaigns: use `### Chain A: ...` H3s with the numbered steps as bold run-in text; keep the H2 list unchanged.

## Rigor rules

- Never invent a mutex, key or IOC. "None observed" is a complete answer.
- Separate confirmed attacker behaviour from coincidence and lab artifacts (INetSim answers, Windows telemetry).
- Say which evidence was not analysed.
- Use full absolute paths and verbatim command lines.
- Flag sandbox heuristic false positives, and check which process each tag is attributed to (for example a browser in the sandbox).

## Figures

Use `<figure class="art-fig">` with `fig-head` (title, sub) and `fig-draw`; images live in `public/shared/img/<slug>/`, with alt text, width and height. One inline-SVG overview per post.

## Style

Neutral and objective tone in every section, caption and diagram label.

- State what was observed, not impressions. Do not state intent, quality or risk beyond the evidence.
- No euphemisms or loaded words ("vanishes", "puts up", "fake", "odd", "killed", "obviously malicious"). Use plain terms: "terminates", "displays", "simulated internet", "does not match".
- No first person ("I", "my") and no second person ("you", "your"). Use passive or impersonal wording: "the file was not decompiled", "the local run", "the analyst's report".
- Plain sentences, no emoji, no numbered H2s, "MITRE ATT&CK" spelled the same everywhere.
