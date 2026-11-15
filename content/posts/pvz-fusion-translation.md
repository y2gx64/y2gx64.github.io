---
title: "PvZ Fusion translation pack: MelonLoader mod and updater, no malicious behaviour observed"
description: "`PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms.zip` is a 680,952,884-byte archive with 620 entries. It was run once on a Windows 10 22H2 VM (build 19045) after a Discord user flagged it from a sandbox report."
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-28
---

*Analysis date: local detonation on 25 October 2026. The analyst's report is a partly filled template with the repository checks done and no execution flow yet. This post fills that gap from the Procmon log, Regshot diff and packet capture, so it adds to the report rather than correcting it. The differences are listed at the end.*

## Summary

A Discord user suspected the GitHub repository `Teyliu/PVZF-Translation` after submitting its download to a hosted sandbox. That report tagged an untrusted-certificate executable and a changed autorun value. The analyst ran the zip in the analyst's own Windows 10 VM, using the `Launch Game (Multilang No Console).bat` launcher, and recorded Procmon, Regshot and a packet capture.

**The analyst rates this sample as not malicious: every process, file write and connection the analyst observed is explained by a Unity game running under MelonLoader, a mod updater, and Microsoft's .NET 6 runtime installer.** The "autorun" and "untrusted certificate" tags do not hold up against the analyst's data. One real risk remains: the updater downloads new mod DLLs from GitHub on every launch and replaces the ones in the game folder. That is the normal design of a mod updater, but it means the safety of the pack depends on the repository owner's account, not on the zip the analyst tested.

| | |
|---|---|
| Sample | `PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms.zip`, 680,952,884 bytes, 620 entries |
| SHA-256 | `6208af094df244e5f87e439c850127532b86ce0c522b54776851600059bc55e9` |
| Header timestamp | Not extracted. The executables were not run through a PE parser for this post. |
| Environment | Windows 10 22H2 (build 19045) VM, user `w10analysis`, host `DESKTOP-EMBRA04`, one run, 44,953 Procmon rows, 26,212 packets |
| Evidence | Procmon CSV and PML, Regshot 1.9.0 diff (09:43:09 to 09:58:58), `pvz.pcapng` (09:49:23 to 09:58:19, UTC), the analyst's ODT report, static strings on five files |

A standalone execution-chain report accompanies this post; it is linked under References and repeats the evidence in table form.

## Concepts used in this sample

- **MelonLoader.** An open-source mod loader for Unity games. It hooks the game at start-up, generates helper assemblies, and loads mod DLLs from a `Mods` folder. Its bundled `Cpp2IL.exe` and `MonoMod.exe` are tools it runs itself, not payloads.
- **IL2CPP and Cpp2IL.** Unity can compile game code to native `GameAssembly.dll`. MelonLoader runs Cpp2IL to rebuild readable .NET stubs so mods can call into the game. This is why a game spawns a 15 MB tool and writes dozens of DLLs.
- **WiX Burn bootstrapper.** The format Microsoft's `dotnet-runtime-*.exe` installers use. It copies itself to `C:\Windows\Temp\{GUID}\.cr\` and `.be\`, re-launches elevated, and runs MSI packages. Those self-copies look like malware self-replication in a sandbox but are normal for Burn.
- **Mod updater.** `ModUpdateUtil.exe` checks GitHub for newer mod DLLs, writes them as `.dll.update`, and renames them over the old ones.
- **Regshot diff.** A before and after comparison of the registry. It shows net change only, so a value created and deleted during the run does not appear.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">PvZ Fusion pack at a glance</div><div class="fig-sub">What happened in the lab, in order. Dots mark steps that change the system.</div></div><div class="fig-draw" role="img" aria-label="Run the launcher bat, start the mod updater, fetch two mod DLLs from GitHub, start the game under MelonLoader, MelonLoader downloads and installs the .NET 6 runtime from Microsoft, then Cpp2IL builds helper assemblies and the game keeps running."><svg viewBox="0 0 560 350" width="560" height="350" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 318" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Double-click the launcher .bat</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">cmd.exe /C, then ModUpdateUtil.exe from Game Files\Plugins</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="84" r="3" style="fill:var(--accent)"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Updater pulls two mod DLLs</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">raw.githubusercontent.com, saved as .dll.update, renamed over the old DLLs</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Game starts under MelonLoader</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">PlantsVsZombiesRH.exe, child of the updater</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="200" r="3" style="fill:var(--accent)"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">.NET 6.0.36 runtime installed</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">29 MB from builds.dotnet.microsoft.com, /install /passive /norestart</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Cpp2IL builds helper assemblies</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">Dozens of DLLs written inside the game folder</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Game keeps running</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">Only an api.melonloader.com lookup and Windows telemetry afterwards</text></svg></div></figure>

The analyst's report has no flow chart of its own yet. The four screenshots it does contain (the repository statistics) are in step 1 of the Execution flow.

## Indicators of compromise

These are host artifacts of a benign run, listed so the next analyst can tell them from real ones. Nothing here is a detection indicator for malware.

### Files

Full paths. `w10analysis` is the lab user. The analyst leave out the roughly 600 game assets and libraries in the zip (MelonLoader, Unity, the `Dumps\Default Textures` images and the 49 `cpp2il_out` helper DLLs). They are third-party or game files, and none had an unexpected name or location.

| Path | Hash | Role |
|---|---|---|
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\Plugins\ModUpdateUtil.exe` | SHA-256 `4bfcb854…9a5a451` | Mod updater. 62,735,524 bytes, a .NET single-file bundle. |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\PlantsVsZombiesRH.exe` | SHA-256 `d38afabd…4f5b1` | Unity game executable |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\MelonLoader\Dependencies\Il2CppAssemblyGenerator\Cpp2IL\Cpp2IL.exe` | SHA-256 `663fb432…e4e04c` | MelonLoader helper tool |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\Mods\Blooms_QOL.dll` | SHA-256 `71f33f37…158e4` (as shipped) | Mod. Replaced by the updater at 02:49:38. |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\Mods\PvZ_Fusion_Translator.dll` | SHA-256 `bdec41ed…33f18` (as shipped) | Mod. Replaced by the updater at 02:49:38. |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\Mods\Blooms_QOL.dll.update` | Not captured | Downloaded replacement, written by `ModUpdateUtil.exe` |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\Mods\PvZ_Fusion_Translator.dll.update` | Not captured | Downloaded replacement, written by `ModUpdateUtil.exe` |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\UserData\Loader.cfg` | n/a | MelonLoader settings, written at 02:49:40 |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\MelonLoader\Latest.log` | n/a | MelonLoader log |
| `C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\MelonLoader\Dependencies\Il2CppAssemblyGenerator\Il2CppInterop\Il2CppAssemblies\MethodXrefScanCache.db` | n/a | Generated cache, written at 02:54:26 |
| `C:\Users\w10analysis\AppData\Local\Temp\tmpf42shz.tmp.exe` | Not captured | Microsoft .NET 6.0.36 runtime installer, written by the game process (3,435 writes) |
| `C:\Windows\Temp\{64791A19-1103-42A6-9124-12AE490B1675}\.cr\tmpf42shz.tmp.exe` | Not captured | Burn clean-room copy of the installer |
| `C:\Windows\Temp\{1E9D929C-C051-446C-8171-9DA2C3B148E4}\.be\dotnet-runtime-6.0.36-win-x64.exe` | Not captured | Burn elevated engine |
| `C:\ProgramData\Package Cache\{9d3fc73f-1cf4-412c-a1c9-d2ad28ccbd62}\dotnet-runtime-6.0.36-win-x64.exe` | Not captured | Cached installer, named in the Uninstall key |
| `C:\Users\w10analysis\AppData\Local\Temp\Microsoft_.NET_Runtime_-_6.0.36_(x64)_20261025024946.log` | n/a | Installer log (plus three `_00N_` MSI logs) |
| `C:\Users\w10analysis\AppData\LocalLow\LanPiaoPiao\PlantsVsZombiesRH\Player.log` | n/a | Unity player log, the save location named in the Read Me |
| `C:\Program Files\dotnet\shared\Microsoft.NETCore.App\6.0.36\` | n/a | Installed runtime (referenced by Regshot) |

Launcher scripts. The extracted copies on the analyst's analysis host carry a `.bnuy` suffix; the zip itself holds `.bat` files. The two the analyst hashed:

| Path in zip | SHA-256 | Role |
|---|---|---|
| `Launch Game (Multilang No Console).bat` | `8727bf96…24302` | The launcher the analyst ran |
| `Launch Game (Multilang).bat` | `636eece9…fa9322a` (hash of the `.bnuy` copy, 189 bytes) | Same, without `--melonloader.hideconsole` |

No exfiltration bundle was observed. No file was written to a Startup folder, a scheduled-task folder or `System32` by the game or updater.

### Registry

Procmon was captured without registry operations, so all registry evidence is the Regshot diff. Regshot reports 332 keys added, 635 values added, 138 values modified and 1,742 values deleted; the large majority is Windows Installer, servicing and MUI cache churn.

| Key | Value | Purpose |
|---|---|---|
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{C912E33F-956A-4921-9F55-CC11AE8F09AF}` | `DisplayName` = `Microsoft .NET Runtime - 6.0.36 (x64)` | .NET runtime MSI registration |
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{A9E32B25-994B-4856-A12B-0EBED3050410}` | `DisplayName` = `Microsoft .NET Host FX Resolver - 6.0.36 (x64)` | hostfxr MSI registration |
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{D6932D97-36F1-40B8-9CDC-CA8365B21000}` | `DisplayName` = `Microsoft .NET Host - 6.0.36 (x64)` | Host MSI registration |
| `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{9d3fc73f-1cf4-412c-a1c9-d2ad28ccbd62}` | `BundleCachePath`, `UninstallString`, `ModifyPath` under `C:\ProgramData\Package Cache\…` | Burn bundle registration |
| `HKLM\SOFTWARE\dotnet\Setup\InstalledVersions\x64\sharedhost` | `Version` = `6.0.36`, `Path` = `C:\Program Files\dotnet\` | Runtime location |
| `HKLM\SOFTWARE\WOW6432Node\dotnet\Setup\InstalledVersions\x64\sharedfx\Microsoft.NETCore.App` | `6.0.36` = `0x00000001` | Runtime location |
| `HKLM\SOFTWARE\Classes\Installer\Dependencies\dotnet_runtime_48.144.23141_x64` | `Dependents\{9d3fc73f-…}` | Installer dependency tracking |
| `HKLM\SYSTEM\CurrentControlSet\Services\bam\State\UserSettings\S-1-5-21-…-1001` | entry for `\Device\HarddiskVolume3\Windows\Temp\{1E9D929C-…}\.be\dotnet-runtime-6.0.36-win-x64.exe` | Windows Background Activity Monitor record that the installer ran |

**No autostart key was observed.** The diff contains no `Run`, `RunOnce`, Winlogon, scheduled-task or service entry. The hosted sandbox's "changes the autorun value" tag is therefore not reproduced here. See the heuristics section.

### Mutexes

Not recorded in the evidence used for this post. Procmon and Regshot do not show mutex objects, so the analyst cannot say whether any were created.

### Command lines

Verbatim from Procmon `Process Start` and `Process Create` rows.

```text
"C:\Windows\System32\cmd.exe" /C "C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Launch Game (Multilang No Console).bat"
"ModUpdateUtil.exe"  --melonloader.hideconsole
"PlantsVsZombiesRH.exe" --melonloader.hideconsole
"C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\UnityCrashHandler64.exe" --attach 6636 3274281324544
"C:\Users\w10analysis\AppData\Local\Temp\tmpf42shz.tmp.exe" /install /passive /norestart
"C:\Windows\Temp\{64791A19-1103-42A6-9124-12AE490B1675}\.cr\tmpf42shz.tmp.exe" -burn.clean.room="C:\Users\w10analysis\AppData\Local\Temp\tmpf42shz.tmp.exe" -burn.filehandle.attached=692 -burn.filehandle.self=696 /install /passive /norestart
"C:\Windows\Temp\{1E9D929C-C051-446C-8171-9DA2C3B148E4}\.be\dotnet-runtime-6.0.36-win-x64.exe" -q -burn.elevated BurnPipe.{DAA9A5E3-DE35-4B86-8D05-07B459C95CE6} {03C3A433-15BD-4CBC-9670-5BD4D49DDAA2} 6496
C:\Windows\system32\msiexec.exe /V
C:\Windows\syswow64\MsiExec.exe -Embedding 65A0AB58218B518A0A5F51B4C90EE12C
C:\Windows\syswow64\MsiExec.exe -Embedding 895033BDEEDD2A4C5D934BACAEDC5202
C:\Windows\syswow64\MsiExec.exe -Embedding 1727E1CA4C0EB308020AE33BEEF94ECB
"C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files\MelonLoader\Dependencies\Il2CppAssemblyGenerator\Cpp2IL\Cpp2IL.exe" --game-path "C:\Users\w10analysis\Desktop\PvZ.Fusion.Multi-lang.4.0.5.2.Alpha.by.Blooms\Game Files" --exe-name "PlantsVsZombiesRH" --output-as dummydll --use-processor attributeanalyzer attributeinjector
```

The launcher script also contains `winget install Microsoft.DotNet.Runtime.6 --architecture x64 --accept-package-agreements --accept-source-agreements`. The analyst did not see `winget.exe` start in Procmon, so the analyst does not list it as an observed command. The Procmon rows for the Wireshark `extcap` helpers, `conhost.exe`, `DllHost.exe`, `taskhostw.exe` and `SearchFilterHost.exe` are the analyst's tooling or Windows, not the sample.

### Network

| Indicator | Role |
|---|---|
| `raw.githubusercontent.com` (185.199.110.133) | Mod update source, requested by `ModUpdateUtil.exe`. Hard-coded in the translator DLL as `https://raw.githubusercontent.com/Teyliu/PVZF-Translation/refs/heads/main/PvZ_Fusion_Translator/`. |
| `aka.ms` (23.41.38.10) | Redirect used to find the .NET installer, requested by `PlantsVsZombiesRH.exe` |
| `builds.dotnet.microsoft.com` (23.200.230.78) | .NET 6.0.36 installer download, certificate issued to Microsoft Corporation |
| `api.melonloader.com` (104.26.15.24) | MelonLoader's remote API for assembly generation, requested by `PlantsVsZombiesRH.exe` |
| `ctldl.windowsupdate.com`, `dns.msftncsi.com`, `client.wns.windows.com`, `licensing.mp.microsoft.com` | Windows background traffic. Not an indicator. |
| 8.8.8.8 | The resolver in this VM. Not an indicator. |
| 192.168.122.10:445 | Lab host file share. Not an indicator. |
| 127.0.0.1:15881 | Loopback connections from the game, five attempts, reconnect only. Purpose not established. |

### Packet correlation

Procmon times are local (UTC−7); frame times below are seconds from the first packet at 09:49:23.97 UTC. The two clocks agree: the first GitHub connect is at 02:49:37.73 in Procmon and 13.77 s in the capture.

| Frames | Endpoint | Bytes | Step |
|---|---|---|---|
| 40 to 49 | mDNS / reverse lookups for 192.168.122.10 | small | Windows name resolution, not the sample |
| 58 to 269 | `raw.githubusercontent.com`, three TLS streams (4, 5, 6), 185.199.110.133:443 | about 222 kB received, about 3.3 kB sent | Step 2, mod update fetch |
| 273 to 21,666 | `aka.ms`, then `builds.dotnet.microsoft.com`, streams 7 and 8 | about 29 MB received over stream 8 | Step 4, .NET installer download |
| 21,669 to 21,810 | `ctldl.windowsupdate.com` HTTP GET `authrootstl.cab` | about 85 kB | Windows certificate list refresh while the installer verified signatures. Not the sample. |
| 21,777 to 21,979 | `api.melonloader.com`, stream 11, 104.26.15.24:443 | about 5.3 kB | Step 5, MelonLoader API |
| 21,833 to 24,453 | `client.wns.windows.com`, about every 30 s | about 10 kB per stream | Windows push-notification polling |
| 22,358 | `licensing.mp.microsoft.com` | about 15 kB | Windows licensing |
| stream 1 (7.4 s onward) | 192.168.122.10:445 SMB | about 27 MB, 25 MB of it from the VM | Lab file share. The analyst did not analyse this stream; it is consistent with the analyst's tools writing their logs to the host, but the analyst did not confirm that. |

The 7.4 s to 535 s SMB stream and the lab DNS chatter are outside the sample window.

### Cross-run consistency

Single run, so the analyst cannot say what stays constant between runs. The sandbox report named the installer `tmpueu2jt.tmp.exe`; the local copy is `tmpf42shz.tmp.exe`. Same size class, same command line (`/install /passive /norestart`), different random name, which fits a downloader that names its temp file randomly.

### Other indicators

- Read Me text names the save folder `C:\Users\[Your Username]\AppData\LocalLow\LanPiaoPiao\PlantsVsZombiesRH` and the Discord invite `https://discord.gg/DPAC5ZVJ8T`. Both match what the analyst saw written and contacted.
- `Launch Game (Multilang No Console).bat` is 215 bytes with CRLF line endings.
- The translator DLL also references `https://github.com/Teyliu/PVZF-Translation` and `https://carroti4ch.itch.io/almanac`.
- `Blooms_QOL.dll` carries the build path `C:\Users\rainb\Documents\GitHub\Blooms QOL\Blooms QOL\obj\Debug\net6.0\Blooms_QOL.pdb`, a developer's own path, which fits a hobbyist mod.

## Execution flow

### 1. Repository check (before running anything)

The analyst started from the repository, because that was the Discord user's concern. The tell-tale of a malicious "leaked game" repository is a bot-driven history: steady additions and no deletions. The analyst compared the flagged repository with a known malicious one, `propound294936-wanders/Secret-Glory-Hole-Leaked-2026`.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Code frequency, malicious comparison</div><div class="fig-sub">Secret-Glory-Hole-Leaked-2026: additions every week, no deletions, steadily falling</div></div><div class="fig-draw"><img src="/shared/img/pvz-fusion/code-freq-secret-glory.png" alt="GitHub code frequency chart for Secret-Glory-Hole-Leaked-2026 showing only green additions each week from September to October 2026, no deletions" width="725" height="506" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Contributors, malicious comparison</div><div class="fig-sub">1,675 commits from github-actions[bot], 3 from the owner</div></div><div class="fig-draw"><img src="/shared/img/pvz-fusion/contributors-secret-glory.png" alt="GitHub contributors page for Secret-Glory-Hole-Leaked-2026 showing github-actions[bot] with 1,675 commits and the owner account with 3" width="722" height="548" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Code frequency, PVZF-Translation</div><div class="fig-sub">Additions and deletions mixed, from April 2025 to October 2026</div></div><div class="fig-draw"><img src="/shared/img/pvz-fusion/code-freq-pvzf.png" alt="GitHub code frequency chart for Teyliu/PVZF-Translation showing both additions and deletions across many weeks from April 2025 to October 2026" width="735" height="490" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Contributors, PVZF-Translation</div><div class="fig-sub">Several human accounts, 132, 27, 26 and 9 commits</div></div><div class="fig-draw"><img src="/shared/img/pvz-fusion/contributors-pvzf.png" alt="GitHub contributors page for Teyliu/PVZF-Translation showing several human contributors with between 9 and 132 commits each over three months" width="720" height="636" loading="lazy" /></div></figure>

The flagged repository looks organic and the comparison one looks automated. This is a weak signal on its own: a repository can be taken over later, and it says nothing about what the zip does. So the analyst ran it.

### 2. Launch and mod update

At 02:49:33 `explorer.exe` starts `cmd.exe /C "…\Launch Game (Multilang No Console).bat"`. The script then starts `Game Files\Plugins\ModUpdateUtil.exe --melonloader.hideconsole` at 02:49:36.5. The updater opens three TLS connections to `raw.githubusercontent.com` (frames 58 to 269) and exits at 02:49:38.9.

In those 2.4 seconds it writes `Mods\Blooms_QOL.dll.update` and `Mods\PvZ_Fusion_Translator.dll.update`, then calls `SetRenameInformationFile` to move each over its `.dll`. The analyst did not capture the downloaded files, so the analyst cannot say what changed or whether they differ from the shipped DLLs.

### 3. Game start under MelonLoader

`ModUpdateUtil.exe` starts `PlantsVsZombiesRH.exe` at 02:49:38.7. MelonLoader writes `UserData\Loader.cfg` (02:49:40) and its log, and the game starts `UnityCrashHandler64.exe` for crash reporting. Nothing here departs from a Unity game.

### 4. .NET 6 runtime install

At 02:49:43 the game process contacts `aka.ms` and then `builds.dotnet.microsoft.com`, downloads about 29 MB (stream 8, frames 297 to 21,665) and writes it as `C:\Users\w10analysis\AppData\Local\Temp\tmpf42shz.tmp.exe`. At 02:49:46 it runs that file with `/install /passive /norestart`. The server certificate for the download is issued to Microsoft Corporation for `builds.dotnet.microsoft.com`.

The installer then follows the Burn pattern: a clean-room copy in `C:\Windows\Temp\{64791A19-…}\.cr\`, an elevated engine in `…\{1E9D929C-…}\.be\`, and three MSI installs through `msiexec.exe`. It exits at 02:50:00, and Regshot shows only the runtime's own registrations.

Why a game launches an installer: the launcher script asks `winget` for the same runtime, and MelonLoader needs .NET 6. Which of the two actually started the installer the analyst cannot prove, but Procmon names the parent as `PlantsVsZombiesRH.exe` (PID 6636), not `cmd.exe`. The analyst did not verify the installer's Authenticode signature. The TLS certificate and the Microsoft names in the Uninstall keys are what supports calling it genuine.

### 5. Assembly generation

At 02:50:09 the game's loopback connections to 127.0.0.1:15881 begin and fail five times. At 02:50:12 it contacts `api.melonloader.com`. At 02:50:13 it runs `Cpp2IL.exe --game-path … --output-as dummydll`, which writes the 49 helper DLLs under `cpp2il_out` and a `capstone.dll` into `Cpp2IL_Temp`. Cpp2IL exits at 02:52:06 and the game writes `MethodXrefScanCache.db` at 02:54:26. The game was still running when the analyst stopped the capture.

### Sandbox tags and heuristics reviewed

- **"Executing a file with an untrusted certificate" (`tmpueu2jt.tmp.exe`, `dotnet-runtime-6.0.36-win-x64.exe`).** Not supported. In the local run the file is the Microsoft .NET installer, fetched from a Microsoft host over a Microsoft-issued TLS certificate. The analyst did not check the file's embedded signature, so the analyst cannot say what produced the sandbox's "untrusted" verdict. A guest without current root certificates would trigger it; the local capture shows the guest fetching `authrootstl.cab` from Windows Update in the same window (frame 21,675).
- **"Changes the autorun value in the registry."** Not reproduced. The Regshot diff has no `Run`, `RunOnce` or related key. Burn installers normally create a `RunOnce` resume entry during setup and delete it on success, which a net diff would not show. The analyst could not see it either way because Procmon had no registry operations.
- **"Starts itself from another location" and "Executable content was dropped or overwritten."** The Burn clean-room and elevated copies under `C:\Windows\Temp\{GUID}\.cr` and `.be` explain both.
- **"Process creates files with name similar to system file names."** `msiexec.exe` writing `C:\Config.Msi\*.rbs` rollback files, and WinRAR in the sandbox, are normal.
- **"Starts CMD.EXE for commands execution."** `cmd.exe` runs the shipped `.bat` launcher, which only runs `winget`, `cd` and `start`.
- **"Searches for installed software" and "Reads the Windows owner or organization settings."** Both are routine for MSI and Burn setup.
- **Windows telemetry.** The `client.wns.windows.com` connections every 30 s, `licensing.mp.microsoft.com`, `ctldl.windowsupdate.com` and `dns.msftncsi.com` are Windows, not the sample. `taskhostw.exe` and `smartscreen.exe` activity is also Windows.
- **Loopback to port 15881.** Repeated reconnects to a local port with no listener look like beaconing in a flat list. No packet leaves the machine, and the analyst did not trace what the game expects there.
- **Wireshark helper processes.** `USBPcapCMD.exe`, `etwdump.exe` and the `Conhost.exe` rows at 02:49:10 are Wireshark's capture interface helpers from the analyst's own tool folder, 23 s before the launcher ran.

## Reverse engineering notes

This is string-level static work only; the analyst did not decompile anything.

- `PvZ_Fusion_Translator.dll` is a 32-bit .NET assembly built for MelonLoader/IL2CPP. Its strings include `HttpClient` and the `raw.githubusercontent.com/Teyliu/PVZF-Translation/…` URLs above. The analyst found no credential-store, browser-profile, webhook or token strings in it.
- `Blooms_QOL.dll` is a small 12 kB assembly that references only game types (`Plant`, `Board`, `Magnetshroom`, `SuperMachineNut`) and has no network references in strings.
- `ModUpdateUtil.exe` is a 62 MB .NET single-file bundle, so `strings` only shows the runtime. Its update URL is not visible. The analyst inferred the destination from the packet capture. Its `.update` string is present.
- `PlantsVsZombiesRH.exe` and `GameAssembly.dll` (59 MB) were not examined.

## Detection

Do not alert on the pack itself. Alert on deviations from the behaviour below.

- **File:** Mod DLLs in `Game Files\Mods\` whose hash differs from the repository's published release; any `.exe` in `Mods\` or `Plugins\` other than `ModUpdateUtil.exe`; files under `Game Files\` written outside the game folder, `%TEMP%`, `AppData\LocalLow\LanPiaoPiao` and `C:\Windows\Temp\{GUID}`.
- **Registry:** A new `Run`, `RunOnce`, scheduled task or service created by `PlantsVsZombiesRH.exe`, `ModUpdateUtil.exe` or `tmp*.tmp.exe` other than the .NET Uninstall and `dotnet\Setup` keys listed above.
- **Process:** `PlantsVsZombiesRH.exe` spawning anything other than `UnityCrashHandler64.exe`, `Cpp2IL.exe` and a Microsoft .NET installer; `ModUpdateUtil.exe` spawning anything other than the game; `powershell.exe`, `wscript.exe` or `mshta.exe` as children of either.
- **Network:** Connections from the game or updater to hosts other than `raw.githubusercontent.com`, `aka.ms`, `builds.dotnet.microsoft.com` and `api.melonloader.com`; any upload volume from the game process to a non-Microsoft host. A changed `raw.githubusercontent.com` path outside `Teyliu/PVZF-Translation` is the signal that the update channel has been redirected.

## MITRE ATT&CK

This table lists what the analyst observed, not claimed attacker behaviour. None of it is malicious in this run. Tags are analyst mappings; the analyst did not use the sandbox's matrix.

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1059.003 Windows Command Shell | `cmd.exe /C` running the launcher `.bat`. Legitimate use. |
| Command and Control | T1105 Ingress Tool Transfer | Updater downloads two `.dll.update` files from `raw.githubusercontent.com`; game downloads the .NET installer. Legitimate source in both cases. |

Techniques deliberately not tagged: Masquerading (Burn's `.cr` and `.be` copies and `tmp*.tmp.exe` names are a Microsoft installer convention), Persistence (no autostart key observed), Credential Access, Discovery and Collection (no access to browser or credential stores seen in Procmon), Exfiltration (no upload beyond TLS handshakes and requests), and Impact (no files modified outside the game and installer paths).

## Confidence and limits

**Observed.** In one Windows 10 run of the zip on 25 October 2026, the chain was: `.bat` launcher, `ModUpdateUtil.exe`, two GitHub downloads renamed over the shipped mod DLLs, `PlantsVsZombiesRH.exe` under MelonLoader, a Microsoft .NET 6.0.36 runtime installed with the installer's own command line, then Cpp2IL building helper assemblies. No autostart key, no scheduled task, no service, no credential-store access and no upload to a non-Microsoft or non-GitHub host was seen. The only external destinations were `raw.githubusercontent.com`, `aka.ms`, `builds.dotnet.microsoft.com`, `api.melonloader.com` and Windows services.

**From the code only.** The translator DLL contains the GitHub update URLs and an `HttpClient` reference. Neither mod DLL contains webhook, token, password or browser-profile strings. This rests on `strings` output and is not proof of absence.

**Inferred.** The .NET installer is genuine, because it came from a Microsoft host with a Microsoft certificate and registered Microsoft-named products. The hosted sandbox's "untrusted certificate" tag probably comes from the guest lacking current root certificates. The project is a community mod that follows the usual MelonLoader pattern. On this evidence the analyst rates the pack as **not malicious**.

**Not established.**
- What the two downloaded `.dll.update` files contain, or whether they match the DLLs in the zip. The analyst did not capture them. A malicious update could be served later and would not show in this run.
- The Authenticode signature of `tmpf42shz.tmp.exe` and of the five executables in the zip.
- The behaviour of `ModUpdateUtil.exe` internally (62 MB bundle, not decompiled), `GameAssembly.dll` and `PlantsVsZombiesRH.exe`.
- Mutexes, and any registry value created and removed within the run, because Procmon had no registry operations and Regshot shows net change.
- What listens on, or is expected at, `127.0.0.1:15881`.
- The 27 MB SMB stream to 192.168.122.10 (not analysed).
- The `Chinese Vanilla` launcher beyond its size and hash, and the pack's behaviour on a machine with different .NET state.
- Whether the sample from the sandbox submission is byte-identical to the analyst's zip. the analyst has no hash for it.

The residual risk is the update channel. Anyone who controls the GitHub repository can change the code the game loads on the next launch, so run it only from the official release and treat a repository ownership change as a reason to re-check.

### Corrections to earlier reports

| Earlier report | What the data shows |
|---|---|
| Hosted sandbox: "Changes the autorun value in the registry" by `dotnet-runtime-6.0.36-win-x64.exe`. | No `Run` or `RunOnce` value in the Regshot diff in the local run. Likely the Burn installer's temporary resume entry, which the analyst could not see. |
| Hosted sandbox: "Executing a file with an untrusted certificate". | The file the analyst ran came from a Microsoft host over a Microsoft-issued certificate. Signature not verified. |
| The analyst's report, Background: the repository passes the contributor and code-frequency checks, "the analyst is inferring that the PvZ-Fusion repository is legitimate". | The run supports this. It adds that the safety rests on the update channel, which the repository check cannot cover. |
| The analyst's report, Execution flow, IOC and YARA sections: empty template. | Filled in above. No YARA rule is written, because there is no malicious sample to detect. |
| The analyst's report, Background: installer named `tmpueu2jt.tmp.exe`. | The name is random per run. Mine was `tmpf42shz.tmp.exe`. |

*Sources: the analyst's ODT report, `Logfile.CSV` and `Logfile.PML`, Regshot `~res-x64.txt` plus the two `.hivu` hives (diff text only), `pvz.pcapng` read with tshark, and `strings` on `ModUpdateUtil.exe`, `PvZ_Fusion_Translator.dll` and `Blooms_QOL.dll`. The two `.hivu` hives, the PML and the game assets were not analysed beyond that.*

## References

- Standalone execution-chain report (the analyst's artifact, private until shared): https://claude.ai/artifact/N8F1pMhS9Ts4RooZEsxoRs
- Hosted sandbox report: https://tria.ge/261025-f36rvad14x
- Repository checked: https://github.com/Teyliu/PVZF-Translation
- Comparison repository (malicious, not to be downloaded): `propound294936-wanders/Secret-Glory-Hole-Leaked-2026`
- MelonLoader: https://github.com/LavaGang/MelonLoader
- Cpp2IL: https://github.com/SamboyCoding/Cpp2IL
- WiX Burn bootstrapper: https://wixtoolset.org/docs/tools/burn/
