---
title: "BadRabbit: dropper, driver and locker execution chain"
description: "`BadRabbit.exe` is a 441,899-byte PE32 console executable with SHA-256 `630325ca…58d0da`. Its version information names \"Adobe Flash Player Installer/Uninstaller 27.0 r0\" and the original file name `FlashUtil.exe`. It was run on Windows 10 22H2 x64 from `C:\\binaries\\BadRabbit.exe`."
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-26
---

*Analysis dates: the detonation and packet capture ran on 10 August 2026 on an isolated Windows 10 VM; static and code analysis followed, and the analyst's report went to version 2 on 28 August 2026. Screenshots are from that work. This post re-checks the report against the raw Procmon, Regshot and Wireshark files, so a few numbers differ from the PDF. Those differences are listed below.*

## Summary

Bad Rabbit is the ransomware that spread from compromised Russian and Ukrainian websites in October 2017 by posing as an Adobe Flash update. It is a dropper wrapped around three things: a DLL that does the installation and tries to spread, a lock-screen program that takes over the boot process, and a legitimate open-source disk-encryption driver turned to malicious use.

On the local VM the sample finished its installation in about three seconds. It wrote a DLL, a driver and a locker into `C:\Windows`, registered the driver as a boot-start service, and created two scheduled tasks: one that launches the locker at every boot and one that forces a reboot. A discovery sweep of the local /24 began at the same moment. Nothing on that network answered, so the **capture contains no lateral movement at all**, only ARP requests, unanswered name lookups and TCP SYNs that were refused. The analyst's captures stop before the reboot, so the ransom screen comes from the analyst's screenshots and the strings in the locker, not from telemetry.

| | |
|---|---|
| Sample | `BadRabbit.exe`, 441,899 B, PE32 console |
| SHA-256 | `630325cac09ac3fab908f903e3b00d0dadd5fdaa0875ed8496fcbb97a558d0da` |
| SHA-1 | `de5c8d858e6e41da715dca1c019df0bfb92d32c0` |
| MD5 | `fbbdc39af1139aebba4da004475e8839` |
| Disguise | "Adobe Flash Player Installer/Uninstaller 27.0 r0", original name `FlashUtil.exe` |
| Environment | Windows 10 22H2 x64 (build 19045), sample run from `C:\binaries\BadRabbit.exe` |
| Telemetry | Procmon capture, Regshot before/after, Wireshark on the guest (3,678 frames, 638 s), FLOSS output, IDA |

A standalone, print-ready execution-chain report with every command line, registry value and frame range accompanies this post.

## Concepts used in this sample

- **Overlay and embedded zlib streams.** The executable's real content sits after the end of the PE, as four compressed blocks. Tools that only read the PE sections see very little.
- **rundll32 and ordinal exports.** `rundll32.exe file.dll,#1` runs the first exported function of a DLL by number. The dropped DLL has no readable export name to match on.
- **Boot-trigger scheduled task.** A task with an `ONSTART` trigger runs as SYSTEM every time Windows starts, before anyone logs in.
- **Filter drivers.** Windows lets drivers sit above or below the disk and volume drivers and see every read and write. Registering a driver in the right filter list is how disk-encryption software gets in the path.
- **DiskCryptor.** An open-source full-disk encryption tool (`dcrypt.sys`). Bad Rabbit ships a copy and uses it to encrypt the disk at the driver level.
- **Background Activity Moderator (BAM).** A Windows registry record of when each program last ran. It matters here because it gives an exact start time, and because the analyst's first report misread it.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Bad Rabbit at a glance</div><div class="fig-sub">From the Flash installer to the boot-time lock screen</div></div><div class="fig-draw" role="img" aria-label="Launch as a Flash installer, unpack infpub.dat, run it with rundll32, drop the DiskCryptor driver and the locker and register the driver service, create the rhaegal boot task and the drogon reboot task, start a helper with a named pipe, probe the local network with nothing answering, then reboot to the lock screen."><svg viewBox="0 0 520 468" width="520" height="468" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 432" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Launch as a Flash installer</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">BadRabbit.exe from C:\binaries, version resource says Adobe Flash Player</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Unpack</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">Overlay zlib stream becomes C:\Windows\infpub.dat</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Run the DLL</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">rundll32 C:\Windows\infpub.dat,#1 15</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="200" r="3" style="fill:var(--accent)"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Drop and register</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">cscc.dat (DiskCryptor driver), dispci.exe, service cscc</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Schedule</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">rhaegal at boot runs dispci.exe; drogon forces a reboot</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Helper process</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">4788.tmp started with a named pipe (credential theft, inferred)</text><circle cx="11" cy="374" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="372" font-size="15" style="fill:var(--ink)">Look for neighbours</text><text x="34" y="390" font-size="13" style="fill:var(--ink-3)">ARP, reverse DNS and closed-port probes; nothing answers</text><circle cx="11" cy="432" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="432" r="3" style="fill:var(--accent)"/><text x="34" y="430" font-size="15" style="fill:var(--ink)">Reboot and lock</text><text x="34" y="448" font-size="13" style="fill:var(--ink-3)">dispci.exe lock screen. Not covered by any capture</text></svg></div></figure>

## Indicators of compromise

### Files

All full paths were seen in Procmon. Hashes are for the files the analyst recovered. `infpub.dat` was carved from the sample because the analyst did not hash the dropped copy.

| Path | SHA-256 | Role |
|---|---|---|
| `C:\Windows\infpub.dat` | `579fd8a0385482fb4c789561a30b09f25671e86422f40ef5cca2036b28f99648` (carved) | 32-bit DLL, 410,760 B. Installation, tasks, service, spreading and file-encryption logic |
| `C:\Windows\cscc.dat` | `0b2f863f4119dc88a22cc97c0a136c88a0127cb026751303b045f7322a8972f6` | 64-bit driver, 210,632 B, DiskCryptor `dcrypt.sys` 1.1.846.118 |
| `C:\Windows\dispci.exe` | `8ebc97e05c8e1073bda2efb6f4d00ad7e789260afa2c276f0c72740b838a0a93` | Locker and lock-screen program, 142,848 B |
| `C:\Windows\4788.tmp` | not captured | Helper started with a named-pipe argument |
| `C:\Windows\System32\Tasks\rhaegal` and `...\drogon` | not recovered | Task definitions |

Inside `infpub.dat` there are also a 32-bit DiskCryptor driver (`682adcb5…`, 181,448 B) and two small helpers with `lsass.exe`, `lsasrv.dll` and `wdigest` strings (`2f8c54f9…` for x86, `301b905e…` for x64). They were not dropped on this x64 host. No self-copies, harvested data or exfiltration archives were observed.

### Registry

From the Regshot diff, 577 changes in total.

| Key | Value | Role |
|---|---|---|
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tasks\{6E1F04AA-10D4-40DA-875E-AB650022AC49}` | `\rhaegal`, date `2026-08-10T00:04:24`, action `cmd.exe /C Start "" "C:\Windows\dispci.exe" -id 3051760386 && exit` | Boot task (also under `TaskCache\Boot`) |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tasks\{D4EA1666-D611-430C-8EB6-75B8358EA5F2}` | `\drogon`, action `shutdown.exe /r /t 0 /f` | One-shot reboot (also under `TaskCache\Plain`) |
| `HKLM\SYSTEM\CurrentControlSet\Services\cscc` | Type 1, Start 0 (boot), ErrorControl 3, `ImagePath` `cscc.dat`, DisplayName `Windows Client Side Caching DDriver`, Group `Filter`, DependOnService `FltMgr` | Boot-start driver |
| `HKLM\SYSTEM\CurrentControlSet\Control\Class\{71a27cdd-812a-11d0-bec7-08002be2092f}\LowerFilters` | `cscc` added in front of `fvevol`, `iorate`, `rdyboost` | Driver in the volume filter stack |
| `HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e965-e325-11ce-bfc1-08002be10318}\UpperFilters` | `cscc` added | CD-ROM class filter |
| `HKLM\SYSTEM\CurrentControlSet\Control\CrashControl\DumpFilters` | `cscc` added in front of `dumpfve.sys` | Crash-dump path |

No Run, RunOnce, Winlogon or Image File Execution Options key changed. The rest of the diff is Explorer view state, notification and search bookkeeping, a certificate added by Windows, and keys written by the analyst's analysis tools.

### Mutexes

None observed. `infpub.dat` creates a named mutex whose name is built from the computer name, so it differs on every host and is not an indicator. `cscc.dat` initialises an unnamed kernel mutex, which is also not one.

### Command lines

Verbatim from Procmon.

```text
C:\Windows\system32\rundll32.exe C:\Windows\infpub.dat,#1 15
\??\C:\Windows\system32\conhost.exe 0xffffffff -ForceV1
schtasks  /Delete /F /TN rhaegal
schtasks  /Create /RU SYSTEM /SC ONSTART /TN rhaegal /TR "C:\Windows\system32\cmd.exe /C Start \"\" \"C:\Windows\dispci.exe\" -id 3051760386 && exit"
schtasks  /Create /SC once /TN drogon /RU SYSTEM /TR "C:\Windows\system32\shutdown.exe /r /t 0 /f" /ST 00:22:00
"C:\Windows\4788.tmp" \\.\pipe\{347F5509-AC03-4904-96A3-991922D50A23}
```

The first process runs as `C:\Windows\SysWOW64\rundll32.exe`, so the whole chain is 32-bit.

### Network

| Indicator | Role |
|---|---|
| `caforssztxqzf2nm[.]onion` | Payment site named in the ransom text. Never contacted |
| `192.168.122.0` to `.144` | Sweep targets. ARP, reverse DNS and LLMNR only |
| `192.168.122.1`, `192.168.122.10` | The only hosts that answered ARP; TCP 445, 139 and 80 all refused |
| `dns.msftncsi.com`, `ecs.office.com`, `ctldl.windowsupdate.com`, `fs.microsoft.com` | Windows background lookups, unrelated to the sample |

No external IP address, answered DNS query or completed TCP connection appears in the capture.

## Execution flow

### 1. Start

The analyst ran the sample from `C:\binaries`. Windows recorded the start in BAM at 07:04:21.854 UTC and cached the name "Adobe Flash Player Installer/Uninstaller 27.0 r0" in MuiCache, which shows the disguise worked at the shell level. In the capture, only spanning-tree frames occur between 56.06 s and 58.11 s.

### 2. Unpack the DLL

The sample's overlay holds four zlib streams. Detect It Easy's extractor lists them at offsets `0xde04`, `0x27b82`, `0x3d6f8` and `0x554dd`. The first becomes `infpub.dat`, which the code writes with `CreateFileW` and `WriteFile` to `C:\Windows`.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The overlay streams</div><div class="fig-sub">Detect It Easy extractor on BadRabbit.exe</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/extractor.jpg" alt="Detect It Easy extractor list showing a PE header and four zlib overlay streams at offsets de04, 00027b82, 0003d6f8 and 000554dd" width="777" height="163" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Writing the DLL</div><div class="fig-sub">IDA, CreateFileW on C:\Windows\infpub.dat followed by WriteFile</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/code-createfile.jpg" alt="Disassembly pushing the string C:\Windows\infpub.dat before calling CreateFileW and then WriteFile" width="631" height="540" loading="lazy" /></div></figure>

### 3. Run it

The dropper builds `%ws C:\Windows\%ws,#1 %ws` with `wsprintfW`, then calls `CreateProcessW`. The result is `rundll32.exe C:\Windows\infpub.dat,#1 15`, run by the 32-bit `rundll32` with a console host beside it. The analyst does not know what `15` means. The DLL contains a `Sleep(minutes × 60000)` ahead of a shutdown routine, so a delay in minutes is plausible, but the analyst did not tie the two together.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Building the command</div><div class="fig-sub">IDA, wsprintfW with the rundll32 template</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/code-rundll32.jpg" alt="Disassembly passing infpub.dat and the format string ws C:\Windows\ws,#1 ws to wsprintfW" width="591" height="271" loading="lazy" /></div></figure>

### 4. Drop the driver and the locker

The DLL enables `SeShutdownPrivilege`, `SeDebugPrivilege` and `SeTcbPrivilege`, then writes `cscc.dat` and `dispci.exe` from its own zlib resources. Procmon and ProcDOT show both files created from the same thread, followed by three `cmd.exe` children.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Privileges first</div><div class="fig-sub">IDA, privilege adjustment in infpub.dat</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/code-privileges.jpg" alt="Disassembly of the privilege routine referencing SeShutdownPrivilege, SeDebugPrivilege and SeTcbPrivilege" width="419" height="513" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Files and child processes</div><div class="fig-sub">ProcDOT graph from the Procmon capture</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/procdot-drops.jpg" alt="ProcDOT graph with a thread creating the files C:\Windows\cscc.dat and C:\Windows\dispci.exe and three cmd.exe processes with PIDs 2300, 64 and 3964" width="764" height="613" loading="lazy" /></div></figure>

### 5. Register the driver

`CreateServiceW` creates `cscc` with the display name "Windows Client Side Caching DDriver", the double D being the author's typo. Start type 0 means it loads at boot and error control 3 means a failure to load is treated as critical. The DLL then edits three filter lists (see the registry table), so the driver sits at the bottom of the volume stack and in the crash-dump path. The driver itself is DiskCryptor 1.1.846.118.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The service definition</div><div class="fig-sub">IDA, CreateServiceW with name cscc, group Filter and dependency FltMgr</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/code-createservice.jpg" alt="Disassembly pushing the DisplayName Windows Client Side Caching DDriver, ServiceName cscc, BinaryPathName cscc.dat, group Filter and a dependency before calling CreateServiceW" width="758" height="452" loading="lazy" /></div></figure>

### 6. Schedule the next stages

Three commands run through `cmd.exe`: delete `rhaegal` if it exists, create `rhaegal` to run `dispci.exe -id 3051760386` as SYSTEM at startup, and create `drogon` to run `shutdown.exe /r /t 0 /f` once at 00:22:00. Both tasks were registered at 00:04:24 local time, which is 07:04:24 UTC, so `drogon` fires 17 minutes 36 seconds later. The analyst's report said 15 minutes. A second reboot path exists in the DLL: a thread checks that the system is not already shutting down, deletes `drogon` and calls `InitiateSystemShutdownExW` with a forced reboot. Whichever comes first wins.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The built-in reboot</div><div class="fig-sub">IDA, InitiateSystemShutdownExW with force and reboot set</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/code-shutdown.jpg" alt="Disassembly pushing reason 80000000h, bRebootAfterShutdown 1 and bForceAppsClosed 1 before calling InitiateSystemShutdownExW" width="611" height="278" loading="lazy" /></div></figure>

### 7. A helper with a pipe

`C:\Windows\4788.tmp` is created and started with `\\.\pipe\{347F5509-AC03-4904-96A3-991922D50A23}` as its only argument. The analyst did not capture the file. The DLL carries two small executables that mention `lsass.exe`, `lsasrv.dll` and `wdigest` and also formats a `\\.\pipe\%ws` name, so the analyst read this as a credential-theft helper reporting back over a pipe. That is an inference. The analyst's earlier report listed those two files as "unknown", and the word "mimikatz" does not appear in the strings.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The helper process</div><div class="fig-sub">ProcDOT graph, 4788.tmp with PID 6188</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/procdot-4788.jpg" alt="ProcDOT graph showing the file C:\Windows\4788.tmp created and a process 4788.tmp with PID 6188 based on it" width="720" height="209" loading="lazy" /></div></figure>

### 8. Sweep the network

At 58.36 s, within a second of the tasks being registered, the guest announces itself to the browser service and asks for `WORKGROUP<1b>`. It then sends 1,547 ARP requests across `192.168.122.0` to `.144` (44 addresses are asked 15 times, 90 are asked 9 times), 410 reverse-DNS queries, and 600 LLMNR frames repeating them. Only the hypervisor bridge and the analyst's REMnux host answer ARP. The guest sends SYNs to ports 445, 139 and 80 on those two machines, and every one is refused. There is **no SMB negotiation, no `ADMIN$` or `IPC$` access and no SYN-ACK in the file**. The packet capture carries no process names, so the analyst attributes the sweep to the sample because it starts at the same moment as the task registration.

### 9. Reboot

The capture's last frame is at 07:14:04, and the analyst's second Regshot is at 07:12:49. Both are before the 07:22:00 reboot. After the reboot, `rhaegal` starts `dispci.exe`, which shows a black text screen and a password prompt. The VM did not allow a login afterwards, which fits the bootloader strings in `dispci.exe` (`partition unbootable`, `this disk is unbootable`, `Run DECRYPT app at your desktop after system boot`), but the analyst did not capture a disk write.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The lock screen</div><div class="fig-sub">Screenshot after the reboot, installation key blurred</div></div><div class="fig-draw"><img src="/shared/img/badrabbit/ransom-screen.jpg" alt="Black text-mode screen reading Oops! Your files have been encrypted, with instructions to visit an onion address, a blurred personal installation key and a password prompt" width="600" height="376" loading="lazy" /></div></figure>

**Present in the code, not exercised in the local run.** The DLL has a 113-extension list of file types to encrypt (documents, databases, virtual disks, keys and archives) that skips `\AppData`, `\ProgramData`, `\Program Files` and `\Windows`, an embedded RSA public key, a `wevtutil cl` log-clearing command, `\\%s\admin$` and `IPC$` copy logic, a `wmic ... process call create` launcher, and 63 default usernames and passwords. These are findings from strings and disassembly. Nothing in the analyst's telemetry shows any of them running.

### Sandbox tags and heuristics reviewed

No hosted-sandbox report exists for this sample, so there were no sandbox tags to review. Lookalike lab artifacts (the BAM key, `KeInitializeMutex`) are listed under Corrections to earlier reports.

## Detection

**YARA.** Three rules written from strings in the sample and tested with YARA 4.5.0 against `BadRabbit.exe`, the eight carved resources, the dropped `cscc.dat` and `dispci.exe`, `/bin/ls` and `/usr/bin/python3`. Each rule matches only its intended file. `cscc.dat` is stock DiskCryptor, so it is better matched by hash than by rule.

```yara
rule BadRabbit_Dropper_Outer
{
    meta:
        description = "BadRabbit.exe outer dropper: Flash-installer version resource, rundll32 launch template, infpub.dat path, embedded zlib 1.2.8"
    strings:
        $v1   = "Adobe Flash Player Installer/Uninstaller" wide
        $v2   = "FlashUtil.exe" wide
        $path = "C:\\Windows\\infpub.dat" wide
        $cmd  = "%ws C:\\Windows\\%ws,#1 %ws" wide
        $z    = "inflate 1.2.8 Copyright 1995-2013 Mark Adler" ascii
    condition:
        uint16(0) == 0x5A4D and filesize < 2MB and $z and 2 of ($v1, $v2, $path, $cmd)
}

rule BadRabbit_Infpub_Dll
{
    meta:
        description = "infpub.dat: task names, fake driver service text, onion address, wevtutil and admin-share logic"
    strings:
        $t1    = "schtasks /Delete /F /TN rhaegal" wide ascii
        $t2    = "schtasks /Create /SC once /TN drogon" wide ascii
        $svc   = "Windows Client Side Caching DDriver" wide ascii
        $onion = "caforssztxqzf2nm.onion" wide ascii
        $w1    = "wevtutil cl" wide ascii
        $w2    = "\\\\%s\\admin$" wide ascii
        $f     = "cscc.dat" wide ascii
    condition:
        uint16(0) == 0x5A4D and filesize < 2MB and 2 of ($t1, $t2, $svc) and 2 of ($onion, $w1, $w2, $f)
}

rule BadRabbit_Dispci_Locker
{
    meta:
        description = "dispci.exe: boot-time lock screen and bootloader error strings"
    strings:
        $a = "Oops! Your files have been encrypted." wide ascii
        $b = "caforssztxqzf2nm.onion" wide ascii
        $c = "Run DECRYPT app at your desktop after system boot" ascii
        $d = "this disk is unbootable" ascii
        $e = "Incorrect password" wide ascii
    condition:
        uint16(0) == 0x5A4D and filesize < 2MB and $a and $b and 2 of ($c, $d, $e)
}
```

These are string rules, so a repacked or modified build can evade them, and the analyst did not run them against a large clean corpus.

**Behavior.**

- `schtasks` creating tasks named `rhaegal` or `drogon`, or any SYSTEM task whose action is `dispci.exe -id <number>`.
- `rundll32.exe C:\Windows\<name>.dat,#1 <number>` with a DLL in the Windows folder named like a harmless `.dat` file.
- A new service with `Start=0`, `Group=Filter` and an `ImagePath` of a bare `.dat` file name, or a new entry at the front of the volume `LowerFilters` list.
- A `.tmp` file in `C:\Windows` run with a `\\.\pipe\{GUID}` argument.
- A host sending hundreds of ARP and reverse-lookup requests over its whole /24 within seconds of a new scheduled task appearing.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1204.002 User Execution: Malicious File | Fake Flash installer run by the user |
| Defense Evasion | T1036.005 Match Legitimate Name or Location | Fake Flash installer name |
| Defense Evasion | T1027.009 Embedded Payloads / T1140 Deobfuscate/Decode Files | Four zlib streams in the overlay |
| Defense Evasion | T1218.011 Rundll32 | `rundll32.exe C:\Windows\infpub.dat,#1 15` |
| Persistence | T1543.003 Windows Service | `cscc` boot-start filter driver |
| Defense Evasion | T1112 Modify Registry | Filter-list edits |
| Execution / Persistence | T1053.005 Scheduled Task / T1059.003 Windows Command Shell | `rhaegal` and `drogon` tasks created through `cmd.exe` |
| Impact | T1529 System Shutdown/Reboot | `drogon` forced reboot |
| Discovery | T1018 Remote System Discovery / T1046 Network Service Discovery | Local network sweep in the capture |
| Impact | T1486 Data Encrypted for Impact | The locker (`dispci.exe`) |
| Lateral Movement | T1021.002 SMB/Windows Admin Shares | From code only |
| Credential Access | T1110.003 Password Spraying | From code only (default credentials) |
| Defense Evasion | T1070.001 Clear Windows Event Logs | From code only (`wevtutil`) |
| Execution | T1047 Windows Management Instrumentation | From code only (`wmic`) |
| Credential Access | T1003.001 LSASS Memory | Inferred (credential helper) |
| Impact / Defense Evasion | T1542.003 Bootkit / T1561.002 Disk Structure Wipe | Inferred (boot-level changes) |

## Confidence and limits

**Observed.** The full process chain and command lines in Procmon, the three dropped files and their hashes, every registry change listed above, the start time from BAM, the task registration time, and every frame range in the capture, including the absence of any SYN-ACK, SMB session or answered DNS query.

**From the code or strings only.** The mutex name logic, the privilege adjustments, the file-extension list, the RSA public key, log clearing, remote execution through `wmic` and admin shares, and the default-credential list.

**Inferred.** That `4788.tmp` steals credentials, that the sweep belongs to the sample (timing only, since the capture has no process names), that the `15` argument is a delay, and that the reboot overwrites boot structures.

**Not established.** The hash of `4788.tmp` and of the dropped `infpub.dat`, the computed mutex name for the analyst's host, what transforms the two "packed" outer streams into the final files, whether `-id` is generated per run (the task table in the analyst's report shows a different value, `1675483173`, from an execution the analyst did not document), and everything after the reboot. This is a single detonation, so process IDs, the `4788` file name and the pipe GUID should not be used as indicators until a second run confirms them.

### Corrections to earlier reports

Going back to the raw files turned up several points where the analyst's report v2 was wrong or overstated:

- **The BAM key is not a boot blocker.** the analyst wrote that the `bam\State\UserSettings` value "probably prevents the user from loading into Windows". It is the Background Activity Moderator's last-run timestamp, and it decodes to 07:04:21.854 UTC. It is the best start-time evidence the analyst has.
- **`drogon` fires after 17 min 36 s, not about 15 minutes.** Registered 00:04:24, scheduled 00:22:00.
- **The SHA-256 in the analyst's hash table was the SHA-1.** The sample's SHA-256 is `630325ca…58d0da`.
- **The sizes in the analyst's DIE tables are not file sizes.** the analyst listed `dispci.exe` as 368,640 bytes and `cscc.dat` as 225,280. On disk they are 142,848 and 210,632. The larger numbers look like PE image sizes, which the analyst did not verify.
- **The "packed" streams are not copies.** the analyst called stream `0x554dd` a packed `dispci.exe` and `0x27b82` a packed 32-bit driver because their DIE sizes matched. Their on-disk sizes and hashes differ from the final files, so they are related by role only.
- **`KeInitializeMutex` is not a mutex indicator.** It creates an unnamed kernel object.
- **The behaviour graph says the driver and locker "start encrypting" when they are dropped.** No telemetry shows encryption before the reboot.
- **The SMB propagation is from the code, not the network.** the analyst wrote that the DLL tries to access other systems with hard-coded credentials. That is true of the code. There is no authentication attempt in the capture.
- **The analyst's network-analysis, mutex and DNS sections were empty.** They are filled in here.

## References

- Local lab analysis, report v2 (28 August 2026), Procmon, Regshot and Wireshark captures of 10 August 2026
- DiskCryptor project, `dcrypt.sys`
