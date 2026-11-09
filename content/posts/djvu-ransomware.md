---
title: "Djvu (.tisc): a ransomware sample that copies itself, locks its own folder and keeps asking for a key it never gets"
description: A walk through a 32-bit STOP/Djvu ransomware sample from my own lab report, Procmon, Regshot and Wireshark data. Covers the self-copy with a deny-delete ACL, the scheduled task and Run key, the failed key fetch against INetSim, why build2.exe and build3.exe are not real payloads, and corrections to my first report.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-27
---

*Analysis date: local detonation on 31 August 2026. My report (version 1) is dated the same day. This post re-checks that report against the Procmon log, the Regshot diff, the packet capture and the dropped files, so some details differ from the report. The differences are listed at the end.*

## Summary

`djvu.exe` is a 775,168-byte 32-bit Windows GUI executable from the STOP/Djvu ransomware family. It encrypted files with the extension `.tisc` and left a `_readme.txt` ransom note in each affected folder. Before encrypting, it copied itself into a GUID-named folder under `%LOCALAPPDATA%`, denied Everyone delete rights on that folder with `icacls`, and set up two ways to start again: a scheduled task and a Run key value called `SysHelper`.

**The two "payloads" it downloaded were not real.** My lab ran INetSim, which answers every request with a default response. `build2.exe` and `build3.exe` are the same 13,838-byte INetSim stand-in file, and the "C2 response" saved as `bowsakkdestx.txt` is INetSim's default web page. So I can describe how the malware asks for its key and payloads, but not what the real server would have sent back.

| | |
|---|---|
| Sample | `djvu.exe`, 775,168 B, PE32 GUI, i386 |
| SHA-256 | `4380c45fd46d1a63cffe4d37cf33b0710330a766b7700af86020a936cdd09cbe` |
| MD5 / SHA-1 | `7d208dd86e75c9c5900a85b08ef0b070` / `79a453d4e5403307b54205094ded4e5ff0382c71` |
| Header timestamp | 2021-04-08 06:10:32 UTC (can be forged, so I do not rely on it) |
| Environment | Windows 10 build 19041 VM, INetSim, no real internet. No hosted-sandbox report exists for this sample |
| Evidence | Procmon (read as strings), Regshot diff, Wireshark capture (4,563 frames, 1,210.8 s), dropped files, FLOSS, DetectItEasy |

A standalone execution-chain report with every path, command line and packet frame accompanies this post.

## Concepts used in this sample

- **STOP/Djvu.** A long-running family of file-encrypting ransomware sold to affiliates. Each wave uses a new file extension; this one uses `.tisc`.
- **Offline key.** When the malware cannot reach its server to fetch a per-victim key, public write-ups say it falls back to a key built into the program. Files encrypted that way are easier for researchers to help with. The ID in this note ends in `t1`, which those write-ups associate with this fallback. I have not confirmed that in the binary.
- **INetSim.** A tool that fakes internet services (DNS, HTTP, HTTPS) on a lab network. It answers every request with a canned page or file, so downloads in a lab like this are never the real thing.
- **Deny ACE for Everyone.** `icacls ... /deny *S-1-1-0:(OI)(CI)(DE,DC)` adds an access rule that forbids delete and delete-child for the Everyone group, on a folder and everything under it. It makes cleaning up the malware's own copy harder.
- **Run key and scheduled task.** Two standard Windows ways to start a program at logon or on a timer. The malware uses both for redundancy.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Djvu at a glance</div><div class="fig-sub">What the sample did in the lab, in order</div></div><div class="fig-draw" role="img" aria-label="Launch from Desktop, copy self and lock the folder, create a scheduled task and Run key, look up country, download two files and request a key from INetSim, write the personal ID, then encrypt files and drop _readme.txt."><svg viewBox="0 0 560 350" width="560" height="350" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 318" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Launch from the Desktop</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">Plain start, then a relaunch with --Admin IsNotAutoStart IsNotTask</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="84" r="3" style="fill:var(--accent)"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Copy itself and lock the folder</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">AppData\Local\b12df7dc-...\djvu.exe, icacls /deny Everyone delete</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="142" r="3" style="fill:var(--accent)"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Persist two ways</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">Scheduled task (--Task) and Run key SysHelper (--AutoStart)</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Look up country, fetch files and key</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">api.2ip.ua, znpst.top, securebiz.org. All answered by INetSim here</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Write the victim ID</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">C:\SystemID\PersonalID.txt</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="316" r="3" style="fill:var(--accent)"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Encrypt to .tisc, drop _readme.txt</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">Hundreds of files, including the analysis tools themselves</text></svg></div></figure>

## Indicators of compromise

### Files

Full paths. `w10analysis` is my lab user; the two GUID-style folder names were produced in this run.

| Path | Hash | Role |
|---|---|---|
| `C:\Users\w10analysis\Desktop\djvu.exe` | SHA-256 `4380c45f…cdd09cbe` | The sample as launched |
| `C:\Users\w10analysis\AppData\Local\b12df7dc-fca6-48df-96e0-f0cb3f42f98d\djvu.exe` | MD5 `7d208dd8…b0070` | Self-copy, byte-identical, folder ACL-locked |
| `C:\Users\w10analysis\AppData\Local\2e51dfb3-60f5-408a-8466-bfae3ce485d8\build2.exe` | SHA-256 `b7d8806e…baf9a6` | INetSim stand-in, not a payload |
| `C:\Users\w10analysis\AppData\Local\2e51dfb3-60f5-408a-8466-bfae3ce485d8\build3.exe` | same as build2.exe | Identical bytes |
| `C:\Users\w10analysis\AppData\Local\bowsakkdestx.txt` | MD5 `25d5ebf8…2d816d` | INetSim default HTML page, 268 B |
| `C:\SystemID\PersonalID.txt` | varies | Victim ID |
| `<folder>\_readme.txt` | MD5 `ec0883f1723d53dfe22aadf736f0a359` | Ransom note, in every affected folder |
| `<path>.tisc` | n/a | Encrypted files. 1,971 distinct paths in the Procmon string table (a lower bound) |

I leave out the thousands of files belonging to the Wireshark, Sysinternals, ProcDOT, Graphviz and x64dbg installs that were encrypted. They are victims, not attacker files. No exfiltration bundle was observed.

### Registry

| Key | Value | Purpose |
|---|---|---|
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tasks\{3CC4ECB8-6879-4D7C-B8B0-8BBEBABE4B7B}` | Path `\Time Trigger Task`; action `…\b12df7dc-…\djvu.exe --Task` | Scheduled-task persistence |
| `HKU\S-1-5-21-…-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | `SysHelper` = `"…\b12df7dc-…\djvu.exe" --AutoStart` | Run-key persistence |
| `HKU\S-1-5-21-…-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\SysHelper` | DWORD `1` | Marker value, purpose not proven |

### Mutexes

None observed. Procmon does not log mutex creation, so this is a gap in my tooling, not proof that the sample uses none.

### Command lines

Verbatim from the Procmon string dump.

```text
"C:\Users\w10analysis\Desktop\djvu.exe"
"C:\Users\w10analysis\Desktop\djvu.exe" --Admin IsNotAutoStart IsNotTask
icacls "C:\Users\w10analysis\AppData\Local\b12df7dc-fca6-48df-96e0-f0cb3f42f98d" /deny *S-1-1-0:(OI)(CI)(DE,DC)
"C:\Users\w10analysis\AppData\Local\b12df7dc-fca6-48df-96e0-f0cb3f42f98d\djvu.exe" --Task
"C:\Users\w10analysis\AppData\Local\b12df7dc-fca6-48df-96e0-f0cb3f42f98d\djvu.exe" --AutoStart
"C:\Users\w10analysis\AppData\Local\2e51dfb3-60f5-408a-8466-bfae3ce485d8\build2.exe"
"C:\Users\w10analysis\AppData\Local\2e51dfb3-60f5-408a-8466-bfae3ce485d8\build3.exe"
```

### Network

| Indicator | Role |
|---|---|
| `api.2ip.ua` | Public IP and country lookup over HTTPS |
| `znpst.top` | `GET /dl/build2.exe` (report v1 wrote `.org`, the capture says `.top`) |
| `securebiz.org` | `GET /fhsgtsspen6/get.php?pid=BF69A08D3585BE79BF727E5E3C1A256C&first=true` and `GET /files/1/build3.exe`, User-Agent `Microsoft Internet Explorer` |
| `manager@mailtemp.ch`, `supporthelp@airmail.cc` | Ransom contact addresses, from the note. Not contacted by the sample |

In the lab, all three domains resolved to the INetSim host `192.168.122.10`, so that address is not an indicator.

### Packet correlation

Victim-sourced frames from `djvu_wireshark.pcapng` (4,563 frames, 1,210.8 s), excluding SSDP.

| Frames | Endpoint | Bytes | Step |
|---|---|---|---|
| 17–3008 | `192.168.122.10:445` | about 39 MB | Analyst copies the sample over SMB (not malware) |
| 3237–3280 | `api.2ip.ua:443` | 6,637 | 4. Country lookup |
| 3281–3336 | `znpst.top`, `securebiz.org` :80 | 31,972 | 5. Downloads and key request |
| 3368–3397 | `securebiz.org:80` | 3,298 | 5. Key retries |
| 3801–3844 | `securebiz.org:80`, no `first=true` | 8,602 (frames 3770–3860) | 5. Later key retries |
| 3780, 4149 | `api.2ip.ua:443` | n/a | 4. Repeat lookups |

No frame carries file contents or the victim ID.

### Cross-run consistency

Single run. This post uses one full detonation (31 Aug 2026). An earlier capture from 30 Aug (`gateway_djvu.pcapng`, 2 GB) is not parsed, so I cannot say whether the GUID folder names or the `bowsakkdestx.txt` name change between runs.

## Execution flow

### 1. Static view

The file is a PE32 GUI executable with five sections (`.text`, `.rdata`, `.data`, `.rsrc`, `.reloc`). DetectItEasy flags the writable `.data` section as compressed, and that section holds most of the file (0x92600 of 775,168 bytes).

<figure class="art-fig"><div class="fig-head"><div class="fig-title">DetectItEasy, .data section</div><div class="fig-sub">DIE flags section 2 (.data) as compressed</div></div><div class="fig-draw"><img src="/shared/img/djvu/die-data-packed.png" alt="DetectItEasy output showing the .data section of djvu.exe flagged as packed" width="1336" height="209" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Section sizes</div><div class="fig-sub">Virtual and raw size of .data</div></div><div class="fig-draw"><img src="/shared/img/djvu/die-section-sizes.png" alt="DetectItEasy section table showing the .data virtual and raw sizes" width="578" height="170" loading="lazy" /></div></figure>

FLOSS shows long runs of nonsense lowercase syllables. I treat them as filler meant to confuse string-based tools. The imports `IsDebuggerPresent` and `GetTickCount` suggest anti-analysis checks, but I did not confirm either in this run.

### 2. A slow start

I noticed the sample was quiet for a long time before encrypting anything, and a second process with the same name and a different PID appeared later. The capture is consistent with that gap: the file reaches the VM over SMB at about 40 seconds and the first request from the sample is at 188 seconds. I cannot say how much of that is deliberate delay and how much is the time I took to launch it, because the Procmon dump has no timestamps.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">First process</div><div class="fig-sub">Process Explorer, shortly after launch</div></div><div class="fig-draw"><img src="/shared/img/djvu/proc-initial.png" alt="Process Explorer row for the first djvu.exe process" width="663" height="74" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Second process</div><div class="fig-sub">Same name, new PID, some time later</div></div><div class="fig-draw"><img src="/shared/img/djvu/proc-second.png" alt="Process Explorer rows showing a second djvu.exe process with a different PID" width="658" height="116" loading="lazy" /></div></figure>

### 3. Self-copy, lock-down and persistence

The sample copies itself to `%LOCALAPPDATA%\b12df7dc-…\djvu.exe`. The copy has the same MD5 as the original. It then runs `icacls` to deny Everyone delete and delete-child on that folder. I could not recover the order of the copy, the ACL change and the two persistence steps from a string dump, so the post lists them as a group.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Scheduled task</div><div class="fig-sub">Time Trigger Task running djvu.exe --Task</div></div><div class="fig-draw"><img src="/shared/img/djvu/sched-task.png" alt="Regshot diff showing the Time Trigger Task action with djvu.exe --Task" width="776" height="205" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Run key</div><div class="fig-sub">SysHelper value running djvu.exe --AutoStart</div></div><div class="fig-draw"><img src="/shared/img/djvu/run-key.png" alt="Regshot diff showing the SysHelper Run value with djvu.exe --AutoStart" width="857" height="253" loading="lazy" /></div></figure>

The scheduled task is named `Time Trigger Task`, with author `Author Name`, and its action decodes to the copy with `--Task`. The Run value `SysHelper` starts the copy with `--AutoStart`. The three argument names (`--Task`, `--AutoStart`, and `--Admin IsNotAutoStart IsNotTask` on the first run) show the program tracks how it was started.

### 4. Country lookup

At 188.3 s (frame 3237) the sample resolves `api.2ip.ua` and opens TLS to it. INetSim answers with a certificate; the client closes first, then INetSim sends a fatal *Decode Error* alert. The lookup is repeated at 794 s and 1,095 s.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">api.2ip.ua</div><div class="fig-sub">TLS to INetSim, aborted by the client</div></div><div class="fig-draw"><img src="/shared/img/djvu/tls-2ip.png" alt="Wireshark capture of TLS traffic to api.2ip.ua" width="1458" height="181" loading="lazy" /></div></figure>

The malware went on to download files within three seconds of the first failure. So this run shows the lookup being attempted and failing, and nothing more. It does not prove a "stop if the country is excluded" decision.

### 5. Downloads and the key request

Within about half a second the sample requests three things. Frame 3287 fetches `build2.exe` from `znpst.top`. Frame 3293 asks `securebiz.org` for a key, passing a 32-character hex `pid` and `first=true`. Frame 3323 fetches `build3.exe` from `securebiz.org`. INetSim returns 13,838 bytes for each executable and a 258-byte HTML page for the key request.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">GET /dl/build2.exe</div><div class="fig-sub">Request to znpst.top</div></div><div class="fig-draw"><img src="/shared/img/djvu/get-build2.png" alt="Wireshark packet detail of the HTTP GET for build2.exe" width="1458" height="506" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">get.php key request</div><div class="fig-sub">pid and first=true in the query string</div></div><div class="fig-draw"><img src="/shared/img/djvu/get-key.png" alt="Wireshark packet detail of the HTTP GET to securebiz.org get.php with a pid parameter" width="1465" height="591" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">GET /files/1/build3.exe</div><div class="fig-sub">Request to securebiz.org</div></div><div class="fig-draw"><img src="/shared/img/djvu/get-build3.png" alt="Wireshark packet detail of the HTTP GET for build3.exe" width="1456" height="612" loading="lazy" /></div></figure>

Both executables are run from `%LOCALAPPDATA%\2e51dfb3-…\`. Windows' Background Activity Monitor recorded both, which is how I know they ran. Because they are INetSim's stand-in file, I cannot say what the real ones would do.

The sample then asks for the key again about every five seconds, three more times with `first=true` and, around 795 to 810 s, four times without it.

### 6. Victim ID and encryption

`C:\SystemID\PersonalID.txt` is created with the machine's ID. The note's ID ends in `t1`, which fits the offline-key fallback after the failed key fetch.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">PersonalID.txt</div><div class="fig-sub">Contents of C:\SystemID\PersonalID.txt</div></div><div class="fig-draw"><img src="/shared/img/djvu/personalid-content.png" alt="Notepad showing the contents of PersonalID.txt" width="480" height="125" loading="lazy" /></div></figure>

Encryption then starts. Files get `.tisc` appended and a `_readme.txt` note is written to each folder, including the root of `C:\`, my user profile and `C:\binaries`. The sample encrypted my analysis tools and an earlier sample, `C:\binaries\wannacry\wannacry.exe`. It did not skip them.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Encrypted files and notes</div><div class="fig-sub">ProcDOT detail: hsin.txt renamed to hsin.txt.tisc, _readme.txt written in several folders</div></div><div class="fig-draw"><img src="/shared/img/djvu/encrypted-files.png" alt="ProcDOT detail showing important_docs hsin.txt renamed to hsin.txt.tisc and _readme.txt notes in C:, C:\binaries and C:\binaries\wannacry" width="1192" height="362" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">ProcDOT graph</div><div class="fig-sub">Launcher PID 6124. Boxes are files, ellipses are network endpoints</div></div><div class="fig-draw"><img src="/shared/img/djvu/procdot-graph.png" alt="ProcDOT graph of djvu.exe file, process and network activity" width="1031" height="627" loading="lazy" /></div></figure>

No packet in the capture carries file contents or the victim ID. Nothing leaves the VM except the requests in step 4 and 5. I recovered no command line that deletes shadow copies, but a string dump is weak evidence for something not happening.

The note asks for $980, or $490 if the victim writes within 72 hours, and offers to decrypt one file for free.

### Sandbox tags and heuristics reviewed

- `cmd.exe /s /k pushd "%V"` and `powershell.exe -noexit -command Set-Location -literalPath '%V'` in Procmon are Explorer's "open here" shell-verb definitions, not spawned processes.
- The Google updater `--system --windows-service` lines are the updater service.
- Dozens of `authrootstl.cab` requests to `ctldl.windowsupdate.com` and the `settings-win.data.microsoft.com` TLS sessions are Windows certificate-list fetches and telemetry.
- A `BITS\Start` change from 3 to 2 and a `WerFault.exe` BAM entry appear in the Regshot diff. I did not attribute either to the sample.
- `239.255.255.250:1900` (SSDP) is background noise.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">HTTP hosts seen</div><div class="fig-sub">Wireshark statistics. 239.255.255.250:1900 is SSDP noise</div></div><div class="fig-draw"><img src="/shared/img/djvu/http-stats.png" alt="Wireshark HTTP request statistics table" width="904" height="107" loading="lazy" /></div></figure>

## Detection

- **Folder ACL.** A process running `icacls <path> /deny *S-1-1-0:(OI)(CI)(DE,DC)` against a folder under `%LOCALAPPDATA%` is a strong signal. Few legitimate programs deny Everyone delete rights on their own folder.
- **Run value `SysHelper`** under `HKCU\...\Run` pointing into `%LOCALAPPDATA%\<GUID>\`.
- **Scheduled task `Time Trigger Task`** whose action is an executable in a GUID-named `%LOCALAPPDATA%` folder with the argument `--Task`.
- **Command-line flags** `--AutoStart`, `--Task`, `--Admin IsNotAutoStart IsNotTask`.
- **Folder `C:\SystemID\`** containing `PersonalID.txt`.
- **File names:** `_readme.txt` created in many folders in a short time, and renames to `*.tisc`.
- **Network:** requests to `/fhsgtsspen6/get.php?pid=` or `/files/1/build3.exe` with User-Agent `Microsoft Internet Explorer`, and TLS SNI `api.2ip.ua` from a process that is not a browser.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1204.002 User Execution: Malicious File | Launched from the Desktop |
| Persistence | T1053.005 Scheduled Task | `Time Trigger Task`, `--Task` |
| Persistence | T1547.001 Registry Run Keys | `SysHelper`, `--AutoStart` |
| Defense Evasion | T1222.001 File and Directory Permissions Modification | `icacls /deny *S-1-1-0` |
| Defense Evasion | T1036.005 Match Legitimate Name or Location | `SysHelper` Run value |
| Discovery | T1614 System Location Discovery | `api.2ip.ua` lookup |
| Command and Control | T1105 Ingress Tool Transfer | `build2.exe`, `build3.exe` requests (stand-ins here) |
| Command and Control | T1071.001 Web Protocols | `get.php` key request |
| Impact | T1486 Data Encrypted for Impact | `.tisc` files, `_readme.txt` |

I did not tag T1490 (Inhibit System Recovery) because I saw no evidence for it. T1497/T1622 (debugger checks) would be a guess from the import table alone.

## Confidence and limits

**Observed.** The self-copy, the `icacls` command, the scheduled task and Run key, the three domains and the request paths, the INetSim-sourced downloads, the `.tisc` encryption and the ransom note.

**Inferred.** The order of the host-side steps (the Procmon dump has no timestamps), and the `t1` offline-key reading, which comes from public descriptions of the family and not from my own reverse engineering.

**Not established.** Whether the folder GUIDs or the random `bowsakkdestx.txt` name change between runs (one full run is parsed; the 30 Aug capture is not). What the real `build2.exe`, `build3.exe` and key reply contain, because the real C2 was never reached. Encryption speed and duration. Mutexes, shadow-copy commands and exfiltration were not observed, which reflects what I captured and is not proof of absence.

### Corrections to earlier reports

| Report v1 | What the data shows |
|---|---|
| Payload host `znpst.org` | `znpst.top` in DNS and the HTTP Host header |
| File size 5,165,056 bytes | 775,168 bytes on disk |
| `build2.exe`, `build3.exe` "possibly auxiliary executables", sample unobtainable | Same 13,838-byte INetSim stand-in, recovered |
| `bowsakkdestx.txt` "contains the response from the C2 server" | INetSim's default page, not C2 content |
| `api.2ip.ua` "decides whether to proceed" | Lookup failed twice and the sample continued |
| Process list shows only `--Task` | Also `--AutoStart`, `--Admin IsNotAutoStart IsNotTask` and the `icacls` command |
| Mutex section blank | None observed; Procmon cannot show them |
| "No PE resources", but a `.rsrc` section exists | Not yet reconciled |
