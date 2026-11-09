---
title: "BtwStealer: fake VRChat mods that steal browser data and report to Discord"
description: Seven "mods" from chilloutvrmodded[.]net turned out to be one launcher that stages an embedded Python stealer and exfiltrates to Discord, GoFile and Catbox. Execution chain from four sandbox runs, two packet captures and a local run with the webhook recovered.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-23
---

*Analysis dates: 2 September 2026, updated 3 September. The findings combine two Triage submissions (four sandbox runs), two packet captures and a local run with TLS interception. The site was first flagged in a video by Eric Parker, who pointed out that the "VRChat mods" it hosts are malware.*

## Summary

| | |
|---|---|
| Sample | `chilloutvrmodded_launcher.bnuy` (run as `ChillOutVRMods.exe` / `chilloutvrmodded_launcher.exe`), 9,793,536 B PE, 80.6 MB (76.84 MiB) on disk with overlay |
| SHA-256 | `70a0b041d945a1d26a65ae366537e5de7353f0a4b0b0c9abcbfe9eb6cfa8d44b` |
| SHA-1 | `468fad5fb87ed3a2716dc0cf3feec495bf18b6dd` |
| Source | `chilloutvrmodded[.]net`, posing as mods for VRChat |
| Triage submissions | `260902-p413esyset` and `260903-enhk2aeg96`, both scored 8/10, "Likely malicious" |
| Four runs | 02 Sep win11ltsc2024-20260709-en (568 s kernel / 461 s network) · 02 Sep win10v2004-20260513-en (899 s / 517 s) · 03 Sep win10v2004-20260513-en (487 s / 485 s) · 03 Sep win11-20260513-en (492 s / 490 s) |
| Packet captures | `260902-p413esyset-behavioral2.pcap` (31 k packets, 573.9 s, victim 10.127.0.13) and `260902-p413esyset-behavioral3.pcap` (36 k packets, 485 s) |
| Local run | REMnux/INetSim run with TLS interception (section 9) |
| Triage tags | stealer, spyware, discovery, execution, defense_evasion, persistence (first run only), plus a false-positive `ransomware` |

The launcher copies itself, fingerprints the host, takes a screenshot, installs a portable Python runtime and runs a script called `browser_forensics.py`. The payload names itself **btwStealer**. It force-closes eight browsers, decrypts Chrome and Edge secrets through Windows DPAPI, zips the loot, and sends it to a Discord webhook, GoFile and Catbox. It then runs a second time from its own Desktop copy.

## Concepts used in this sample

Four techniques recur through this sample, and each is easier to follow with a short definition.

- **Discord webhook as C2.** A webhook is a URL that lets anyone who holds it post messages and files into a Discord channel, with no login. Attackers use it as a free command-and-control and exfiltration endpoint: the traffic is ordinary HTTPS to `discord.com`, which most networks allow. Anyone who obtains the URL can also post to it or delete it.
- **DPAPI.** The Windows Data Protection API encrypts data with a key tied to the user's login. Chrome and Edge wrap the master key of their password and cookie databases with it, so any process running as that user can call `Unprotect`, recover the key, and decrypt the databases. That is what the stealer's PowerShell commands do.
- **Closing browsers first.** Browsers keep their profile databases locked while running. Killing them releases the locks so the files can be copied (T1555.003, Credentials from Web Browsers).
- **Runtime bootstrap.** The launcher is small on its logic and downloads a portable Python interpreter and libraries from public package servers at run time. That keeps the dropped binary free of stealer code, and the stealer itself is plain-text Python.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">btwStealer at a glance</div><div class="fig-sub">Eight phases, three exfiltration channels</div></div><div class="fig-draw" role="img" aria-label="Self-replicate, fingerprint, check in, bootstrap Python, steal browser data, target wallets and messengers, attempt persistence, clean up, then repeat from the Desktop copy. Data leaves through discord.com, gofile.io and catbox.moe."><svg viewBox="0 0 520 544" width="520" height="544" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 432" fill="none" stroke-width="1" style="stroke:var(--line)"/><path d="M19 432 H506 V26 H19" fill="none" stroke-width="1" stroke-dasharray="3 4" style="stroke:var(--ink-4)"/><path d="M25 22.5 L19 26 L25 29.5" fill="none" stroke-width="1" style="stroke:var(--ink-4)"/><text x="498" y="229" font-size="12" text-anchor="middle" transform="rotate(90 498 229)" style="fill:var(--ink-3)">second pass from the Desktop copy</text><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Self-replicate</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">Copy to Desktop, drop a random-name exe</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Fingerprint</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">VBScript VM check, CPU and locale, screenshot</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Check-in</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">ipinfo.io lookup, Discord "New Execution"</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Python bootstrap</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">Portable python.exe, pip install</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Browser theft</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">Kill 8 browsers, DPAPI decrypt, zip and upload</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Wallets and messengers</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">Kill Exodus and Telegram</text><circle cx="11" cy="374" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="372" font-size="15" style="fill:var(--ink)">Persistence attempt</text><text x="34" y="390" font-size="13" style="fill:var(--ink-3)">Task Scheduler opened, no task created</text><circle cx="11" cy="432" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="432" r="3" style="fill:var(--accent)"/><text x="34" y="430" font-size="15" style="fill:var(--ink)">Cleanup</text><text x="34" y="448" font-size="13" style="fill:var(--ink-3)">Opens its own debug log</text><text x="34" y="472" font-size="12" style="fill:var(--ink-3)">EXFIL CHANNELS</text><rect x="34" y="484" width="140" height="44" fill="none" stroke-width="1" style="stroke:var(--line)"/><text x="46" y="503" font-size="14" style="fill:var(--ink)">discord.com</text><text x="46" y="519" font-size="12" style="fill:var(--ink-3)">webhook</text><rect x="188" y="484" width="140" height="44" fill="none" stroke-width="1" style="stroke:var(--line)"/><text x="200" y="503" font-size="14" style="fill:var(--ink)">gofile.io</text><text x="200" y="519" font-size="12" style="fill:var(--ink-3)">4 nodes</text><rect x="342" y="484" width="140" height="44" fill="none" stroke-width="1" style="stroke:var(--line)"/><text x="354" y="503" font-size="14" style="fill:var(--ink)">catbox.moe</text><text x="354" y="519" font-size="12" style="fill:var(--ink-3)">fallback</text></svg></div></figure>

## Indicators of compromise

### Files

Hundreds of stock `pycryptodome`, `pywin32`, `setuptools` and `pip` files under `WinGet\tools\Lib\` are omitted as legitimate library code.

| Group | Path | Note |
|---|---|---|
| Self-copies | `…\Temp\chilloutvrmodded_launcher.exe` | Initial dropped sample |
| Self-copies | `…\Desktop\chilloutvrmodded\chilloutvrmodded_launcher.exe` | Seeds the second pass |
| Self-copies | `…\Temp\<8 random chars>.exe` | See section 8 for the names seen per run |
| Anti-analysis | `…\Temp\system_check_<13 digits>.vbs` | One per pass. SHA-256 of `system_check_1788353686132.vbs`: `600663b0860f7c0f136c9a9fb273d878feea20ba12222e68742da5ff7d18ccb4` (MD5 `4643adec6d6b0b4eaca527dba8bf6c08`) |
| Runtime | `…\Temp\WinGet\tools\python.exe` | SHA-256 `94a83686261e9364cf3386b61a01a9f70936e8547da8962d16f1f850226b8954`, identical in both Triage submissions. Legitimate binary, abused |
| Runtime | `…\WinGet\tools\python310.dll`, `VCRUNTIME140.dll` | SHA-256 `f281c2e2…8ed8`, `e1d6f78a…fa4e` |
| Payload | `…\Local\btwStealer-local\output\browser_forensics.py` | The stealer script. Triage's file lists contain no hash for it. |
| Harvest | `…\output\Browser-Datas\chrome\default\passwords.txt` | SHA-256 `de1de509b079d79461dba95b1abb857faab70698ca9a8e1fc562ca647b1debd4` |
| Harvest | `…\output\Browser-Datas\edge\default\cookies.txt` | SHA-256 `b7d3c8a38a720a64dc14ac011c2a4ed8ebcc71a5e82ed9fe8607c801b66d6b0d` |
| Staging | `…\Temp\Cookies`, `History`, `Web Data`, `places.sqlite`, `cookies.sqlite` | Raw browser database copies |
| Exfil bundle | `…\Temp\btwStealerLOG_<13 digits>.zip` | One per pass. Nine bundles across the two submissions, each with a different hash |
| Logs | `…\btwStealer-local\output\python_stdout.txt` | SHA-256 `c745004ae94db18150583de78e6826f9ddd6f628849f22787d939ad4f027da46`, identical in both submissions |
| Logs | `…\Desktop\chilloutvrmodded\btwStealer_debug_log.txt` | Opened in Notepad at the end of the run |

Local runs also recorded the Desktop self-copy `ChillOutVRMods.exe` with MD5 `4ee07e6c1f3212b7981323f4f7ff15e` and a randomised-name copy `1anw2stl.exe` with MD5 `f4109f42789a7bce1ace3a2ba786ff3b`. Those two names and hashes come from the local runs and do not appear in either Triage report.

### Registry

**No autostart was written.** The `persistence` tag traces to the Task Scheduler activity in phase 6, not to a captured registry write. The local Regshot diff agrees.

| Key | Purpose |
|---|---|
| `HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0…7` | Counts logical cores |
| `…\CentralProcessor\<0-7>\~MHz` | Clock-speed check, a common VM tell |
| `…\CentralProcessor\<0-7>\ProcessorNameString` | Checked for VM-associated strings |
| `HKCU\Control Panel\International\Geo\Nation` | Locale geofencing, cross-checked against `ipinfo.io` |
| `HKLM\SOFTWARE\Classes\CLSID\{B4BFCC3A-DB2C-424C-B029-7FE99A87C641}\Instance\` | Created by `notepad.exe` when it opens the debug log. Benign shell side effect. |

The dropped `system_check_*.vbs` script is what queries these keys, as the VM and region check.

### Mutexes

Neither Triage run reported a mutex. The sample does not appear to enforce a single instance, which fits the observation that each self-copy runs its own full chain.

### Command lines

The distinct commands from the win11 run, in order (steps 18 to 27 repeat them for the second pass):

```text
powershell -windowstyle hidden -command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing;
  $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; … CopyFromScreen … $bmp.Save($ms,Png);
  [Console]::OpenStandardOutput().Write($ms.ToArray(),0,$ms.Length)"        # screenshot to stdout
cscript.exe //nologo "…\Temp\system_check_1788353686132.vbs"                 # anti-analysis check
cmd /c "ver"                                                                  # x3, environment probe
…\WinGet\tools\python.exe -m pip install pycryptodome | pywin32 | PythonForWindows
…\WinGet\tools\python.exe "…\btwStealer-local\output\browser_forensics.py"   # the stealer
tasklist /FO CSV /NH
taskkill /F /IM chrome.exe | brave.exe | msedge.exe | opera.exe | firefox.exe
                           | vivaldi.exe | QQBrowser.exe | 360chrome.exe     # release profile locks
powershell -command "… ProtectedData]::Unprotect(FromBase64String('<Chrome blob>'),$null,CurrentUser)"
powershell -command "… ProtectedData]::Unprotect(FromBase64String('<Edge blob>'),$null,CurrentUser)"
taskkill /IM Exodus.exe /F ; taskkill /IM Telegram.exe /F                     # wallet and messenger
rundll32.exe shell32.dll,SHCreateLocalServerRunDll {9aa46009-3ce0-458a-a354-715610a075e6} -Embedding
mmc.exe "C:\Windows\system32\taskschd.msc" /s                                 # persistence attempt
notepad.exe "…\Desktop\chilloutvrmodded\btwStealer_debug_log.txt"
```

### Network

| Domain | Category | Role |
|---|---|---|
| `discord.com` | C2 channel | Webhook used for beacons, screenshots and the ZIP. Recovered in section 9. |
| `api.gofile.io` and GoFile storage nodes | Exfiltration | Upload targets for the `btwStealerLOG` bundles. Nodes seen: `store-eu-par-1`, `store-eu-par-5`, `store5`, `store-eu-par-7` in the Triage pcaps, and `store1` to `store4` in the local run. |
| `catbox.moe` | Exfiltration | Anonymous-upload fallback mirror, seen only in section 9 |
| `ipinfo.io` | Fingerprinting | Victim IP and geolocation, queried before each exfil push |
| `pypi.org`, `files.pythonhosted.org`, `globalcdn.nuget.org` | Legitimate | Package sources for the pip installs |
| `google.com`, `cloudflare.com`, `c.pki.goog`, `fd.api.iris.microsoft.com` | Background | Routine noise |

### Packet correlation

Byte counts are client-to-server payload on each TLS session in `260902-p413esyset-behavioral2.pcap`. Content is unreadable without a key log, but size separates a check-in from a bulk push. Section 9 confirms what the sessions held.

| Frames | t (s) | Endpoint | Client → server | Phase |
|---|---|---|---|---|
| 245–266 | 14.65 | `ipinfo.io` | 1.1 KB | 2 Recon |
| 268–303 | 14.99 | `discord.com` check-in | 1.8 KB | 2 Recon |
| 336–1116 | 22.15 | `discord.com` bulk | **572 KB** | 2 Recon |
| 1126–28481 | 28 to 39 | nuget / pypi / pythonhosted | pip traffic | 3 Bootstrap |
| 28484–28498 | 52.82 | `ipinfo.io` | 1.3 KB | 4 Theft |
| 28499–28522 | 53.72 | `discord.com` check-in | 5.9 KB | 4 Theft |
| 28549–28589 | 54.23 | `store-eu-par-1.gofile.io` | 9.8 KB | 4 Exfil #1 |
| 28620–29310 | 56.53 | `discord.com` bulk | 557 KB | 4 Theft |
| 29508–29687 | 256 to 314 | Microsoft / DigiCert | background | 5/6 silent |
| 29709–29751 | 325 to 326 | `ipinfo.io`, `discord.com` | 1.1 KB, 1.9 KB | 7 Second pass |
| 29756–30303 | 327.09 | `discord.com` bulk | 418 KB | 7 Second pass |
| 30367–30406 | 337.39 | `store-eu-par-5.gofile.io` | 9.5 KB | 7 Exfil #2 |
| 30445–30981 | 339.65 | `discord.com` bulk | 404 KB | 7 Second pass |

In total that is two GoFile uploads (19.2 KB) and four Discord bulk uploads (1.86 MB).

The second capture, `behavioral3.pcap`, was taken on 3 September (14:09 to 14:17, 485 s, matching the second Triage submission's win10 run) and repeats the pattern at different times:

| t (s) | Endpoint | Pass |
|---|---|---|
| 12.1 to 13.9 | `ipinfo.io`, `discord.com` ×2 | 1st: recon check-in |
| 45.5 to 48.8 | `ipinfo.io`, `discord.com`, `api.gofile.io`, `store5.gofile.io`, `ipinfo.io`, `discord.com` ×2 | 1st: exfil |
| 123.5 to 124.6 | `ipinfo.io`, `discord.com` ×2 | 2nd: recon check-in |
| 132.3 to 135.2 | `ipinfo.io`, `discord.com`, `api.gofile.io`, `store-eu-par-7.gofile.io`, `ipinfo.io`, `discord.com` ×2 | 2nd: exfil |

The same order appears in both captures: IP lookup, Discord check-in, GoFile API call, GoFile upload, then Discord pushes.

### Cross-run consistency

All four runs reproduce the same eight-phase sequence. Only the random names differ, which makes this deterministic behavior rather than a sandbox artifact.

| Run | Random self-copies | `system_check_*.vbs` |
|---|---|---|
| 02 Sep win10v2004 | `uvvkuqac`, `oxa2ja4j`, `xvspgbca` | `1788353674302`, `1788353807619`, `1788353882500` |
| 02 Sep win11ltsc2024 | `5crx5ly4`, `yr1ojvjd` | `1788353686132`, `1788353989159` |
| 03 Sep submission (win10 and win11) | `0opjiugn`, `4ca1lqci`, `ekwppugv`, `yezxlhsy` | `1788444598939` |

What stays fixed: the `python.exe`, `python310.dll`, `VCRUNTIME140.dll` and `python_stdout.txt` hashes, the `btwStealer-local\output\` paths, and the command sequence. What varies: the self-copy names, the 13-digit timestamps in the VBScript and ZIP names, and every ZIP hash.

## Execution flow

### 1. The lure

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The landing page</div><div class="fig-sub">chilloutvrmodded[.]net</div></div><div class="fig-draw"><img src="/shared/img/chilloutvr/landing.jpg" alt="Landing page of chilloutvrmodded.net: Unlock the Power of ChilloutVR Mod, 120,000+ users, 10 premium mods" width="1200" height="567" loading="lazy" /></div><div class="fig-cap">Neon blue-purple styling, "120,000+ users" and "10 Premium Mods".</div></figure>

Five signs show the site is not what it claims to be:

- **It looks generated.** The neon blue-purple buttons and fonts are typical of AI-built landing pages.
- **The domain is new.** urlscan shows the domain was created on **6 June 2026** (registrar Name.com), and the TLS certificate was issued by "YE2" on 5 August 2026, valid for three months. Yet the newest "mod" on the page is dated **2026-02-01**, months before the domain existed.
- **Cheap, temporary hosting.** It resolves to `35.157.26.135`, AMAZON-02 (AS16509) in Frankfurt am Main, most likely AWS.
- **The claims don't match the downloads.** The page boasts "120,000+ users" and "10 Premium Mods", but the download contains seven files.
- **Every download is the same file.** All seven had the same size (80.6 MB) and a 7 Jun 2026 date, with different names: launcher, comfortcontrols, erp, performance, socialhub, worldexplorer, visualenhancer. They share one SHA-256, so one binary is shipped under seven mod names.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Domain and hosting evidence</div><div class="fig-sub">urlscan.io</div></div><div class="fig-draw"><img src="/shared/img/chilloutvr/domain-info.jpg" alt="urlscan live information: DNS A record 35.157.26.135, AS16509 Amazon-02, domain created June 6th 2026" width="708" height="131" loading="lazy" /></div><div class="fig-cap">The domain was registered on 6 June 2026 on AWS address space.</div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">One file, seven names</div><div class="fig-sub">All downloads, as extracted</div></div><div class="fig-draw"><img src="/shared/img/chilloutvr/file-list.jpg" alt="File listing of seven chilloutvrmodded .bnuy files, each 80.6 MB and dated 7 Jun 2026" width="744" height="444" loading="lazy" /></div><div class="fig-cap">Identical size and date, identical SHA-256.</div></figure>

### 2. Execution timeline

Reconstructed from the 02 Sep win11 run (behavioral2), the more complete trace. Packet numbers cite `260902-p413esyset-behavioral2.pcap`; the full mapping is in section 7.

1. **Initial execution and self-replication.** The launcher copies itself to `%USERPROFILE%\Desktop\chilloutvrmodded\` and drops a second executable under a random name (`5crx5ly4.exe`). No network traffic. (T1027)
2. **Reconnaissance and fingerprinting.** `cmd.exe → powershell.exe` captures the desktop as a PNG to stdout. `cscript.exe` runs a dropped VBScript, `system_check_<13 digits>.vbs`. The registry is queried for CPU and locale. Then:
   - `ipinfo.io` lookup (pkt 245–266)
   - first `discord.com` check-in, 1.8 KB (pkt 268–303)
   - a 572 KB bulk upload to `discord.com` on one TLS session (pkt 336–1116), far past webhook-ping size

   (T1059.001, T1059.005, T1012, T1082, T1113)
3. **Python bootstrap.** It drops `python.exe` to `%TEMP%\WinGet\tools\` and runs `pip install pycryptodome pywin32 PythonForWindows`, pulling from `globalcdn.nuget.org`, `pypi.org` and `files.pythonhosted.org`. Three `cmd /c "ver"` probes run first. (T1059.006)
4. **Browser credential and cookie theft.** `browser_forensics.py` runs from `%LOCALAPPDATA%\btwStealer-local\output\`. It enumerates processes, force-kills Chrome, Brave, Edge, Opera, Firefox, Vivaldi, QQBrowser and 360Chrome, then calls DPAPI `ProtectedData.Unprotect` against the Chrome and Edge master-key blobs. It writes `passwords.txt` and `cookies.txt` and copies `Cookies`, `History`, `Web Data` and `places.sqlite`. Then it uploads:
   - `ipinfo.io` and a `discord.com` check-in
   - first exfil: `api.gofile.io` → `store-eu-par-1.gofile.io`, 9.8 KB
   - a second bulk upload to Discord, 557 KB

   (T1555.003, T1552.001, T1217, T1005, T1102)
5. **Wallet and messenger targeting.** `taskkill /IM Exodus.exe /F`, a second screenshot, then `taskkill /IM Telegram.exe /F`. No malicious traffic over this ~200 s window (t ≈ 57 to 256 s); the packets are Windows and DigiCert noise. The kills are host-local. (T1057)
6. **Persistence attempt.** `rundll32.exe shell32.dll,SHCreateLocalServerRunDll {9aa46009-3ce0-458a-a354-715610a075e6} -Embedding`, then `mmc.exe taskschd.msc /s`. No scheduled task or registry write was captured. (T1053)
7. **Second pass.** The Desktop copy fires independently, drops `yr1ojvjd.exe`, and repeats phases 1 to 4. It adds a third bulk Discord upload (418 KB), a second GoFile exfil to `store-eu-par-5.gofile.io` (9.5 KB), and a fourth Discord upload (404 KB).
8. **Cleanup and log exposure.** `notepad.exe` opens `btwStealer_debug_log.txt`. The sandbox flagged this as a "likely ransom note", but the content is the stealer's own debug output. **No file encryption was observed.**

### Sandbox tags and heuristics reviewed

| Triage signature | Verdict |
|---|---|
| Reads user/profile data of web browsers · Browser Information Discovery | **Supported.** Browser kills, DPAPI calls, `passwords.txt` and `cookies.txt`. |
| Looks up external IP address via web service · Contacts third-party web service commonly abused for C2 | **Supported.** `ipinfo.io` and `discord.com`. |
| Executes a VBScript via Windows Script Host · Command and Scripting Interpreter: PowerShell | **Supported.** `cscript.exe` and the screenshot and DPAPI PowerShell commands. |
| Kills process with taskkill · Discovers running processes | **Supported.** The `tasklist` and `taskkill` sweeps. |
| Uses Task Scheduler COM API (persistence tag) | **Weak.** Only `SHCreateLocalServerRunDll` and the MMC snap-in were seen; no task was registered. The second Triage submission shows `rundll32` without the `mmc` step and carries no persistence tag. |
| Drops file in System32 directory | **False positive.** The only entry is `mmc.exe` opening `taskschd.msc` ("file opened for modification"), a stock Windows file. |
| Opens file in notepad (likely ransom note) · `ransomware` tag | **False positive.** It is the stealer's debug log; the tag comes from this plus the mass `taskkill`. |
| Suspicious use of WriteProcessMemory | **Unclear.** The listed pairs line up with parent-to-child process launches (Desktop launcher → `yr1ojvjd.exe` → `cmd.exe` → `taskkill.exe`). Injection was not verified. |
| SetWindowsHookEx · GetForegroundWindowSpam · FindShellTrayWindow | **Not corroborated.** No supporting evidence in the available logs. |
| Obfuscated Files or Information: Command Obfuscation | **Plausible.** The Base64-wrapped DPAPI PowerShell and stdout screenshot piping fit. |

Triage's own ATT&CK matrix for the first run lists T1059.001, T1059.003, T1059.005, T1027.010, T1555.003, T1552.001, T1217, T1057, T1012, T1082, T1016.001, T1005 and T1102.

## Reverse engineering notes

### Static findings

Loaded into Detect It Easy, the launcher is:

- **One PE64 GUI executable**, MSVC 19.36 / Visual Studio 2022 v17.6 (linker 14.36.33811), C++. Triage's static check flags it as an **unsigned PE**.
- **Heavily padded.** DIE reports "Compressed or packed data [strange overlay]". The overlay starts at offset `0x00939c00` and is `0x0439e67b` bytes (about 71.4 MB), roughly eight times the 9.34 MiB PE image. DIE labels the overlay plain text with CRLF line endings, and Extract finds embedded PE64 and PE32 images and a handful of GZIP streams inside it. FLOSS produced nothing because the file was too large. The overlay was not unpacked, so what it holds (the Python runtime, wheels and scripts, most likely) is an inference from what gets dropped later.
- **An embedded DLL in `.rsrc`.** It is resource #2, an `RT_RCDATA` entry named `MINIDUMP_EMBEDDED_AUXILIARY_PROVIDER` at offset `0x007ea7d8` (size `0x146c10`, 1,347,584 B once dumped). It is a 64-bit MSVC DLL with a Windows Authenticode (PKCS #7) signature and a PDB link. Two sibling resources are named `CLRDEBUGINFO` and `CLRDEBUGINFOWINDOWSAMD64`. These names are debugging-support resources, not stealer logic, and the DLL's role is unproven either way. SHA-256 `6c52462719dc63e935b967f796df5e4d91b07d85792529d488455bf5d5a6e6a8`.
- **No networking imports.** The import table lists 17 DLLs: KERNEL32, ADVAPI32, ole32, OLEAUT32, USER32, SHELL32 and 11 `api-ms-win-crt-*` forwarders. DIE gives DLL names only, no per-function names. All C2 traffic therefore comes from the dropped runtime, not the native binary.
- **Packaging.** Earlier static work on sibling binaries in this campaign pointed to a pkg-packaged Node.js app. That detail matters for the TLS interception problem in section 9.

### Recovering the webhook and exfil content

Triage's pcaps could not be decrypted, so their Discord and GoFile sessions were sized but never read. This section covers a local detonation of the same launcher in a REMnux/INetSim lab, where INetSim acted as the TLS endpoint for `discord.com`, `gofile.io` and `catbox.moe`. Every request was then logged in cleartext on the server side, so no key log was needed.

The decryption took three capture attempts:

| Capture | Approach | Result |
|---|---|---|
| `remnux.pcapng` | Imported INetSim's certificate as a trusted root | Full ClientHello and ServerHello, then the client sent a clean `FIN` with **no TLS alert**. Every session failed. |
| `remnux2.pcapng` | `NODE_EXTRA_CA_CERTS` pointing at INetSim's cert | Identical failure. CA trust was not the blocker. |
| `remnux3.pcapng` | `NODE_TLS_REJECT_UNAUTHORIZED=0` machine-wide | Handshake completed. Streams carried real payload (one reached ~120 KB). |

The root cause: INetSim serves one static certificate (`CN=inetsim.org`, **no SubjectAltName**) for every hostname. Modern TLS clients, Node included, require a SAN match, so no amount of CA trust could ever have worked. That the client dies silently in application code, with a `FIN` and no alert, also fits the Node.js packaging noted earlier.

**The webhook.** The full Discord webhook URL and token were recovered. The token is withheld from this post because anyone holding it can post to or delete the webhook. The webhook ID is `1513196399968260228`, so the endpoint takes the form `discord[.]com/api/webhooks/1513196399968260228/<token redacted>`. Abuse teams that need the full value can request it directly.

**Decoded Discord messages, in order**

1. **"New Execution" beacon** (frame 209). An embed posted as the user `btwStealer` with a build ID (`27eb1da4aaa2b246`), a license "Plan" of `unlimited`, IP, hostname and username. This is what the 1.8 to 5.9 KB check-in sessions in section 7 contain. The "unlimited plan" field suggests a malware-as-a-service panel.
2. **Victim screenshot** (frame 253). A multipart upload with a real PNG attached. These are the 404 to 572 KB bulk sessions.
3. **Stolen-data ZIP** (frame 362). `btwStealerLOG_<id>.zip` attached directly. It was empty in the lab because there was no browser or wallet data to steal, but the delivery path matches.
4. **"System Infos" summary** (frame 480). CPU, RAM, OS, antivirus (Windows Defender), uptime, and a "Stolen Data" download link. The link read `null` and the IP read `N/A` because INetSim's fake `ipinfo.io` page returned no real JSON. That is a lab artifact, not the stealer misbehaving.

**Redundant exfiltration.** The same archive was sent to all four GoFile storage nodes returned by `api.gofile.io/servers` (`store1` to `store4`), and to `catbox.moe` (`/user/api.php`) as an anonymous fallback.

## Detection

- **Host:** `%LOCALAPPDATA%\btwStealer-local\output\browser_forensics.py` and `python_stdout.txt`, `btwStealerLOG_<13 digits>.zip` in `%TEMP%`, `btwStealer_debug_log.txt`, `%TEMP%\WinGet\tools\python.exe`, and `system_check_<13 digits>.vbs`.
- **Behavior:** a GUI app spawning `powershell` for a screenshot, then `cscript`, then a portable `python.exe -m pip install pycryptodome pywin32 PythonForWindows`, then a back-to-back `taskkill` sweep over eight browser names and `Exodus.exe`/`Telegram.exe`.
- **Network:** a non-browser process contacting `ipinfo.io`, then `discord.com`, then `gofile.io` and `catbox.moe` within seconds.
- **Hash:** `70a0b041d945a1d26a65ae366537e5de7353f0a4b0b0c9abcbfe9eb6cfa8d44b` (all seven downloads). The bundled `python.exe` (`94a83686…8954`) is a legitimate binary, so use it only in combination with the paths above.
- **Site:** `chilloutvrmodded[.]net` (`35.157.26.135`).

*Sources: Triage reports 260902-p413esyset and 260903-enhk2aeg96, the two Triage packet captures, DIE/Extract/Resource/Import dumps of the launcher, urlscan.io, and a local REMnux/INetSim detonation on 2026-09-03.*

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1059.001 PowerShell | `cmd.exe` to `powershell.exe` desktop capture |
| Execution | T1059.003 Windows Command Shell | Listed in Triage's matrix |
| Execution | T1059.005 Visual Basic | Dropped `system_check_<13 digits>.vbs` run by `cscript.exe` |
| Execution | T1059.006 Python | `pip install` bootstrap, then `browser_forensics.py` |
| Persistence | T1053 Scheduled Task/Job | Attempted only (`mmc.exe taskschd.msc`); no task or registry write was captured |
| Defense Evasion | T1027 / T1027.010 Obfuscated Files or Information / Command Obfuscation | Launcher copies itself under a random name; T1027.010 is in Triage's matrix |
| Credential Access | T1555.003 Credentials from Web Browsers | DPAPI unprotect of Chrome and Edge master keys; `passwords.txt`, `cookies.txt` |
| Credential Access | T1552.001 Credentials In Files | Credentials written to files before upload |
| Discovery | T1012 Query Registry / T1082 System Information / T1016.001 Internet Connection Discovery | CPU and locale queries; `ipinfo.io` lookup |
| Discovery | T1057 Process Discovery / T1217 Browser Information Discovery | Process enumeration, browser killing, profile enumeration |
| Collection | T1113 Screen Capture / T1005 Data from Local System | PNG desktop captures; browser databases copied |
| Command and Control | T1102 Web Service | Discord and GoFile |
| Exfiltration | T1567 Exfiltration Over Web Service | Discord and GoFile uploads. Analyst mapping, not in Triage's matrix |

Triage's own matrix for the first run lists T1059.001, T1059.003, T1059.005, T1027.010, T1555.003, T1552.001, T1217, T1057, T1012, T1082, T1016.001, T1005 and T1102. T1567 and T1053 are my mappings.

## Confidence and limits

**Observed.** Self-replication, anti-VM registry checks, screenshot capture, Python bootstrap, browser kills, DPAPI decryption of Chrome and Edge keys, the `btwStealerLOG` bundles, and Discord and GoFile uploads in all four Triage runs and both Triage captures. In the local run: the webhook, the four message bodies and the Catbox and GoFile mirrors.

**Inferred.** The Triage sessions' contents (sized in section 7, identified only by the local run), the contents of the 71 MB overlay, and the pkg-Node.js packaging, which comes from earlier work on sibling binaries. Triage's `WriteProcessMemory` entries look like process launches, not injection.

**Not established.** Any encryption of user files, a captured persistence mechanism, or real harvested data in the lab run. The sandbox VMs and the lab held no meaningful browser, wallet or Telegram data.
