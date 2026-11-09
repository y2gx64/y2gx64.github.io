---
title: "WannaCry: a kill-switch check, a ransomware toolkit with its own Tor client, and an SMB scan nobody answered"
description: A walk through wannacry.exe from first launch to ransom screen, built from my own lab analysis and two Triage detonations with packet captures. Includes the full process chain, what the sandbox tags got wrong, and rules that were tested against the sample.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-25
---

*Analysis dates: local lab run and static/code analysis on 9 August 2026; Triage detonations and packet captures on 25 October 2026. Everything ran inside isolated VMs. Screenshots come from my local run, which used the unique folder `utuksgkdlqz386`. Tables of process lines, registry values and traffic come from the two Triage runs, whose folders are `hiahnvaqd300` and `siflatfmsonert539`.*

## Summary

WannaCry is the 2017 ransomware worm that spread over SMB using the EternalBlue exploit (MS17-010). It is two programs in one: a ransomware component, and a propagation component that scans for other machines on port 445. This sample is the original build, with the kill-switch domain still present.

In both sandbox runs the machine was encrypted within the three-minute window, shadow copies were deleted, and a scanner started probing about 3,000 addresses. Two details matter for reading the results. The kill-switch domain never resolved, because the sandbox answers no DNS, so the sample was free to run. And the scanner got no reply from anything, so **no exploit traffic exists in the captures**, only SYN packets.

| | |
|---|---|
| Sample | `wannacry.exe`, 3,723,264 B, PE32 |
| SHA-256 | `24d004a104d4d54034dbcffc2a4b19a11f39008a575aa614ea04703480b1022c` |
| MD5 | `db349b97c37d22f5ea1d1841e3c89eb4` |
| SHA-1 | `e889544aff85ffaf8b0d0da705105dee7c97fe26` |
| Triage sample | `261025-nq1n3ag14l`, score 10/10, "Known bad", family Wannacry |
| Triage runs | win10v2004-20260911-en (176 s kernel, 177 s network) and win11-20260911-en (177 s, 179 s) |
| Packet captures | `win10.pcapng` (9,681 frames, 177 s) and `win11.pcapng` (10,056 frames, 180 s) |
| Triage tags | wannacry, ransomware, worm, persistence, plus `spyware` and `stealer` (not supported, see below) |

A standalone, print-ready execution-chain report with every registry value, command line and frame number accompanies this post.

## Concepts used in this sample

- **Kill switch.** Before doing anything, the sample requests a URL on a long nonsense domain. If the request succeeds, it exits. In 2017 a researcher registered that domain and the first wave stopped. If the domain does not resolve, as in a sandbox with no DNS, the sample continues.
- **EternalBlue (MS17-010).** A flaw in how Windows handles SMBv1 messages, which lets an attacker run code on a remote machine. The worm half of WannaCry scans for hosts with port 445 open and tries this exploit.
- **Bundled Tor client.** The ransomware ships a copy of Tor and uses it as its channel for payment contact, so victims' traffic does not rely on any one server.
- **Volume Shadow Copy.** Windows keeps point-in-time copies of files that let users roll back. Deleting them removes the easiest way to recover without paying (T1490).
- **WOW64 registry redirection.** A 32-bit program writing to `HKLM\SOFTWARE` lands in `HKLM\SOFTWARE\WOW6432Node`. This matters when matching a command line to the key Triage reports.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">WannaCry at a glance</div><div class="fig-sub">From first launch to ransom screen, with the scan running alongside</div></div><div class="fig-draw" role="img" aria-label="Check the kill-switch domain, drop tasksche.exe and start service mode, move to a unique ProgramData folder, unpack resources and open permissions, run script and decryptor modes, delete shadow copies, add a Run key, encrypt files and show the ransom screen. An SMB scan runs in parallel from about 26 seconds."><svg viewBox="0 0 520 526" width="520" height="526" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 490" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Check the kill switch</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">DNS lookup of a nonsense domain; exits if it resolves</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Drop and start</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">tasksche.exe into C:\WINDOWS, service mode with -m security</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Install</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">Copy to C:\ProgramData\&lt;UID&gt;, relaunch through cmd.exe</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Unpack</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">Resources, hidden folder, icacls Everyone:F</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Decryptor and Tor</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">co and vs modes, bundled taskhsvc.exe</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="316" r="3" style="fill:var(--accent)"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Destroy recovery</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">vssadmin, wmic, bcdedit and wbadmin in one line</text><circle cx="11" cy="374" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="372" font-size="15" style="fill:var(--ink)">Persist</text><text x="34" y="390" font-size="13" style="fill:var(--ink-3)">HKLM Run value written by reg.exe</text><circle cx="11" cy="432" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="432" r="3" style="fill:var(--accent)"/><text x="34" y="430" font-size="15" style="fill:var(--ink)">Encrypt and extort</text><text x="34" y="448" font-size="13" style="fill:var(--ink-3)">Files renamed .WNCRY, wallpaper, $300 ransom window</text><circle cx="11" cy="490" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="490" r="3" style="fill:var(--accent)"/><text x="34" y="488" font-size="15" style="fill:var(--ink)">Scan in parallel</text><text x="34" y="506" font-size="13" style="fill:var(--ink-3)">SYN to port 445 from about 26 s; nothing answers</text></svg></div></figure>

## Indicators of compromise

### Files

`<UID>` is the per-host folder name. All hashes below are identical across the two Triage runs and my local run, except where noted.

| Path | Status | MD5 | Role |
|---|---|---|---|
| `C:\Users\<user>\Desktop\wannacry.exe` | Pre-existing | not recorded here | The submitted sample, assumed already on the host as the lure. Location depends on the run. |
| `C:\WINDOWS\tasksche.exe` | Dropped | `84c82835a5d21bbcf75a61706d8ab549` | Dropped by `wannacry.exe`, run with `/i` |
| `C:\ProgramData\<UID>\tasksche.exe` | Dropped | `84c82835…` (local run) | Self-copy that does the encryption |
| `C:\ProgramData\<UID>\u.wnry` | Dropped | `7bf2b57f2a205768755c07f238fb32cc` | Becomes `@WanaDecryptor@.exe` |
| `C:\ProgramData\<UID>\taskdl.exe` | Dropped | `4fef5e34143e646dbf9907c4374276f5` | Deletes temp files |
| `C:\ProgramData\<UID>\taskse.exe` | Dropped | `8495400f199ac77853c53b5a3f278f3e` | Starts the decryptor in user sessions |
| `C:\ProgramData\<UID>\TaskData\Tor\taskhsvc.exe` | Dropped | `fe7eb54691ad6e6af77f8a9a0b6de26d` | Bundled Tor client |
| `C:\ProgramData\<UID>\b.wnry`, `r.wnry`, `s.wnry`, `t.wnry` | Dropped | `c1717026…`, `3e0020fc…`, `ad4c9de7…`, `5dcaac85…` | Wallpaper bitmap, note template, Tor archive, encrypted payload |
| `C:\ProgramData\<UID>\c.wnry` | Dropped | differs per run | Configuration, rewritten at runtime |
| `C:\ProgramData\<UID>\<digits>.bat` and `m.vbs` | Dropped | differ per run | Per-host batch and script |
| `C:\ProgramData\<UID>\msg\m_*.wnry` | Dropped | 28 files, identical in all runs | Ransom text in 28 languages |

No file was downloaded during the run: everything above is carried inside `wannacry.exe`. Victim documents are Modified (renamed to `.WNCRY`); they are not listed individually.

`00000000.pky`, `00000000.eky` and `f.wnry` exist in my local run but are not listed by Triage in either run. Victim files get the `.WNCRY` suffix, with `.WNCRYT` temporaries in `C:\Windows\Temp`.

### Registry

| Key | Value | Seen in |
|---|---|---|
| `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run` | `<UID>` = `"C:\ProgramData\<UID>\tasksche.exe"` | Triage, both runs |
| `HKU\<SID>\Control Panel\Desktop\Wallpaper` | path to the ransom bitmap on the Desktop | Triage, both runs |
| `HKLM\SYSTEM\CurrentControlSet\Services\mssecsvc2.0` | `ImagePath` = `... wannacry.exe -m security`, DisplayName "Microsoft Security Center (2.0) Service" | My local run only |
| `HKLM\SYSTEM\CurrentControlSet\Services\<UID>` | `ImagePath` = `cmd.exe /c "C:\ProgramData\<UID>\tasksche.exe"` | My local run only |
| `HKLM\SOFTWARE\WOW6432Node\WanaCrypt0r` | `wd` = `C:\ProgramData\<UID>` | My local run only |

### Mutexes

None was captured at runtime; Triage reports no mutex data. Statically, the string `Global\MsWinZonesCacheCounterMutexA` is in both `wannacry.exe` and `tasksche.exe`, and the disassembly formats it with a numeric suffix (`"%s%d"`) before calling `OpenMutexA`.

### Command lines

```text
C:\Users\Admin\AppData\Local\Temp\wannacry.exe -m security
C:\WINDOWS\tasksche.exe /i
cmd.exe /c "C:\ProgramData\hiahnvaqd300\tasksche.exe"
attrib +h .
icacls . /grant Everyone:F /T /C /Q
C:\Windows\system32\cmd.exe /c 326661792928250.bat
cscript.exe    //nologo m.vbs
attrib +h +s F:\$RECYCLE
@WanaDecryptor@.exe co
cmd.exe /c start /b @WanaDecryptor@.exe vs
cmd.exe /c vssadmin delete shadows /all /quiet & wmic shadowcopy delete & bcdedit /set {default} bootstatuspolicy ignoreallfailures & bcdedit /set {default} recoveryenabled no & wbadmin delete catalog -quiet
cmd.exe /c reg add HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run /v "hiahnvaqd300" /t REG_SZ /d "\"C:\ProgramData\hiahnvaqd300\tasksche.exe\"" /f
```

Triage's PDF masks `@WanaDecryptor@` as an email address; the name is restored here from my own file list.

### Network

| Indicator | Role |
|---|---|
| `www.iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea[.]com` | Kill switch. 10 unanswered DNS queries per run |
| TCP/445 to about 3,100 (win10) and 3,400 (win11) distinct IPv4 addresses | Propagation scan, SYN only |
| 11 and 8 Tor peers on ports 9001, 9101, 443 and 80 | Tor bootstrap by `taskhsvc.exe` (by inference), SYN only |
| `12t9YDPgwueZ9NyMgw519p7AA8isjr6SMw` | Bitcoin address in the note and in `c.wnry` |
| five `.onion` hosts in `c.wnry` (from my local copy) | Contact and payment sites. Not seen on the wire |

### Packet correlation

Both captures contain only traffic leaving the guest. There is no SYN-ACK, no TCP payload frame and no DNS reply anywhere in either file. Every frame belongs to one of four classes:

| Class | win10 frames | win11 frames | Bytes (win10 / win11) |
|---|---|---|---|
| Kill-switch DNS to 8.8.8.8 | 10, within f5–f28 | 10, within f6–f20 | 1,090 / 1,090 |
| Other DNS (Windows telemetry and checks) | 55 | 10 | 4,450 / 760 |
| ARP who-has across 10.127.0.0/16 | 4,260 | 4,582 | 255,312 / 274,614 |
| SYN to port 445 | 5,303, f33–f9679 | 5,414, f22–f10054 | 349,998 / 357,324 |
| SYN to Tor peers | 53, f256–f9681 | 40, f485–f7082 | 3,498 / 2,640 |

The scan begins at about 26 seconds and runs at roughly 35 SYNs a second until capture ends. The Tor attempts begin at about 46 seconds and retry at 1, 2, 4 and 8 second intervals.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The SMB scan</div><div class="fig-sub">My local lab capture, where a listener answered</div></div><div class="fig-draw"><img src="/shared/img/wannacry/smb-scan.jpg" alt="Wireshark filtered on smb showing many SMB Negotiate Protocol Request frames to different destinations" width="1532" height="614" loading="lazy" /></div><div class="fig-cap">Here SMB Negotiate requests appear. In the Triage captures nothing answered, so only SYNs exist.</div></figure>

## Execution flow

### 1. Kill-switch check

In the decompiled `WinMain`, the sample opens the long domain with `InternetOpenUrlA`. On success it closes the handles and exits; on failure it continues. In the Triage captures the guest sends 10 DNS queries for that name over 20 seconds, with no reply in either file, and then carries on.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The check in code</div><div class="fig-sub">Decompiled WinMain</div></div><div class="fig-draw"><img src="/shared/img/wannacry/killswitch-code.jpg" alt="Decompiled code calling InternetOpenUrlA on http://www.iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com, closing handles if it succeeds, and calling another routine if it fails" width="714" height="422" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The lookup on the wire</div><div class="fig-sub">Wireshark in my local lab, INetSim switched off</div></div><div class="fig-draw"><img src="/shared/img/wannacry/killswitch-dns.jpg" alt="Wireshark capture with a standard query for the kill-switch domain and ICMP destination unreachable replies" width="1531" height="721" loading="lazy" /></div><div class="fig-cap">With no resolver answering, the malware proceeds.</div></figure>

### 2. Service mode and the dropper

Without arguments, the sample creates the service `mssecsvc2.0`, extracts `tasksche.exe` from its own PE resource and starts it. With an argument, most likely the `-m security` that the service passes, it changes the service configuration instead. Both instances appear in Triage.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The first service</div><div class="fig-sub">services.msc in my local run</div></div><div class="fig-draw"><img src="/shared/img/wannacry/service-mssecsvc.jpg" alt="Properties of the Microsoft Security Center (2.0) Service, with path to executable ending in wannacry.exe -m security, startup type Automatic and status Running" width="779" height="578" loading="lazy" /></div></figure>

### 3. Install into a unique folder

`tasksche.exe` derives an ID from the host name. With `/i` it moves itself to `C:\ProgramData\<ID>`, falling back to `C:\Intel<ID>` if that fails, then registers a second service named after the ID and opens or creates the `MsWinZonesCacheCounterMutexA` mutex. It records the folder in `WanaCrypt0r\wd`.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The second service</div><div class="fig-sub">Named after the unique folder</div></div><div class="fig-draw"><img src="/shared/img/wannacry/service-unique.jpg" alt="Properties of the service utuksgkdlqz386, path to executable cmd.exe /c C:\ProgramData\utuksgkdlqz386\tasksche.exe, startup type Automatic" width="751" height="563" loading="lazy" /></div></figure>

### 4. Unpack, hide, open the permissions

The sample drops its resource archive, runs `attrib +h .` to hide the folder, and runs `icacls . /grant Everyone:F /T /C /Q` so every account can modify everything underneath.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The unpacked folder</div><div class="fig-sub">C:\ProgramData\utuksgkdlqz386</div></div><div class="fig-draw"><img src="/shared/img/wannacry/dropped-files.jpg" alt="File Explorer listing of msg, TaskData, @Please_Read_Me@, @WanaDecryptor@.exe, 00000000.eky, .pky, .res, b.wnry, c.wnry, f.wnry, r.wnry, s.wnry, t.wnry, taskdl, tasksche, taskse and u.wnry" width="719" height="496" loading="lazy" /></div><div class="fig-cap">The bitmap <code>b.wnry</code> is 1.4 MB; <code>u.wnry</code> and <code>@WanaDecryptor@.exe</code> are both 240 KB.</div></figure>

### 5. Payload check

`t.wnry` starts with the ASCII marker `WANACRY!`. The code verifies the marker and the length, retrieves the stored key, and decrypts the payload before moving on to encryption.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The payload header</div><div class="fig-sub">t.wnry in a hex view</div></div><div class="fig-draw"><img src="/shared/img/wannacry/wanacry-header.jpg" alt="Hex dump of t.wnry beginning with the bytes 57 41 4e 41 43 52 59 21, the text WANACRY!" width="665" height="423" loading="lazy" /></div></figure>

### 6. Scripts, decryptor modes and Tor

A numeric batch file and `m.vbs` run, and `F:\$RECYCLE` is hidden. The decryptor starts with `co`, then `vs` through `cmd /c start /b`; the `vs` instance launches `taskhsvc.exe`. What `m.vbs` does is not visible in the logs. My local run produced `@WanaDecryptor@.exe.lnk`, which fits a shortcut role, but I did not read the script.

### 7. Destroy recovery options

The one-line chain runs `vssadmin`, `wmic shadowcopy delete`, two `bcdedit` changes that disable boot recovery, and `wbadmin delete catalog`. Windows then starts `vssvc.exe`.

### 8. Persistence

`tasksche.exe` runs `reg add` through `cmd.exe` to write the Run value. The 32-bit `reg.exe` is used, so Windows records the value under `WOW6432Node`.

### 9. Encryption and the ransom screen

The encryptor loops: `taskdl.exe`, `taskse.exe` and the decryptor window start repeatedly (5, 4 and 4 times in the Windows 10 run; 6, 5 and 5 on Windows 11). Files become `<name>.WNCRY`, the wallpaper changes, and a window demands $300 in Bitcoin with two countdowns.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The ransom window</div><div class="fig-sub">French-language version from my local run</div></div><div class="fig-draw"><img src="/shared/img/wannacry/ransom-screen.jpg" alt="Wana Decrypt0r 2.0 window titled Ooops, your files have been encrypted, with two countdowns, a payment demand of 300 dollars in bitcoin and a Bitcoin address" width="966" height="723" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The wallpaper</div><div class="fig-sub">Set from the ransom bitmap</div></div><div class="fig-draw"><img src="/shared/img/wannacry/wallpaper.jpg" alt="Black desktop background with red text: Ooops, your important files are encrypted, followed by instructions to run the Wana Decrypt0r program" width="800" height="600" loading="lazy" /></div></figure>

The decryptor's contact form fails when Tor is unreachable, which is also what the sandbox shows: the `taskhsvc.exe` bootstrap never got an answer.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Contact us, without Tor</div><div class="fig-sub">The error the decryptor shows</div></div><div class="fig-draw"><img src="/shared/img/wannacry/failed-to-send.jpg" alt="Dialog: Failed to send your message. Please make sure that your computer is connected to the Internet and your Internet Service Provider does not block connections to the TOR Network" width="462" height="207" loading="lazy" /></div></figure>

### Sandbox tags and heuristics reviewed

Several Triage tags do not survive a look at the evidence:

- **`stealer`, `spyware`, "Reads user/profile data of web browsers" (T1555.003, T1552.001).** The only evidence is browser profile files, such as `C:\Users\Admin\AppData\Roaming\Mozilla\Firefox\Profiles\acaoqdel.default-release\pkcs11.txt.WNCRY`, that were encrypted. That is a file being overwritten, not read and sent, and neither capture holds any outbound data. WannaCry has no credential-theft code.
- **"Creates a file in the Startup directory".** The signature points to `~SDF032.tmp` and `~SDF6D3.tmp` in the Startup folders, opened for modification by `tasksche.exe`. These look like temporary files made as the encryptor walks directories, and no persistently named file appears in either run's file list. The real autostart is the HKLM Run value.
- **"Contacts a large amount of remote hosts".** True, but it is a propagation scan of 3,000 or more addresses, not command and control. The capture count is within a dozen of Triage's.
- **`worm`.** Supported by the scanning alone. No SMB session or exploit traffic appears in the Triage captures.
- **"System Language Discovery".** It rests on a registry open of `NLS\Language` that `cmd.exe`, `attrib.exe` and `reg.exe` also perform. The decryptor does import `GetUserDefaultLangID`, which is a better reason, but that comes from static analysis.
- **Missing T1486.** Triage's ATT&CK matrix omits Data Encrypted for Impact, the main thing this sample does.

## Detection

**YARA.** Two rules written from strings in the sample and tested against `wannacry.exe`, the dropped `tasksche.exe`, `taskdl.exe`, `taskse.exe`, `@WanaDecryptor@.exe` and `/bin/ls`. The dropper rule matches `wannacry.exe` only. The encryptor rule matches `tasksche.exe` and also `wannacry.exe`, which embeds it.

```yara
rule WannaCry_Dropper_Strings
{
    meta:
        description = "wannacry.exe dropper: kill-switch URL, fake service names and the embedded tasksche resource"
    strings:
        $ks   = "http://www.iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com" ascii
        $svc1 = "mssecsvc2.0" ascii
        $svc2 = "Microsoft Security Center (2.0) Service" ascii
        $arg  = "%s -m security" ascii
        $mtx  = "Global\\MsWinZonesCacheCounterMutexA" ascii
        $res  = "tasksche.exe" ascii
    condition:
        uint16(0) == 0x5A4D and filesize < 8MB and $ks and 3 of ($svc1, $svc2, $arg, $mtx, $res)
}

rule WannaCry_Encryptor_Strings
{
    meta:
        description = "tasksche.exe: unique-folder install, icacls and attrib hardening, wnry resource names"
    strings:
        $mtx  = "Global\\MsWinZonesCacheCounterMutexA" ascii
        $acl  = "icacls . /grant Everyone:F /T /C /Q" ascii
        $hide = "attrib +h ." ascii
        $r1   = "WanaCrypt0r" ascii wide
        $f1   = "t.wnry" ascii
        $f2   = "c.wnry" ascii
    condition:
        uint16(0) == 0x5A4D and filesize < 8MB and $mtx and $acl and $hide and 2 of ($r1, $f1, $f2)
}
```

These are string rules, so a repacked or modified build can evade them. They were not tested against a larger clean corpus.

**Behavior.**

- A hidden folder under `C:\ProgramData` with a random lowercase name followed by digits, holding `tasksche.exe`, `taskdl.exe`, `taskse.exe` and `*.wnry` files.
- `icacls . /grant Everyone:F /T /C /Q` and `attrib +h .` run by a process in `ProgramData`.
- The single-line `vssadmin` / `wmic` / `bcdedit` / `wbadmin` chain.
- A `reg add` of `HKLM\...\CurrentVersion\Run` whose value name matches the folder name.
- A burst of TCP/445 SYNs to hundreds of unrelated addresses from one host, plus an ARP sweep of the local /16.
- A DNS lookup of the kill-switch name. Do not block it; letting it resolve is what stops the sample.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Discovery | T1016 System Network Configuration Discovery / T1082 System Information | Reads host and domain name |
| Persistence | T1543.003 Windows Service | `mssecsvc2.0` (local run) |
| Execution | T1059.003 Windows Command Shell / T1059.005 Visual Basic | cmd, numeric batch file, `m.vbs` |
| Defense Evasion | T1564.001 Hidden Files and Directories | `attrib +h`, hidden `$RECYCLE` folder |
| Defense Evasion | T1222.001 File and Directory Permissions Modification | `icacls` |
| Impact | T1490 Inhibit System Recovery | `vssadmin`, `wmic shadowcopy delete` |
| Execution | T1047 Windows Management Instrumentation | `wmic` |
| Persistence | T1547.001 Registry Run Keys | `reg add` through `cmd.exe` |
| Impact | T1486 Data Encrypted for Impact | Encryptor loop, `.WNCRY` output |
| Impact | T1491.001 Internal Defacement | Wallpaper change |
| Defense Evasion | T1070.004 File Deletion | Temp-file deletion |
| Discovery | T1046 Network Service Discovery | SMB scan, about 35 SYNs a second |
| Command and Control | T1090.003 Multi-hop Proxy | Tor attempts; inferred |

T1210 (Exploitation of Remote Services) is the intended use of the scan but was not observed.

## Confidence and limits

**Observed.** The full process chain and the Run value in both Triage runs, the shadow-copy command line, the `.WNCRY` outputs, the wallpaper change, the 10 unanswered kill-switch queries, the SMB and Tor SYN traffic, and identical hashes for every dropped executable and message file across both runs and my local run.

**From the code or my local run only.** The service-based persistence and the `WanaCrypt0r` registry key, the mutex string and its numeric suffix, the `WANACRY!` payload check, the five onion addresses and the Bitcoin address in `c.wnry`, and the decryptor's contact-form messages.

**Not established.** What `m.vbs` and the numbered batch file contain; why Triage shows a Run value while my lab shows services; whether the scan would have exploited anything, since nothing replied; and whether the Tor attempts belong to `taskhsvc.exe`, which is inferred from sequence because a capture carries no process names. Triage's PDF masks several `@WanaDecryptor@` names, so the role of a few masked files is unknown.

## References

- Triage sample `261025-nq1n3ag14l` (behavioral1 and behavioral2)
- Microsoft Security Bulletin MS17-010
