---
title: "Night-Sterling.exe: Inno Setup dropper for a PyInstaller + PyArmor browser-data stealer"
description: Execution-chain reconstruction of Night-Sterling.exe from two sandbox runs, two packet captures and a static unpacking of its five protection layers, with the techniques explained along the way.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-23
---

*Analysis date: 17 October 2026. The findings combine two sandbox runs, two packet captures and a static unpacking of the sample. Hashes, command lines and packet indexes are trimmed to what a reader needs to reproduce or hunt for the behavior.*

## Summary

| | |
|---|---|
| Sample | `Night-Sterling.exe`, 29,409,892 B (28.0 MB) |
| SHA-256 | `f7fb94faa3fd5765388db0e9e9389408eb0ec2a62a8f537c30508fbb5460b69b` |
| Triage sample | 261017-fla9lshx3q, score 7/10, "Shows suspicious behavior" |
| Run A | behavioral1, Windows 10 (win10v2004-20260911-en), network 428 s |
| Run B | behavioral2, Windows 11 (win11-20260911-en), network 445 s |
| Packet captures | `triage_win10.pcapng` (1,538 frames), `triage_win11.pcapng` (726 frames) |
| Triage tags | credential_access, discovery, spyware, stealer, installer, execution, pyinstaller |

**Observed.** The sample collects a host profile, queries `ifconfig.co`, force-closes Chrome and extracts its V20 (app-bound) key, probes Firefox profiles, then makes two TLS sessions to `lightwain[.]com`. The second carries a 4.2 to 4.6 KB upload.

**Not established.** No Run/RunOnce key, service, scheduled task or mutex in any source. No archive or exfil bundle on disk. No traffic to `lightwain[.]com` after the upload, through 428 s / 445 s.

**Recovered statically.** The PyInstaller, PyArmor and AES layers were removed without executing anything and the stealer source was recovered (section 11). TLS in the pcaps stays undecryptable, and the server-delivered `/dolphin` payload was not obtained.

## Concepts used in this sample

The sample stacks several well-known tools, and knowing what each one does makes the rest of the post easier to follow.

- **Inno Setup.** A common Windows installer framework. Malware wrapped in an installer looks like ordinary software setup, and the installer relaunches itself with an `/SL5=…` argument. Triage reports that parent-to-child pair as `WriteProcessMemory`, which is why those entries appear in the sandbox output.
- **PyInstaller.** Bundles a Python program and its interpreter into one executable. The embedded archive can be unpacked with `pyinstxtractor`, which recovers the compiled `.pyc` files.
- **PyArmor.** A Python obfuscator that encrypts code objects and decrypts them in memory through a runtime module. Version 8 and later can be undone statically when the sample was protected with the free trial key, as this one was.
- **Chrome app-bound encryption (V20).** Since 2024 Chrome has protected the key to its cookie and password stores so that only Chrome's own elevation service can unwrap it, in order to stop infostealers from reading the databases directly. Stealers answer by running code inside Chrome or by calling that service. Here the sample launches headless Chrome and the evidence points to the second approach, though the injected DLL was not disassembled.
- **JA3.** A fingerprint of the parameters a client offers in its TLS handshake. Two programs using different TLS libraries produce different JA3 values, which is how the network traffic here is tied to the Python payload and not to Chrome.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Night-Sterling at a glance</div><div class="fig-sub">What the installer and payload did in both sandbox runs</div></div><div class="fig-draw" role="img" aria-label="Inno Setup installer, PyInstaller payload, host recon and IP lookup, handshake and beacon with lightwain[.]com, headless Chrome key recovery and staging, encrypted ZIP upload."><svg viewBox="0 0 560 298" width="560" height="298" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 258" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Inno Setup installer runs</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">Self-extracts, relaunches with /SL5 and installs the payload</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Payload profiles the host</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">Hostname, domain, locale, hardware; public IP via ifconfig.co</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="142" r="3" style="fill:var(--accent)"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Handshake and beacon</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">Two TLS sessions to lightwain[.]com, POST /xylophone and /compass</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="200" r="3" style="fill:var(--accent)"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Headless Chrome, V20 key</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">Starts Chrome, recovers the app-bound key, stages data</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Upload</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">AES-256 ZIP of the staging folder to lightwain[.]com</text></svg></div></figure>

## Indicators of compromise

### Files

About 60 `_internal\` files per run (Python stdlib `.pyc`, `ctypes\`, `encodings\` and similar) and 100+ Chrome profile files under `Temp\HeadlessChrome…` are legitimate and not itemised.

| Group | Path / name | Note |
|---|---|---|
| Installer | `Temp\Night-Sterling.exe` | Original sample |
| Installer | `Temp\is-*.tmp\Night-Sterling.tmp` | SHA-256 `3d3ddd62a6de05caf1f72c1726bab555b949eb83c7ce507c1c346c528068914a`, same in both runs |
| Payload | `Programs\Night Sterling\Night-Sterling.exe` | SHA-256 `43aa142b…45c8` |
| Payload | `_internal\python314.dll`, `_ctypes.pyd`, `libffi-8.dll`, `VCRUNTIME140.dll`, mypyc `.pyd` | Python runtime |
| Local install only | `unins000.exe`, `pyarmor_runtime_000000\pyarmor_runtime.pyd`, desktop and Start Menu `.lnk` | Seen on the local analysis VM, not in Triage's lists |
| Staged data | `Banana Birthday Basketball\shg*` | Base64 host profile (332 B in run B) |
| Staged data | `…\sx*` | 1,316 B: XOR + double-base64 copy of Chrome's app-bound key |
| Staged data | `…\fg*` | Base64 of an 8-digit ID (`31305646` in run B) |
| Staged data | `…\<Word> <Word> basketballs\bes50nOIMUd` | 756 B JSON, 9 × (8 B key → 48 B blob), SHA-256 `042f8486105d884596e5f0e6690c1d5a6eebd67500025a828aff7a723eff087f` in both runs |
| Staged data | `…\<Word> <Word> Absolute\UserInformation.txt` | Plaintext host profile |
| Staged data | `…\Debugging\Logs.txt`, `Logs_F.txt`, `Logs_Firefox.txt`, `Logs_Header.txt` | Collector logs |
| Staged data (A) | `…\Cookies\Cookies_Chrome_Default.txt` | Listed in run A only |

**Exfil bundles: none observed.** No `.zip`, `.7z` or `.rar` is listed in either run, although `pyzipper` is bundled. The upload is TLS-encrypted, so the packing was only confirmed later from the code. Triage also extracted a 0xAB000-byte region at the fixed base `0x63300000` in the payload process in both runs. A fixed non-ASLR base is unusual and still unexplained.

### Registry

**No autostart was captured.** Neither Triage run lists a Run, RunOnce, Winlogon, service, scheduled-task or IFEO write, and the local Regshot diff contains no `CurrentVersion\Run` string.

| Key | What | Verdict |
|---|---|---|
| `HKLM\SYSTEM\ControlSet001\Services\Tcpip\Parameters` | `Hostname`, `Domain` read by the payload | Host recon |
| `HKLM\SYSTEM\ControlSet001\Control\NLS\Language` | Opened by the Inno stub | Likely benign |
| `HKLM\HARDWARE\DESCRIPTION\System\BIOS`, `CentralProcessor\0` | Read by `chrome.exe` | Chrome behaviour |
| `HKCU\…\Uninstall\{F77A5A14-6205-4059-9DF8-6BA5110A9380}_is1` | Standard Inno uninstall record, `DisplayName` "Night Sterling" | Installer bookkeeping, not persistence |

**In the code, never triggered.** One conditional autostart exists: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, with a random 6 to 9 letter value name pointing at the `.exe` extracted from the `/dolphin` ZIP. It only runs if a marker file `hl<letters>xf` exists in `Banana Birthday Basketball`. No marker was created in either run.

### Mutexes

Triage lists none, but the recovered main module calls `win32event.CreateMutex(None, False, "NS_fbrqw")` and exits with `os._exit(0)` if it already exists, a single-instance guard. This is code-only evidence. The local Procmon capture was not parsed for this, and Procmon does not record mutex creation anyway.

### Command lines

The chain, in order of first appearance:

```text
"…\Temp\Night-Sterling.exe"
"…\Temp\is-3LI0R55ZS4.tmp\Night-Sterling.tmp" /SL5="$600E4,28030703,1207808,…\Temp\Night-Sterling.exe"
"…\Programs\Night Sterling\Night-Sterling.exe"
C:\Windows\system32\cmd.exe /c "ver"                      (run A only)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --no-first-run
    --no-default-browser-check --disable-extensions --disable-popup-blocking --mute-audio
"…\Chrome\Application\140.0.7339.81\elevation_service.exe"   (started twice per run)
```

Chrome then spawns about 20 helpers per run (crashpad, GPU, network, storage, renderers, extension renderers, metrics) with `--user-data-dir=…\Temp\HeadlessChrome<digits>`. They differ only in handle and renderer-id values. The Windows Hello `svchost -s NgcSvc` entry Triage lists is unrelated OS noise.

### Network

| Domain / IP | Category | Role |
|---|---|---|
| `lightwain[.]com` | C2 / exfil | Cloudflare-fronted (A: 104.21.93.180, 172.67.213.178 · B: 188.114.96.1, 188.114.97.1). Two bursts: check-in, then upload. |
| `144.172.105[.]236` | C2 fallback | Hard-coded, plain-HTTP. Not contacted in either capture. |
| `ifconfig.co` | Fingerprinting | External IP and geolocation (172.67.168.106, 104.21.54.91). |
| `ipinfo.io/json`, `www.google.com`, `www.cloudflare.com`, `www.amazon.com` | Fingerprinting / connectivity | Geo-IP fallback and a reachability test. Not seen in the pcaps. |
| `clientservices.googleapis.com`, `www.google.com`, `mtalk.google.com:5228` | Legitimate | Headless Chrome startup traffic |
| Microsoft / DigiCert hosts | Background noise | Telemetry, updates, revocation checks |

**Network fingerprint.** All five TLS sessions to `ifconfig.co` and `lightwain[.]com` in each run share JA3 `7291ea5e449f2c7b17582541703e549d` (offers X25519MLKEM768, as shipped with OpenSSL 3.x in the bundled Python). Chrome's sessions use different JA3 values, which ties the C2 traffic to the Python payload rather than to Chrome.

**Host indicators.**

- Folder `%LOCALAPPDATA%\Banana Birthday Basketball\` (sub-folder names vary)
- Sub-folder pattern `<Word> <Word> Absolute\Debugging\Logs*.txt` and `…\UserInformation.txt`
- Root files `sh*`, `sx*`, `fg*` and a nested folder holding `bes50nOIMUd`
- Staged-key XOR key `124ee712f8cee35d8a03a96a20a94552`; candidate tag value `31305646`
- Install dir `%LOCALAPPDATA%\Programs\Night Sterling\`

### Packet correlation

Byte counts are wire bytes for the whole TCP stream. "Client app data" is TCP payload the VM sent after the TLS ClientHello.

| Run | Phase | Frames | Time (s) | Endpoint | Client app data |
|---|---|---|---|---|---|
| A | 4 | 986–1012 | 113.38–113.75 | `ifconfig.co` | 174 B |
| A | 5 | 1014–1061 | 114.86–115.35 | `lightwain[.]com` ×2 | 381 B · 276 B |
| A | 6 | 1064–1401 | 123.49–131.77 | Chrome startup | noise |
| A | 8 | 1409–1456 | 150.66–151.63 | `lightwain[.]com` ×2 | **4,646 B** · 497 B |
| B | 4 | 7–34 | 123.82–124.28 | `ifconfig.co` | 174 B |
| B | 5 | 36–89 | 125.36–125.98 | `lightwain[.]com` ×2 | 276 B · 306 B |
| B | 6 | 92–431 | 133.43–141.27 | Chrome startup | noise |
| B | 8 | 434–480 | 163.79–164.87 | `lightwain[.]com` ×2 | **4,200 B** · 497 B |

The NetBIOS announcement in run B (frame 587) carries the host name `UNSUOWXK`, which equals "PC Name" in that run's `UserInformation.txt`. That confirms the decoded host files belong to this capture.

### Cross-run consistency

**Identical in both runs (malware logic).**

- Payload and `.tmp` hashes, the process chain, the Chrome arguments
- Base folder name, file prefixes `sh*`/`sx*`/`fg*`, and the `bes50nOIMUd` hash
- Network order: `ifconfig.co` → `lightwain[.]com` ×2 → Chrome startup → `lightwain[.]com` ×2, with gaps of about 1.3 to 1.4 s, 8 s and 27 to 30 s
- JA3 `7291ea5e…`, a 4.2 to 4.6 KB upload followed by a 497 B session

**Different (environment or randomisation).**

- PIDs, Inno temp folder, Chrome profile name
- Random sub-folder and file names, host profile contents (and so their hashes)
- `cmd.exe /c "ver"` and `Cookies_Chrome_Default.txt` appear only in run A (B's list may simply omit the cookie file)
- `lightwain[.]com` resolved to different Cloudflare IPs; upload size differs with host data

Randomised names with fixed prefixes and fixed contents are a property of the sample, not of the sandbox.

## Execution flow

### 1. Execution timeline

Neither pcap marks the moment the sample was launched, so "before" and "after" are relative to the first sample-attributed packet, the `ifconfig.co` lookup. Frame numbers are given as A (win10 pcap) / B (win11 pcap).

1. **Installer launch and self-extraction.** `Temp\Night-Sterling.exe` (Inno Setup 7.0.0.3, Delphi) unpacks `is-XXXXXXXXXX.tmp\Night-Sterling.tmp` and relaunches it with `/SL5=…`. The "WriteProcessMemory" entries Triage lists for this pair are the standard Inno relaunch pattern. No attributable network traffic. (T1204.002)
2. **Payload installation.** A PyInstaller one-dir app lands in `%LOCALAPPDATA%\Programs\Night Sterling\`: `Night-Sterling.exe` (SHA-256 `43aa142b…`) plus an `_internal\` tree (python314.dll, cryptography, Cryptodome, requests, win32crypt, sqlite3). Inno also writes an uninstall record.
3. **Payload start and local recon.** The payload enables `SeDebugPrivilege` and reads the `Hostname` and `Domain` values under `Tcpip\Parameters`. In run A only, it runs `cmd.exe /c "ver"`. The host profile it stages later holds time zone, OS language, user and PC name, OS edition, HWID, CPU, cores and threads, GPU, RAM and screen resolution. (T1082, T1016, T1124, T1614.001)
4. **External IP lookup.** HTTPS to Cloudflare-hosted `ifconfig.co`. The IP and location end up in the host profile. A: frames 986–1012 · B: 7–34. (T1016.001, T1614)
5. **First `lightwain[.]com` exchange.** About 1.3 to 1.4 s later, two TLS 1.3 sessions open at the same instant, each with 200 to 300 B of client data. The recovered code shows one is the `POST /xylophone` handshake and the other the `POST /compass` beacon. Which stream is which is inferred from order and size, because TLS hides the paths. A: 1014–1061 · B: 36–89. (T1071.001, T1573)
6. **Headless Chrome and V20 key recovery.** The payload starts `chrome.exe --headless --no-first-run …` with a private profile in `Temp\HeadlessChrome<PID>…` and writes into the new Chrome process. `elevation_service.exe`, Chrome's app-bound encryption broker, starts in both runs. Run B's `Logs.txt` reads: *"Force closing browser before extraction · Browser: chrome | WM Close · Start: chrome · Successfully received V20 key · [Edge] Skipped (too few cookies)"*. A: 1064–1401 · B: 92–431. (T1555.003, T1539, T1055 inferred)
   - The network traffic in this window is Chrome's own startup traffic (googleapis, google.com, mtalk:5228, QUIC that never completes). It has a different TLS fingerprint from the sample and is not attacker traffic.
7. **Harvesting and staging.** Files appear under `%LOCALAPPDATA%\Banana Birthday Basketball\`: a base64 host profile, an 8-character base64 value, a 1,316 B obfuscated copy of Chrome's app-bound key, a 9-entry encrypted JSON map, `UserInformation.txt`, and a `Debugging\` folder with four logs. Run A also lists `Cookies\Cookies_Chrome_Default.txt`. The Firefox log shows `No logins.json or key4.db`. The VMs had a fresh Chrome profile and no Firefox data, so little was available to steal. (T1005, T1552.001, T1555, T1074.001)
8. **Upload.** About 27 s (A) / 30 s (B) after Chrome starts, two more TLS sessions open to `lightwain[.]com`. The first sends roughly **4,646 B (A)** / **4,200 B (B)** of client data in four segments, the second about 500 B. The recovered code confirms the body is an AES-256 ZIP of the staging folder, sent as `POST /calendar/<url-encoded base64>/67`. On HTTP 200 the code writes an 8-digit ID into the `fgz*` file, and run B's `fgzydmp` holds one (`31305646`), so the upload very likely returned 200. A: 1409–1456 · B: 434–480. (T1041)
9. **Idle tail.** Only Microsoft telemetry and certificate checks follow. No persistence was captured and Triage lists no process exit for the payload, so whether it terminated cannot be stated.

### Sandbox tags and heuristics reviewed

| Triage signature | Verdict |
|---|---|
| Reads browser data · Credentials In Files · stealer/spyware | **Supported.** Chrome force-close, V20 key and Firefox probing in the logs. |
| Looks up external IP via web service | **Supported.** DNS, SNI and the profile's `IP:` field agree. |
| Accesses cryptocurrency files/wallets | **Supported by code only.** No wallets on the VMs; the recovered modules target 43 extension IDs and about a dozen desktop wallets. |
| Checks installed software | **Not corroborated.** No uninstall-key enumeration anywhere. |
| System Language Discovery | **Likely benign.** Read by the Inno stub, not the payload. |
| BIOS and CPU registry reads | **False positive.** Attributed to `chrome.exe`. |
| SeShutdown, SeCreatePagefile | **False positive.** Chrome enables these by default. `SeDebugPrivilege` on the payload is genuine. |
| NtCreateUserProcessBlockNonMicrosoftBinary | **False positive.** Chrome's own mitigation. |
| WriteProcessMemory chains | **Mixed.** Inno relaunch and Chrome child writes are normal; payload → `chrome.exe` and payload → `cmd.exe` are attacker-initiated. |

## Reverse engineering notes

### Reverse engineering analysis

**Tools used.** `pdftotext` for the Triage report; `tshark`/`capinfos` for pcaps (DNS, SNI, JA3, per-stream payload sizes); Detect It Easy; `pyinstxtractor` (Python 3.14, 17 CArchive entries); a custom `marshal` walker; recursive base64 and single-byte XOR brute force for the script layers; the public Pyarmor-Static-Unpack-1shot for PyArmor v8+; custom Python for the AES/PBKDF2 stages; `strings` and `comm` on Regshot hive snapshots; and `yara` for rule testing.

**Findings.**

1. **Outer sample.** PE32 GUI, Delphi 12, Inno Setup Setup Data 7.0.0.3. It installs the app tree seen in both Triage runs.
2. **Installed app.** PE64 PyInstaller archive, Python 3.14, 17 entries. Entry script `dxpjYdgRVu.pyc` (429,140 B) is the only non-PyInstaller code.
3. **Entry script obfuscation.** 93 code objects with random identifiers, dead arithmetic, and about 75 nested `exec(<decoder>(b'base64…'))` layers. String constants are AES blobs, so a grep over the 334 KB of peeled text finds no `http`, `lightwain`, `ifconfig` or `chrome`.
4. **Real payload is PyArmor.** The last layer is an 85,496 B blob that XORs with `0xBD` into `from pyarmor_runtime_000000 import __pyarmor__`. The runtime is a PyArmor v8+ module for Python 3.14.
5. **Bundled capability hints.** `win32crypt` (DPAPI), `sqlite3`, `psutil`, `wmi`, `cryptography`, `Crypto`/`Cryptodome`, `pyzipper`, `requests`, `PIL`, `pefile`, plus `customtkinter` for a GUI front.
6. **Dropped host files decoded** (run B, hashes match the local copies):

```text
shgksjjr (base64) →
HWID: 11111111-1111-1111-1111-111111111111
IP: 85.203.46.110   Country: United Kingdom   City: London
Cores: 2  Threads: 2  GPU: NVIDIA GeForce 210

fgzydmp (base64) → "31305646"
sxhwsurt 1,316 B → XOR (16-byte key) → base64 → base64 →
  'APPB' + DPAPI blob ("Google Chrome") = Chrome Local State
  os_crypt.app_bound_encrypted_key

Logs.txt
[Chrome] - Force closing browser before extraction
Browser: chrome | WM Close
Start: chrome
[Chrome] - Successfully received V20 key
[Edge] - Skipped (too few cookies)
Browser: Firefox | Profiles: Default, Profile 1
```

The HWID and IP belong to the Triage VM and its egress, not a real victim. The wrapped Chrome key is worthless outside that VM.

7. **Chrome handling.** The log shows `WM_CLOSE`, a headless start, then "received V20 key". Chrome 140's app-bound key can only be unwrapped through `elevation_service.exe`, which started in both runs. The mechanism is inferred to be in-process use of that broker, not confirmed at code level.
8. **Wallet sweep, first pass.** A regex sweep for wallet addresses and keywords over every file found nothing, because every string sat behind AES and PyArmor. That result was superseded by section 11: the wallet targets are recovered, and still no address is hard-coded.

**From the decrypted code.**

- **Five protection layers, all removed statically.** The runtime used PyArmor's free "non-profits" trial key, which is why a public static unpacker works on Python 3.14.
- **A stealer in a fake app.** A customtkinter "Night Sterling" window, with a kill date, a server handshake and a mutex as guards.
- **Nine stealer modules,** tied to the nine 8-byte IDs in `bes50nOIMUd`: Chromium family, Firefox, wallet extensions, desktop wallets, password/service classifier, Telegram, host profile, AES-ZIP packer and the exfil client.
- **Host files explained.** `UserInformation.txt` and `shg*` are the host profile, `sx*` is the XOR-wrapped Chrome key, `fg*` is the session ID written after a successful upload, and `bes50nOIMUd` is the bundled key store copied unchanged.
- **Injected DLL** `sjemory.gui`, SHA-256 `79c555bc…d5955`. x64 MSVC, built 15 Oct 2026, imports `CoCreateInstance` and `CoSetProxyBlanket`. Consistent with calling Chrome's elevation COM service from inside Chrome. Not disassembled.

#### Execution flow with proof from the code

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Unwrapping the payload</div><div class="fig-sub">Every layer was removed statically</div></div><div class="fig-draw" role="img" aria-label="PyInstaller entry script, then nested exec base64 and AES strings, then XOR 0xBD, then PyArmor, then AES and zlib loader, then per-module PBKDF2 AES files."><svg viewBox="0 0 520 344" width="520" height="344" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 28 L11 308" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="28" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="26" font-size="15" style="fill:var(--ink)">PyInstaller entry script</text><text x="34" y="44" font-size="13" style="fill:var(--ink-3)">93 code objects, junk arithmetic, ~75 exec(base64) layers</text><circle cx="11" cy="98" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="96" font-size="15" style="fill:var(--ink)">AES-wrapped strings, then XOR 0xBD</text><text x="34" y="114" font-size="13" style="fill:var(--ink-3)">No URL or path in plaintext; ends in a PyArmor stub</text><circle cx="11" cy="168" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="166" font-size="15" style="fill:var(--ink)">PyArmor v8+ runtime</text><text x="34" y="184" font-size="13" style="fill:var(--ink-3)">Trial key, so a public static unpacker works on 3.14</text><circle cx="11" cy="238" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="236" font-size="15" style="fill:var(--ink)">AES-128 + zlib loader</text><text x="34" y="254" font-size="13" style="fill:var(--ink-3)">Holds the kill date and opens the .gui modules</text><circle cx="11" cy="308" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="308" r="3" style="fill:var(--accent)"/><text x="34" y="306" font-size="15" style="fill:var(--ink)">Per-module PBKDF2 + AES, then junk, XOR, PyArmor, AES</text><text x="34" y="324" font-size="13" style="fill:var(--ink-3)">Nine stealer modules, keys wrapped in bes50nOIMUd</text></svg></div></figure>

| # | Step | Evidence |
|---|---|---|
| 1 | Installer drops the PyInstaller app | Triage process tree and file lists |
| 2 | Bootstrap unwrap: decoy entry script → XOR `0xBD` → PyArmor stub → AES + zlib loader | `01/dxpjYdgRVu.pyc`, `02/stage2.1shot.das` |
| 3 | Kill date and clock check: stops after 2026-10-27; reads Google's `Date` header only if the local clock is already past it | `03:336–338`, `03:327` |
| 4 | Loader opens `mOqwXkwMkS.gui` (PBKDF2) and calls `gnocthxklw()` | `03:251`, `03:431` |
| 5 | Mutex `NS_fbrqw` | `04:1035–1053` |
| 6 | Victim ID file `fgz…` (rotated after 12 h) and marker files `xgl…aht`, `hl…xf` | `04:99`, `04:163`, `04:845` |
| 7 | Handshake: `POST /xylophone`, reply must be `status:"success"` with a `server_code` ending in `42`; fall back to HTTP at `144.172.105[.]236`, else show an error and exit | `04:746–785` |
| 8 | Public IP and location from `ifconfig.co/json` (backup `ipinfo.io/json`) | `04:985–986`; pcap A 986–1012 / B 7–34 |
| 9 | "New launch" beacon to `/compass`, at most one per 5 s | `04:358–386`, `04:858` |
| 10 | Load the orchestrator and nine submodules | `04:802–826`, `05:479–481` |
| 11 | Collectors run in worker threads, each logged to `Debugging\`, 30 s wait | `05:584–1643` |
| 12 | Host profile with anti-analysis checks (see section 11) | `06:71–91`, `06:880–890`; both runs produced `shg*` |
| 13 | Chromium theft: close browser, start headless Chrome, inject DLL, decrypt cookies, logins, autofill, tokens | `07/AEEPnRJBG:194, :684, :918, :359, :453–459` |
| 14 | Wallets: 43 extension IDs plus about a dozen desktop wallets and Firefox MetaMask, copied to `Wallets\` | `07/WuatcBwXqRmj:143`, `07/uDJyeMmMV:184–352`; no runtime evidence |
| 15 | Firefox logins and cookies, Telegram `tdata`, desktop documents by keyword | `07/myKYBGDe:320, :542`, `07/dctWgvRIzPT:232` |
| 16 | Sort the loot into `Passwords.txt`, `AllPasswords.txt`, `Global.txt`, `Services.txt`, flagging exchange, bank and VPN accounts | `07/AIwgoLaMWXsm:491, :676, :689` |
| 17 | Package: AES-256 ZIP with a fixed password, base64, delete the staging folder | `07/JbbXntUqf:2, :288, :615` |
| 18 | Upload: `POST /calendar/<obfuscated>/67`, on HTTP 200 write the `fgz*` ID and create `blueprints` | `07/byxjtmvKURCX:550–617`; pcap A 1409–1456 / B 434–480 |
| 19 | Clean-up: delete folders from five other campaigns, create an `hl…xf` marker | `05:1741–1748` |
| 20 | Second stage on a later launch (never seen): download from `/dolphin`, extract one `.exe`, add an HKCU Run value | `04:845–935`; no Run key or download in either run |

**Open questions.**

- The origin of the fixed-base `0x63300000` region. The injected DLL is ASLR with base `0x180000000`, so it is not that region.
- Whether the upload is the staged files verbatim or re-encrypted, and what the server replies (about 1.1 KB per session).
- How a real, well-populated browser profile and wallets change the loot handling. The VMs held almost none.

### Recovered logic and configuration

Everything here comes from static decryption. No code was executed and `lightwain[.]com` and `144.172.105[.]236` were not contacted.

#### Wallet and credential targets

**No wallet address, seed phrase or clipper pattern is hard-coded.** The sample steals wallet data files; it does not swap addresses. The "CLP"/"clipper" names in its log messages refer to the server-delivered payload, which was not retrieved, so a clipboard-hijacking function there cannot be ruled in or out.

| Target class | What the code collects |
|---|---|
| Wallet extensions (43 unique IDs; Chrome, Edge, Brave, Opera) | MetaMask, Exodus, Binance Chain, TronLink, Ronin, Trust, OKX, Phantom, Coinbase, Rabby, Keplr, Solflare, Zerion, SafePal and others. Copies `Local Extension Settings`, `Local Storage\leveldb` and `Session Storage`. |
| Desktop wallets | Exodus, Electrum, Atomic, Guarda, Coinomi, Monero, Ledger Live, Binance, Bitcoin, Sparrow, Trezor Suite, SafePal, plus MetaMask inside Firefox |
| Browsers | Chrome, Edge, Brave, Opera, Opera GX, Vivaldi, Yandex (cookies, `Login Data`, `Web Data`); Firefox (`logins.json`, `key4.db`, `cookies.sqlite`) |
| Account and cookie filter | About 50 exchange, tracker and DeFi domains and about 16 US bank domains |
| Messenger and files | Telegram Desktop `tdata`; desktop documents matched by multilingual keywords |

#### Command-and-control protocol

| Request | Detail |
|---|---|
| `POST /xylophone` | JSON `{"code": "<6–8 digits>"}`. Reply must be `status:"success"` with a `server_code` of 6 to 8 digits ending in `42`, else the client shows "Connection error" and exits. |
| `POST /compass` | Telemetry. Message XOR a random byte (5–255), base64, then base64 again, URL-quoted. One send per 5 s. |
| `POST /calendar/<urlquoted b64>/67` | Exfil. Body is base64 of an AES-256 ZIP (password `uds2sag1cP2`) holding a ZIP of the staging folder. Fallback `http://144.172.105[.]236/calendar/…/67`. Timeouts 400 s / 1500 s. |
| `GET /dolphin` | Encrypted ZIP (PBKDF2 password `O7qb3D47yg`), extracts one `.exe` to `%LOCALAPPDATA%\Dictionary Everything Festival\` and writes an HKCU Run value. Gated on a marker file; never triggered, not downloaded. |

#### Behaviour fixed by the code

- **Kill date.** Start 2026-10-12, valid 15 days, so the sample stops working after **2026-10-27**. The DLL and exe were built 15 October 2026.
- **Mutex** `NS_fbrqw`.
- **Staging** in `%LOCALAPPDATA%\Banana Birthday Basketball\<two words> Absolute|Question|Training\`, with marker files `blueprints` (after a successful upload), `xgl<rand>aht` and `hl<rand>xf`, and the user-ID file `fgz<rand>`.
- **Injection.** It decrypts `sjemory.gui` into a PE, writes it under a random building-name folder as a harmless-looking name (`bracket.dll` … `timber.dll`, or `msft_<6 digits>.dll`), and injects it into headless Chrome with the OpenProcess/VirtualAllocEx family.
- **Anti-analysis.** It aborts on a sleep that finishes too fast, a parent process in {wmiprvse, cmd, powershell, pythonw, service, svchost} (two hits abort), and GPU strings such as `vmware` or server/virtual adapters. None tripped in the sandbox.
- **Sibling-campaign clean-up.** It deletes five other folders under `%LOCALAPPDATA%`, which points to a shared builder.
- **GUI decoy.** A customtkinter "Night Sterling" window; errors use a MessageBox titled "Night Sterling".

#### Decryption chain

| Layer | Mechanism |
|---|---|
| Entry pyc | Nested `exec(b64decode(…))`, AES-wrapped strings, a base64 blob, XOR `0xBD`, then a PyArmor v8+ stub |
| Stage 2 | AES-128-CBC with a key built from two base64 halves, then base64 and zlib. Output: the loader with the kill date. |
| `.gui` modules | PBKDF2-HMAC-SHA256 (100,000 iterations) from a per-module password and salt; AES-CBC chunks, PKCS7, zlib |
| Module bodies | Junk code, `exec(b64)` layers, a per-module XOR byte, PyArmor again, then AES. Submodule keys are wrapped in `bes50nOIMUd`, which the stealer also copies into the Banana folder, so its hash is identical in every run. |

#### Why the sandbox saw less than the code can do

- No wallets, banks or Telegram existed on the VMs, so those collectors found nothing.
- The `/dolphin` download and Run-key branch need a marker file that was never created.
- The kill-date branch contacts Google only after 27 October.
- Triage's file list is partial, so `blueprints` and the staging zip may simply be unlisted.

## Detection

Detection rests on the YARA rules below and on the host and network indicators under Indicators of compromise.

### YARA rules

Seven rules were written. The first five were compiled and run against the installer, the installed tree, the extracted pyc, the run-B dropped files and several system directories: each hit only its intended target, with no false positives in those sets. The last two match the decrypted modules and injected DLL.

The dropped-file text rules are the most durable, so these are the two to deploy first:

```yara
rule NightSterling_Stealer_HostProfile_Artifact
{
    meta:
        description = "UserInformation.txt host profile written by Night-Sterling stealer"
        sha256_sample = "2a68bdb67bdfae9aebfa0447a7ff987058711dcfc0c5767c4f8adeec6bc2a84d"
    strings:
        $a = "Timezone: (UTC" ascii
        $b = "Language OS:" ascii
        $c = "HWID: " ascii
        $d = "Count of CPU threads:" ascii
        $e = "Screen Resolution:" ascii
    condition:
        filesize < 4KB and all of them
}

rule NightSterling_Stealer_Browser_Log_Artifact
{
    meta:
        description = "Debugging log text written by Night-Sterling stealer"
    strings:
        $a = "Force closing browser before extraction" ascii
        $b = "Successfully received V20 key" ascii
        $c = "No logins.json or key4.db" ascii
        $d = "Browser: Firefox | Profiles:" ascii
    condition:
        filesize < 8KB and 2 of them
}
```

The remaining rules cover the base64 staged profile (`SFdJRDog` at offset 0 plus `CklQOiA`), the entry pyc (more than 15 hits of `ZXhlYyhF`, base64 of `exec(E`), the Inno installer (brand string, low durability), the decrypted modules (base64 of the C2 and IP, `NS_fbrqw`, the zip password), and the injected DLL (imports of `CoSetProxyBlanket`, `CoCreateInstance`, `SHGetKnownFolderPath`). The installer and pyc rules are narrow hunting aids; the pyc rule depends on the build's decoder name.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1204.002 User Execution: Malicious File | Inno Setup installer launched by the user |
| Defense Evasion | T1027 Obfuscated Files or Information | PyArmor-protected payload |
| Defense Evasion | T1480 Execution Guardrails | Kill date and handshake gate |
| Defense Evasion | T1055 Process Injection | Writes into the new Chrome process. Inferred |
| Defense Evasion | T1070.004 File Deletion | Staging clean-up |
| Persistence | T1547.001 Registry Run Keys | Conditional in the code; not captured in either run |
| Credential Access | T1555.003 Credentials from Web Browsers / T1555 Credentials from Password Stores | V20 key recovery, browser credentials |
| Credential Access | T1539 Steal Web Session Cookie | `Cookies_Chrome_Default.txt` |
| Discovery | T1082 System Information / T1016 Network Configuration / T1124 System Time | Host profile |
| Discovery | T1016.001 Internet Connection Discovery / T1614 System Location Discovery / T1614.001 System Language Discovery | `ifconfig.co` lookup, OS language |
| Collection | T1005 Data from Local System / T1074.001 Local Data Staging | `%LOCALAPPDATA%\Banana Birthday Basketball\` |
| Collection | T1560.001 Archive via Utility | AES-256 ZIP |
| Command and Control | T1071.001 Web Protocols / T1573 Encrypted Channel | TLS 1.3 to `lightwain[.]com` |
| Command and Control | T1105 Ingress Tool Transfer | `/dolphin` endpoint in the recovered code |
| Exfiltration | T1041 Exfiltration Over C2 Channel | `POST /calendar/<base64>/67` |

## Confidence and limits

**Observed.** Both sandbox runs show the installer, the payload start, the `ifconfig.co` lookup, two sessions to `lightwain[.]com` before and after the headless Chrome step, and a ZIP-sized upload. The recovered code explains the handshake, beacon and upload bodies.

**Inferred.** Which TLS stream is the handshake and which is the beacon (order and size, because TLS hides the paths), and process injection into Chrome (from process writes and the V20 key log).

**Not established.** Persistence (none captured) and whether the payload terminated (Triage lists no process exit). The VMs had a fresh Chrome profile and no Firefox data, so how much a real victim would lose is unknown.
