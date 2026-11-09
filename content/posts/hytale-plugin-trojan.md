---
title: "Hytale-Examples-Plugin-v2.2: a LuaJIT loader that screenshots your desktop"
description: A fake Hytale plugin pack runs a disguised Lua script through a bundled LuaJIT interpreter, checks the victim's IP, contacts a public Polygon RPC node and uploads a full-HD screenshot over plain HTTP. How the chain works and what each step tells defenders.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-24
---

*Analysis date: 11 September 2026, updated 12 September. The findings come from two sandbox runs and one packet capture. The Lua payload itself was not recovered, so the behavior described here is what was observed on the wire and in the process tree, not what the script's source says.*

## Summary

A download named like a game-plugin example pack turns out to be a three-file loader. A 30-byte batch file starts a bundled copy of the LuaJIT interpreter against a file called `x64.txt`, which is really a Lua script. The script identifies the machine's public IP, reads its C2 address from a smart contract on the Polygon blockchain, and uploads a **6.22 MB uncompressed 1920×1080 screenshot** to that address over HTTP. The same loader, contract and upload path also appear in the [Ashampoo campaign](/blog/ashampoo-campaign/).

| | |
|---|---|
| Sample | `Hytale-Examples-Plugin-v2.2.zip`, 573 KB |
| SHA-256 | `bf24500699aa3125dcb6caee165d71ffb3e37367bbd95824e8de7573987166e2` |
| Triage sample | `260911-syv6rsyvdw`, score 7/10, "Shows suspicious behavior" |
| Run A | win10v2004-20260513-en (593 s kernel, 563 s network) |
| Run B | win11-20260513-en (898 s kernel, 644 s network) |
| Packet capture | `win10_triage.pcapng`, 252,381 frames, 590.6 s, covers run A only |
| Triage tags | adware, persistence, defense_evasion, discovery, privilege_escalation, spyware, execution, trojan |

Triage also tags the run with persistence, privilege-escalation and defense-evasion techniques. None of those events come from the sample's own processes, and no autostart was found for it (see section 3).

## Concepts used in this sample

Three techniques appear in this sample, and each is easier to follow with a short definition.

- **Bundled interpreter.** LuaJIT is a small, fast, open-source implementation of the Lua scripting language. Shipping the interpreter inside the archive means the payload does not depend on anything installed on the victim's machine, and the script is just input to an ordinary, legitimate program. The copy shipped here is unsigned.
- **Disguised file type.** The script is named `x64.txt`. An extension is only a label, so `luajit.exe` runs the file regardless of what it is called, while a quick look at the folder suggests a text file. ATT&CK tracks this as T1036.008, Masquerade File Type.
- **Dead-drop resolver.** Instead of hardcoding a command-and-control address, malware can read it from a public service the attacker controls, such as a social post, a paste site or a blockchain smart contract. The address can then be changed without touching the malware, and the lookup looks like ordinary traffic to a legitimate service. ATT&CK tracks this as T1102.001.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Hytale plugin at a glance</div><div class="fig-sub">One interpreter, three network moves</div></div><div class="fig-draw" role="img" aria-label="Explorer opens the zip, cmd runs Launch.bat, luajit runs x64.txt, which looks up the IP, reads from a Polygon RPC node, and uploads a screenshot to two raw IP addresses over HTTP."><svg viewBox="0 0 520 426" width="520" height="426" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 316" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Zip opened</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">Explorer extracts the archive</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Launch.bat</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">cmd /C, a 30-byte batch file</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="142" r="3" style="fill:var(--accent)"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">luajit.exe x64.txt</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">Bundled interpreter runs a disguised Lua script</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Fingerprint</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">GET ip-api.com/json</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Resolve C2 on-chain</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">eth_call getData() on a Polygon contract</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="316" r="3" style="fill:var(--accent)"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Exfiltrate</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">POST a 6.22 MB BMP screenshot to two raw IPs</text><text x="34" y="354" font-size="12" style="fill:var(--ink-3)">DESTINATIONS</text><rect x="34" y="366" width="200" height="44" fill="none" stroke-width="1" stroke-dasharray="3 4" style="stroke:var(--line)"/><text x="46" y="385" font-size="14" style="fill:var(--ink)">89.169.12[.]245</text><text x="46" y="401" font-size="12" style="fill:var(--ink-3)">stalled</text><rect x="248" y="366" width="200" height="44" fill="none" stroke-width="1" style="stroke:var(--line)"/><text x="260" y="385" font-size="14" style="fill:var(--ink)">194.48.248[.]94</text><text x="260" y="401" font-size="12" style="fill:var(--ink-3)">200 OK</text></svg></div></figure>

## Indicators of compromise

### Files

| Path | Role | Note |
|---|---|---|
| `…\Temp\Hytale-Examples-Plugin-v2.2.zip` | Delivery archive | SHA-256 above, 573 KB |
| `…\Documents\Hytale-Examples-Plugin-v2.2\Launch.bat` | Launcher | 30 bytes, invoked by `cmd.exe /C` |
| `…\Documents\Hytale-Examples-Plugin-v2.2\luajit.exe` | Interpreter | 858 KB, legitimate LuaJIT build, unsigned |
| `…\Documents\Hytale-Examples-Plugin-v2.2\x64.txt` | Payload script | 300 KB, a Lua payload hidden behind a `.txt` extension |

The archive's files were extracted and run in place, so Triage's dynamic file inventory has no hashes for them and the individual files were not recovered. There are no self-copies in either run. The screenshot is built and streamed directly by `luajit.exe` and never appears as a file in Triage's inventory. Other entries in that inventory are Windows housekeeping, not sample files.

### Registry

The sample made no registry changes that can be attributed to it. None of the registry events in the report belong to `cmd.exe` or `luajit.exe`, and no Run or RunOnce value, service or other autostart in either run points at `luajit.exe`, `x64.txt` or `Launch.bat`. The persistence-related tags in Triage's list are therefore not backed by anything the sample did. This loader looks designed for a single smash-and-grab run, not for staying on the machine.

### Mutexes

None observed in either run. A mutex is a named lock that malware often uses to avoid running twice, and this sample shows no sign of one.

### Command lines

```text
C:\Windows\Explorer.exe /idlist,,C:\Users\Admin\AppData\Local\Temp\Hytale-Examples-Plugin-v2.2.zip
C:\Windows\System32\rundll32.exe C:\Windows\System32\shell32.dll,SHCreateLocalServerRunDll {9aa46009-3ce0-458a-a354-715610a075e6} -Embedding
"C:\Windows\System32\cmd.exe" /C "C:\Users\Admin\Documents\Hytale-Examples-Plugin-v2.2\Launch.bat"
luajit.exe x64.txt
```

Triage's `WriteProcessMemory` signature fires for `cmd.exe` → `luajit.exe`. The pair matches a parent starting a child process, and no injection was verified. The sample runs no reconnaissance commands: fingerprinting happens over HTTP, so a process-command-line view alone shows almost nothing of the behavior.

### Network

| Destination | Role |
|---|---|
| `ip-api.com` (208.95.112.1) | Public IP geolocation lookup (`GET /json/`) |
| `polygon.drpc.org` (104.18.10.59, 104.18.11.59) | Public Polygon JSON-RPC node, queried once; the reply is the C2 URL (dead drop) |
| `polygon.publicnode.com` (172.66.150.162) | Second Polygon RPC provider, run B only |
| `89.169.12[.]245` (Germany) | Upload target #1, plain HTTP, stalled after about 98 KB |
| `194.48.248[.]94` (Moldova) | Upload target #2, plain HTTP, upload accepted |
| `c.pki.goog` and Microsoft, DigiCert and Windows Update hosts | Certificate checks and background noise |

Neither raw IP has a reverse DNS name. The two Polygon RPC services are legitimate public infrastructure, so blocking them outright is not a sensible detection. The 136 MB Akamai flow in the capture is Windows Update, not the sample.

### Packet correlation

| Frames | Time (s) | Endpoint | Bytes | Phase |
|---|---|---|---|---|
| none | 0–109.35 | none | 0 | 1–3: no network activity |
| 62888–62895 | 109.35–109.49 | `ip-api.com:80` | 1,117 | 4 fingerprint |
| 62942–63050 | 113.67–118.75 | `89.169.12[.]245:80` | about 99 KB of 6.22 MB | 5 upload #1, stalled |
| 63053–63065 | 119.02–119.30 | `polygon.drpc.org:443` | 5.8 KB | 6 contract read |
| 63066–63078 | 119.44–119.88 | `c.pki.goog` | 7.3 KB | 6 PKI check |
| 63089–70212 | 120.36–124.99 | `194.48.248[.]94:80` | 6.61 MB | 7 upload #2, accepted |
| 70021 | 122.62 | POST `/api/NTE3YjdjNWU1NjYzNjU2YTA1N2Y=` | 6,221,670 declared | request |
| 70122 | 124.73 | 200 OK, `application/json` | 21 | `{"error":"not found"}` |
| 70209–70213 | 124.99 | all four streams | RST | 8 teardown |

### Cross-run consistency

**Identical on both runs:** the process chain (Explorer → shell host → `cmd.exe /C Launch.bat` → `luajit.exe x64.txt`), the domains and IPs the payload contacts, plain HTTP to both raw IPs, and the same three signatures on the sample's own chain (IP lookup via web service, command-shell one-liner, `WriteProcessMemory`).

**Different:** the `luajit.exe` PID; `polygon.publicnode.com` on Windows 11 only; and the packet capture, which exists for Windows 10 only.

The same four-process chain and domain set on two different Windows versions and sandbox images indicates deterministic logic.

## Execution flow

### 1. Execution timeline

Offsets are seconds from the start of the capture (2026-09-11 15:32:48 UTC). Frame numbers refer to `win10_triage.pcapng`.

1. **Archive opened.** Explorer opens the zip from the Temp folder: `C:\Windows\Explorer.exe /idlist,,C:\Users\Admin\AppData\Local\Temp\Hytale-Examples-Plugin-v2.2.zip`. There is no network traffic for the first 109 seconds. (T1204.002, User Execution)
2. **Batch launcher.** The archive is extracted to `Documents\Hytale-Examples-Plugin-v2.2\` and `cmd.exe /C "…\Launch.bat"` runs. The `rundll32 … SHCreateLocalServerRunDll` call beside it is Explorer's own COM host for browsing a zip, not sample activity. (T1059.003, Windows Command Shell)
3. **LuaJIT runs the disguised script.** `Launch.bat` runs `luajit.exe x64.txt`. The command line is identical on both runs (PID 3872 on Windows 10, PID 2320 on Windows 11). (T1059, T1036.008)
4. **Host fingerprinting.** One unauthenticated `GET /json/` to `ip-api.com` (frames 62888–62895, t+109.35 to 109.49 s). The response gives the sandbox's public IP, London and GB, and an ASN for a hosting provider. A payload can use this to decide whether the machine is worth attacking and where it sits. (T1016.001, Internet Connection Discovery)
5. **First upload attempt stalls.** A connection to `89.169.12[.]245:80` (Germany) starts the same multipart POST as step 7 (frames 62942–63050, t+113.67 to 118.75 s). About 98 KB of the declared 6.22 MB went out before the sandbox gateway began returning ICMP "Fragmentation Needed" messages (type 3, code 4, MTU 1376; 44 of them in the capture), and the transfer never finished. This pattern, a path-MTU black hole, happens when packets larger than a link's limit are dropped and the sender never adjusts. The cause is not established: the same stall appears against a different first host in the related Ashampoo sample, while the second host in each case accepts the full upload.
6. **On-chain C2 lookup.** A TLS session to `polygon.drpc.org` (frames 63053–63088, t+119.02 to 120.36 s) is a small request and response pair. The capture holds the exchange in readable form. The request is a standard Ethereum JSON-RPC read, `eth_call`, against a smart contract:

   ```json
   {"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc","data":"0x3bc5de30"},"latest"],"id":1}
   ```

   The selector `0x3bc5de30` is the function `getData()`. The reply is an ABI-encoded string that decodes to **`http://194.48.248.94`**, which is exactly the host that accepts the upload in step 7. The Windows 11 run also reaches `polygon.publicnode.com`, a second provider, which suggests a hardcoded provider list with failover. This is a confirmed dead-drop resolver: the C2 address lives on-chain and can be changed without touching the malware. (T1102.001)
7. **Screenshot uploaded.** A fresh connection to `194.48.248[.]94:80` (Moldova) carries `POST /api/NTE3YjdjNWU1NjYzNjU2YTA1N2Y=` (frames 63089–70212, t+120.36 to 124.99 s). It is a multipart upload with `Content-Length: 6221670`. The server replies **200 OK** with 21 bytes: `{"error":"not found"}`. The request was received and parsed, but the server did not recognise the identifier in the path. (T1113, Screen Capture; T1041, Exfiltration Over C2 Channel)
8. **Teardown.** All four sample-related TCP streams close with RST within a 40 ms window at t+124.988 s. That matches the sandbox ending its capture, not any cleanup by the sample.

The capture then runs to 590 s with only Windows background traffic (Windows Update, Office and other Microsoft services), about 190 MB of it.

#### What the upload contains

The multipart body decodes cleanly. The field is named `file`, the content type is `application/octet-stream`, and the filename is a 58-character random string. The content starts with the `BM` magic and a BITMAPINFOHEADER that decodes to **1920×1080 at 24 bits per pixel**. That is an uncompressed full-HD screen capture, not a log or credentials file. The 6,221,670-byte body is the 6,221,430-byte image plus about 240 bytes of multipart framing.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The exfiltrated screenshot</div><div class="fig-sub">Reassembled from the packet capture, downscaled</div></div><div class="fig-draw"><img src="/shared/img/hytale/exfil-screenshot.jpg" alt="Sandbox desktop with the extracted archive open in Explorer, listing Launch.bat, luajit.exe and x64.txt" width="1100" height="618" loading="lazy" /></div><div class="fig-cap">The shot shows the extracted archive in Explorer: <code>Launch.bat</code> (30 bytes), <code>luajit.exe</code> (858 KB) and <code>x64.txt</code> (300 KB). The Triage watermark is part of the sandbox wallpaper.</div></figure>

Two details about the request itself:

- **Browser impersonation.** Its `User-Agent` is Chrome 142 on Windows 10, so on the wire the upload resembles a browser upload.
- **An opaque identifier.** The path segment `NTE3YjdjNWU1NjYzNjU2YTA1N2Y=` is base64 for the 20-character string `517b7c5e5663656a057f`. Its meaning is unknown. It could be a victim ID, a campaign ID or a token, and the server's `not found` reply suggests it is looked up server-side.

### Sandbox tags and heuristics reviewed

This post does not review the sandbox's tags individually. Background Windows activity is separated from the sample in the Domains and Packet correlation sections above.

## Detection

- **Host:** a folder under `Documents` or `Downloads` containing `luajit.exe`, a `.txt` file next to it and a tiny `.bat`, and `luajit.exe` running with a `.txt` argument.
- **Behavior:** `cmd.exe` launching an interpreter that then calls `ip-api.com`, talks to a public blockchain RPC endpoint, and POSTs a multi-megabyte body to a raw IP over port 80.
- **Network:** a very large HTTP POST (about 6.2 MB) to an IP with no reverse DNS, with a `multipart/form-data` field named `file` and a Chrome 142 user agent from a process that is not a browser.
- **Contract:** any process that sends `eth_call` with `data` `0x3bc5de30` to `0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc` is this loader family. The same contract serves the Ashampoo Lua chain.
- **Hash:** `bf24500699aa3125dcb6caee165d71ffb3e37367bbd95824e8de7573987166e2` for the archive.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1204.002 User Execution: Malicious File | Plugin archive run by the user |
| Execution | T1059.003 Windows Command Shell | `Launch.bat` |
| Execution | T1059 Command and Scripting Interpreter | LuaJIT script `x64.txt` |
| Defense Evasion | T1036.008 Masquerade File Type | Analyst mapping, not in Triage's matrix |
| Discovery | T1016.001 Internet Connection Discovery | `ip-api.com/json/` |
| Command and Control | T1102.001 Dead Drop Resolver | C2 address read from the Polygon contract |
| Collection | T1113 Screen Capture | Analyst mapping: 1920×1080 BMP upload |
| Exfiltration | T1041 Exfiltration Over C2 Channel | Analyst mapping: POST of the screenshot |

Triage's own matrix also lists persistence and defense-evasion techniques; they are not counted here because none come from the sample's processes.

*Sources: Triage sample 260911-syv6rsyvdw (37 pages) and `win10_triage.pcapng`. Related: the [Ashampoo campaign](/blog/ashampoo-campaign/), where the same contract returned a different C2 on 26 September.*

## Confidence and limits

**Observed.** The process chain on both runs; the IP lookup; the `eth_call` to contract `0x1823A9a0…4bAdc` and its reply `http://194.48.248.94`; both HTTP POST attempts, including the complete upload to `194.48.248[.]94`, its declared length and its `200 {"error":"not found"}` reply; and the upload's content, a 1920×1080 24-bit BMP.

**Inferred.** That the stall on the first target is a network problem and not a block by the server (the cause is not established); that the first IP is a hardcoded fallback; and that the unrecognised identifier in the upload path reflects a missing session on the server side.

**Not established.** The contents of `x64.txt` and `Launch.bat`, any persistence for the sample, anything after the upload, and any stolen data other than the screenshot. Because the server did not recognise the request, what a registered victim would trigger next is unknown.
