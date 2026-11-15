---
title: "Ransom:Win32/Cryptolocker!exe"
description: "A 257,024-byte 32-bit .NET executable with a header timestamp of 20 January 2014 that identifies itself as CryptoLocker. It differs from the native-code September 2013 build, so it is treated as a sample that uses the CryptoLocker name, not as a confirmed member of the original family."
authors: [Y2GX64]
category: Malware Analysis
date: 2026-11-14
---

*Analysis date: 14 November 2026. Triage ran the sample on 9 November 2026; the local execution was on 31 October 2026. The analyst's report (version 1, ODT) covers the same sample. This post re-checks that report against the Triage PDF (Windows 10 and Windows 11 runs), three packet captures, the Regshot diff, Process Explorer snapshot, a string read of the Procmon log, FLOSS output and the screenshots, so some details differ from the report. The differences are listed at the end.*

## Summary

`CryptoLocker_2014_1002.exe` is a 257,024-byte 32-bit .NET executable that identifies itself as CryptoLocker. When run, it copied itself to `%APPDATA%` under a 10-character hex name, started that copy, wrote the same path under both the Run and RunOnce keys, and terminated the original with `taskkill`. In the local run the copy sent four HTTP GET requests with long Base64-looking paths to `cabin.su`, stored the reply under `HKCU\SOFTWARE\750569DBD0\Keys\Public`, and displayed a ransom window requesting 300 USD / 300 EUR.

**The "public key" the sample accepted was the default page of the INetSim simulated-internet server, so the ransom window appeared without any real attacker server. The evidence does not show whether any file was encrypted.** The two Triage runs did not reach that stage: `cabin.su` and three other domains returned NXDOMAIN (SERVFAIL for one), the sample kept re-querying `cabin.su` for about 15 minutes, and Triage saw no HTTP traffic from it at all. The persistence and the check-in are documented. The content a live server would send and the behaviour of the encryption are not.

| | |
|---|---|
| Sample | `CryptoLocker_2014_1002.exe` (folder `CryptoLocker_22Jan2014`), 257,024 B, PE32 i386, .NET per FLOSS |
| SHA-256 | `5291232b297dfcb56f88b020ec7b896728f139b98cef7ab33d4f84c85a06d553` |
| MD5 / SHA-1 (Triage, of the dropped copy) | `829dde7015c32d7d77d8128665390dab` / `a4185032072a2ee7629c53bda54067e0022600f8` |
| Detection-style name | `Ransom:Win32/Cryptolocker!exe`, taken from the title of the analyst's report (`Ransomware!Win32cryptolocker!exe`), rewritten in Microsoft `Type:Platform/Family!suffix` form. Not checked against a Microsoft detection. FLOSS identifies the file as .NET, which a Microsoft name would usually label `MSIL` rather than `Win32` |
| Header timestamp | 2014-01-20 10:25:57 UTC (can be altered; not relied on here) |
| Environment | Triage `win10v2004-20260911-en` and `win11-20260911-en` (sample 261109-nhagxaeh47, score 7/10, tags defense_evasion, discovery, persistence); local Windows 10 VM, user `w10analysis`, with INetSim as the simulated internet |
| Evidence | Triage PDF (23 pages), `triage_win10.pcapng` (5,787 frames, 901.2 s), `triage_win11.pcapng` (967 frames, 899.5 s), `cryptolocker_2014_1002.pcapng` (913 frames, 304.7 s), Regshot diff (1,266 changes), Process Explorer snapshot, Procmon log read as strings only, FLOSS, the analyst's ODT report and its screenshots |

A standalone execution-chain report accompanies this post.

## Concepts used in this sample

- **CryptoLocker name.** The window title and ransom text say CryptoLocker and describe a unique RSA-2048 key. This build is a .NET program; the September 2013 build analysed earlier is native code with different behaviour. This post treats the sample as one that uses the CryptoLocker name and does not claim it belongs to the original family.
- **Run and RunOnce keys.** Registry locations under `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion` whose values are programs Windows starts at logon. A RunOnce value is deleted after it runs, and a leading `*` in its name asks Windows to run it even in Safe Mode. The sample writes both.
- **Self-termination with taskkill.** The first process starts the copy and then runs `taskkill /F /IM` on its own file name, so the dropper is no longer running and only the Roaming copy remains.
- **Fixed fallback domain list.** The sample tries a short fixed set of five domains, not a generated list. This differs from the 2013 build's daily-seeded names.
- **INetSim.** A lab tool that answers every DNS and HTTP request with a fixed reply. Anything received in the local capture comes from the analyst's INetSim server, not from the attacker.
- **Sandbox tags.** Triage labels behaviour by signature and attributes it to a process. A tag attributed to `chrome.exe` is about the sandbox's browser, not the sample.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">CryptoLocker (2014 build) at a glance</div><div class="fig-sub">What the sample did in the lab, in order. Encryption was not observed</div></div><div class="fig-draw" role="img" aria-label="Launch the sample, copy itself to the Roaming folder and start the copy, write the Run and RunOnce values, kill the original with taskkill, send four HTTP GETs to cabin.su and store the reply in the registry, show the ransom window, and an unobserved final stage of file encryption."><svg viewBox="0 0 560 350" width="560" height="350" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 318" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Launch the sample</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">Desktop (local) or %TEMP% (Triage), started by hand</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="84" r="3" style="fill:var(--accent)"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Copy itself and start the copy</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">AppData\Roaming\&lt;10 hex&gt;.exe, e.g. 750569DBD0.exe</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="142" r="3" style="fill:var(--accent)"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Persist with Run and RunOnce values</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">Run\750569DBD0 and RunOnce\*750569DBD0, then taskkill the original</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="200" r="3" style="fill:var(--accent)"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">GET to cabin.su, store the reply</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">4 GETs, INetSim page saved as Keys\Public and 750569DBD0.img. Triage: DNS only</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Show the ransom window</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">"Your personal files are encrypted!", 300 USD / 300 EUR (local run only)</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--ink-3);stroke-dasharray:3 3" stroke-width="1.2"/><text x="34" y="314" font-size="15" style="fill:var(--ink-3)">File encryption</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">Not established in any run. Stated by the window; not shown by the evidence</text></svg></div></figure>

The high-level overview section of the report was empty in version 1, so there is no analyst flow chart to reproduce.

## Indicators of compromise

### Files

Full paths. `Admin` is the Triage user; `w10analysis` is the lab user. The 10-character name differs per host: `52B87B2FC5` (Triage Windows 10), `611F174BC2` (Triage Windows 11) and `750569DBD0` (the local VM). Every copy of the executable has the sample's SHA-256.

| Path | Status | Hash | Role |
|---|---|---|---|
| `C:\Users\w10analysis\AppData\Roaming\750569DBD0.exe` | Dropped | SHA-256 `5291232b…a06d553` (hash of the copy transferred to the lab share) | Self-copy in the local run. Persisted by Run and RunOnce, file description "Microsoft Windows Auto Update" |
| `C:\Users\w10analysis\AppData\Roaming\750569DBD0.img` | Dropped | SHA-256 `f0a3eec2709682107edae2372e8984e15bd3b2b7e3de9878ba76cd69cc556ce0` | Created by the Roaming copy (ProcDot "CREATE FILE"). Byte-identical to the 258-byte INetSim page, so it contains the INetSim server's reply, not an image |
| `C:\Users\Admin\AppData\Roaming\52B87B2FC5.exe` | Dropped | SHA-256 `5291232b…a06d553`, MD5 `829dde70…390dab` (Triage) | Self-copy in Triage Windows 10 |
| `C:\Users\Admin\AppData\Roaming\611F174BC2.exe` | Dropped | SHA-256 `5291232b…a06d553`, MD5 `829dde70…390dab` (Triage) | Self-copy in Triage Windows 11 |
| `C:\Users\w10analysis\Desktop\CryptoLocker_2014_1002.exe` | Pre-existing | SHA-256 `5291232b…a06d553` | The sample as launched locally |
| `C:\Users\Admin\AppData\Local\Temp\CryptoLocker_2014_1002.exe` | Pre-existing | SHA-256 `5291232b…a06d553` | The sample as Triage launched it, in both runs |
| `C:\Windows\System32\taskkill.exe` | Pre-existing | Not hashed | Ships with Windows. Run by the dropper against its own file name (step 4) |

Excluded: Triage lists memory-region dumps (`memory/2276-…-memory.dmp` and similar) and about 16 files under `C:\Users\Admin\AppData\Local\Google\Chrome\User Data\` (`.tmp` files, `Crashpad\settings.dat`, caches). The Chrome files belong to the sandbox's browser, not the sample. Procmon strings also show Windows loader probes such as `750569DBD0.exe.Local`, `.config` and `.Config` (only strings were read, not results, so it is not confirmed that these were failed lookups). No ransom-note file, no encrypted file and no exfiltration bundle was observed. The two files `\\192.168.122.10\REMnuxShare\artifacts\750569DBD0.exe` and `…\750569DBD0.img` in the Procmon strings are analyst copies made to the lab share, not malware behaviour.

### Registry

Values written by the sample. The key under `HKCU\SOFTWARE\<name>` is named after the 10-hex file stem.

| Key | Value | Purpose |
|---|---|---|
| `HKU\S-1-5-21-3777368691-943496736-2945925315-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\750569DBD0` (local VM, Regshot) | `"C:\Users\w10analysis\AppData\Roaming\750569DBD0.exe"` | The autostart key: starts the copy at every logon |
| `HKU\S-1-5-21-3777368691-943496736-2945925315-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce\*750569DBD0` (local VM, Regshot) | `"C:\Users\w10analysis\AppData\Roaming\750569DBD0.exe"` | Second autostart value: runs once at next logon, also in Safe Mode because of the `*` |
| `\REGISTRY\USER\S-1-5-21-681733028-2344970462-962213935-1000\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\52B87B2FC5` and `…\RunOnce\*52B87B2FC5` (Triage Windows 10) | `"C:\\Users\\Admin\\AppData\\Roaming\\52B87B2FC5.exe"` | Same pair, Triage. Set by the Temp dropper and by the Roaming copy |
| `\REGISTRY\USER\S-1-5-21-4077919521-2131189092-3796306753-1000\Software\Microsoft\Windows\CurrentVersion\Run\611F174BC2` and `…\RunOnce\*611F174BC2` (Triage Windows 11) | `"C:\\Users\\Admin\\AppData\\Roaming\\611F174BC2.exe"` | Same pair, Triage Windows 11 |
| `HKU\S-1-5-21-3777368691-943496736-2945925315-1001\SOFTWARE\750569DBD0\Files\` | Empty string | State key created empty. Stays empty in the Regshot diff |
| `HKU\S-1-5-21-3777368691-943496736-2945925315-1001\SOFTWARE\750569DBD0\Keys\Public` | REG_SZ, the 258-character INetSim HTML page | Where the sample stored the "public key" it received. The content is a lab artifact; the location is real |
| `HKU\S-1-5-21-3777368691-943496736-2945925315-1001\SOFTWARE\750569DBD0\Keys\Wallpaper` | REG_BINARY, 258 bytes, starts `3C 68 74 6D 6C 3E` (`<html>`) | Holds the same server reply as bytes. The Regshot diff shows no change to the desktop wallpaper setting |
| `HKLM\SOFTWARE\Microsoft\Tracing\750569DBD0_RASAPI32`, `…_RASMANCS`, `…\CryptoLocker_2014_1002_RASAPI32`, `…_RASMANCS` | Seven RAS tracing values each (`EnableFileTracing` and so on) | Not sample configuration. Windows creates these when a process loads the RAS libraries, named after the image. See heuristics |
| `HKU\…-1001\SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache\C:\Users\w10analysis\AppData\Roaming\750569DBD0.exe.FriendlyAppName` | `Microsoft Windows Auto Update` | Execution trace written by Windows. The text is the sample's file description, a masquerade name |
| `HKLM\SYSTEM\ControlSet001\Services\bam\State\UserSettings\S-1-5-21-3777368691-943496736-2945925315-1001\\Device\HarddiskVolume3\Users\w10analysis\AppData\Roaming\750569DBD0.exe` | Binary timestamp | Execution trace written by Windows (Background Activity Moderator) |

Triage also reports reads of `\REGISTRY\MACHINE\SYSTEM\ControlSet001\Services\Tcpip\Parameters\Hostname` and `\Domain` (dropper and Roaming copy, both runs) and `\REGISTRY\USER\…\Control Panel\International\Geo\Nation` (Windows 10 dropper only). These are reads, not changes.

### Mutexes

Not recorded in the evidence used for this post. Triage does not list mutexes for this sample, and Regshot and the Procmon string read cannot show them. FLOSS shows the .NET names `Mutex`, `ReleaseMutex` and `AbandonedMutexException`, so the code uses a mutex, but its name is unknown.

### Command lines

```text
"C:\Users\Admin\AppData\Local\Temp\CryptoLocker_2014_1002.exe"
"C:\Users\Admin\AppData\Roaming\52B87B2FC5.exe"
"taskkill" /F /IM CryptoLocker_2014_1002.exe
"C:\Users\Admin\AppData\Roaming\611F174BC2.exe"
"C:\Users\w10analysis\Desktop\CryptoLocker_2014_1002.exe"
"C:\Users\w10analysis\AppData\Roaming\750569DBD0.exe"
"taskkill" /F /IM CryptoLocker_2014_1002.exe
```

Lines 1 to 3 are Triage Windows 10; line 4 replaces line 2 in Triage Windows 11 (the other lines are identical). Lines 5 to 7 are the local run, from the Procmon string table. Triage also lists a second launch of the Temp path with the same command line in both runs. None of the sample's own processes had arguments in any run (the 2013 build used `/r` and `/w`).

### Network

| Indicator | Role |
|---|---|
| `cabin.su` | The only domain the sample actually contacted. In the local run INetSim resolved it to `192.168.122.10` and the sample sent four `GET` requests (`Host: cabin.su`). In Triage it was queried about 177 times (Windows 10) and 261 times (Windows 11), always NXDOMAIN. Ownership and reputation not checked |
| `wrax.ru`, `icals.ru`, `hips.su`, `yot.su` | Queried in both Triage runs in a fixed order after `cabin.su`: NXDOMAIN for the first three, SERVFAIL for `yot.su`. Never contacted over TCP. Not queried in the local capture |
| `192.168.122.10` | The analyst's INetSim DNS, HTTP and file server. Not an indicator |
| `8.8.8.8:53`, `10.127.0.164`, `10.127.0.72` | Triage resolver and guest-side addresses. Not indicators |
| `mobile.events.data.microsoft.com`, `client.wns.windows.com`, `licensing.mp.microsoft.com`, `c.pki.goog`, `www.google.com` and other Google and Microsoft hosts | Windows, Chrome and certificate background traffic. Not indicators |

No User-Agent header was sent on the GETs: the request carried only `Host: cabin.su` and `Connection: Keep-Alive`. The path was a 360-character Base64-style string, different for each request.

### Packet correlation

Frame numbers are per capture. "W10" is `triage_win10.pcapng`, "W11" is `triage_win11.pcapng`, "Local" is `cryptolocker_2014_1002.pcapng`. Times are seconds from the start of each capture.

| Frames | Endpoint | Bytes | Step |
|---|---|---|---|
| Local 741–742 (124.52 s) | `192.168.122.10:53`, query and answer for `cabin.su` | 2 DNS frames | 5. INetSim answers `A 192.168.122.10` |
| Local 744–753 (125.41 s to 125.45 s) | `192.168.122.10:80`, client port 50221 | Request 402 B; reply 150 B headers plus 258 B body | 5. GET in frame 747, `200 OK` in 749–750, client FIN in 752 |
| Local 756–764 (126.52 s) | `192.168.122.10:80`, port 50222 | Request 378 B; same reply | 5. GET in frame 759 |
| Local 766–775 (127.59 s) | `192.168.122.10:80`, port 50223 | Request 378 B; same reply | 5. GET in frame 769 |
| Local 776–786 (128.32 s to 128.66 s) | `192.168.122.10:80`, port 50224 | Request 402 B; same reply | 5. GET in frame 779, FIN retransmitted in 785 |
| Local 754–755 (125.97 s) | `192.168.122.10:53`, PTR for `10.122.168.192.in-addr.arpa` | 2 DNS frames | Not attributed: a reverse lookup of the INetSim address, answered `www.inetsim.org` |
| W10 996–5786 (22.17 s to 901.15 s) | `8.8.8.8:53`, 177 queries for `cabin.su` | Mean gap 4.99 s | 6. NXDOMAIN loop. First answer in frame 997 |
| W10 998, 1960, 3200 | `wrax.ru` | 3 queries | 6. First, second and third pass through the list |
| W10 1972, 3204 / 2238, 3206 / 2258, 2860, 3208, 3209 | `icals.ru` / `hips.su` / `yot.su` | 2 / 2 / 4 queries | 6. `yot.su` replies are SERVFAIL (for example frames 2872, 3048, 3210) |
| W11 6–964 (15.18 s to 899.5 s) | `8.8.8.8:53`, 261 queries for `cabin.su` | Mean gap 3.40 s | 6. Same loop. Response frames outnumber queries (344 to 261); the reason was not determined |
| W11 8, 10, 12, 14 and 351, 353, 355, 359, 360 | `wrax.ru`, `icals.ru`, `hips.su`, `yot.su` | 2, 2, 2 and 3 queries | 6. Two passes through the list, at about 15 s and 147 s |
| W10 and W11, all TCP | Microsoft and Google hosts (for example `licensing.mp.microsoft.com`, `msdownload/update/…disallowedcertstl.cab`) | Not summed | Not the sample. Windows and Chrome background traffic |
| Local frames 17–893 | `client.wns.windows.com`, `mobile.events.data.microsoft.com` (TLS) | Not summed | Not the sample. Windows telemetry |
| Local frames 789–790 and similar | `192.168.122.10:445` keep-alives | Not summed | Not the sample. SMB session to the lab share |

### Cross-run consistency

Identical in both Triage runs and the local run: the SHA-256 of every self-copy, the Roaming self-copy followed by a Run and a `*`-prefixed RunOnce value named after the file stem, `taskkill /F /IM CryptoLocker_2014_1002.exe`, and `cabin.su` as the first domain tried. The two Triage runs also match on the other four domains, the order they are tried in, and the NXDOMAIN and SERVFAIL answers.

Different: the 10-hex name (`52B87B2FC5`, `611F174BC2`, `750569DBD0`), the user and SID, the query rate (4.99 s against 3.40 s between `cabin.su` queries), and everything after the first DNS answer. Only in the local run did `cabin.su` resolve, and only there were HTTP traffic, the `Keys\Public` value, the `.img` file and the ransom window observed. It is not known whether the name derives from the host; three values are available. The Triage Windows 11 run reports 368 s of kernel time against 900 s on Windows 10, which was not investigated. The Process Explorer snapshot (PIDs 2368 and 408 for `750569DBD0.exe`) and the ProcDot graph (PIDs 5948 and 8260) use different PIDs, so they are not from the same process tree.

### Other indicators

- File description and version-info name: `Microsoft Windows Auto Update` (MuiCache value, Process Explorer description, and FLOSS strings `Microsoft Windows Auto Update.exe` and `Microsoft Windows Auto Update`). No company name.
- Ransom window (screenshot, local run only): title `CryptoLocker`, heading "Your personal files are encrypted!", "Encryption was produced using a unique public RSA-2048 generated for this computer", price "300 USD / 300 EUR", a countdown and "Private key will be destroyed on 10/31/2026 8:13:00 AM", a **Next >>** button.
- FLOSS .NET names worth searching for: `AesCryptoServiceProvider`, `RSACryptoServiceProvider`, `SHA1CryptoServiceProvider`, `CryptoStream`, `HttpWebResponse`, `System.Reflection.Emit`, `System.IO.Compression`, `Mutex`.
- Lab artifacts (not indicators): the INetSim `Date: Mon, 09 Nov 2026 10:31:15 GMT` header does not match the capture clock (the pcap starts 2026-10-31 13:10:51 UTC), so the INetSim host clock was incorrect.

## Execution flow

### 1. Delivery

`CryptoLocker_2014_1002.exe` was launched from the Desktop of the local VM. Triage ran the same bytes from `C:\Users\Admin\AppData\Local\Temp\CryptoLocker_2014_1002.exe`. Neither run shows how the file would reach a real victim, so no lure or download step is documented. No network activity in this window.

### 2. Self-copy and start of the copy

The sample wrote itself into `%APPDATA%` as a 10-character name and started the copy. In the ProcDot graph, a thread of `CryptoLocker_2014_1002.exe` (PID 5948) creates `750569DBD0.exe` (PID 8260). Triage Windows 10 reports the same shape (`C:\Users\Admin\AppData\Local\Temp\CryptoLocker_2014_1002.exe` → `C:\Users\Admin\AppData\Roaming\52B87B2FC5.exe`), and Windows 11 the same with `611F174BC2.exe`. Triage also reports "Suspicious use of WriteProcessMemory": PID 2276 wrote to the memory of PID 4012 (the Roaming copy) and PID 3720 (`taskkill`) in Windows 10, and PID 3396 to PIDs 4892 and 1400 in Windows 11. Triage does not state what was written. This indicates that the dropper accesses the memory of the processes it starts; injection or hollowing was not established. No network activity in this window.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The self-copy in ProcDot</div><div class="fig-sub">750569DBD0.exe appears under AppData\Roaming</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/procdot-self-copy.png" alt="ProcDot graph node showing the file C:\Users\w10analysis\AppData\Roaming\750569DBD0.exe" width="629" height="122" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Process creation in ProcDot</div><div class="fig-sub">CryptoLocker_2014_1002.exe (PID 5948) creates 750569DBD0.exe (PID 8260)</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/procdot-child-process.png" alt="ProcDot node for 750569DBD0.exe PID 8260 with the status line Thread 6796-o77 of process CryptoLocker_2014_1002.exe PID 5948 creates process 750569DBD0.exe PID 8260" width="757" height="287" loading="lazy" /></div></figure>

### 3. Persistence

The sample wrote two autostart values pointing at the Roaming copy: `Run\750569DBD0` and `RunOnce\*750569DBD0`. Triage shows the same pair for `52B87B2FC5` and `611F174BC2`, set by both the Temp dropper and the Roaming copy. The `Run` value is the standing persistence; the RunOnce value is a one-shot that also fires in Safe Mode. No network activity in this window.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Autostart values in ProcDot</div><div class="fig-sub">Both are set by the Roaming copy and flagged AUTOSTART</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/procdot-autostart.png" alt="ProcDot graph with arrows labelled SET AS VALUE from 750569DBD0.exe to HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\750569DBD0 and RunOnce\*750569DBD0, both marked AUTOSTART" width="1191" height="340" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">State keys in ProcDot</div><div class="fig-sub">HKCU\SOFTWARE\750569DBD0\Keys and \Files are created</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/procdot-registry-keys.png" alt="Two ProcDot registry nodes: HKCU\SOFTWARE\750569DBD0\Keys\(Default) and HKCU\SOFTWARE\750569DBD0\Files\(Default)" width="581" height="160" loading="lazy" /></div></figure>

### 4. The dropper kills itself

The dropper ran `"taskkill" /F /IM CryptoLocker_2014_1002.exe` against its own file name. Both Triage runs and the Procmon strings show it, and the Triage tag "Kills process with taskkill" comes from it. A second launch of the Temp path is listed in both Triage runs; the cause was not traced. The Process Explorer snapshot, taken later, shows two `750569DBD0.exe` processes (PID 2368 and its child 408) and no `CryptoLocker_2014_1002.exe`. No network activity in this window.

### 5. Check-in to `cabin.su` (local run only)

In the local run, the Roaming copy resolved `cabin.su` (Local frames 741–742) and made four GET requests on four new TCP connections within about 3 s (Local frames 747, 759, 769, 779), each with a 360-character Base64-style path and no User-Agent. INetSim answered each with `200 OK`, `Content-Length: 258`, the default HTML page. The path may carry data about the host; it was not decoded. In both Triage runs this step produced only DNS queries (frames W10 996 onwards, W11 6 onwards) and no HTTP.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Follow TCP stream 14 in Wireshark</div><div class="fig-sub">The request path, and INetSim's default page as the reply (Local frames 747 to 750)</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/wireshark-follow-stream.png" alt="Wireshark Follow TCP Stream window showing a GET request with a long Base64-style path and Host cabin.su, answered by HTTP/1.1 200 OK from INetSim HTTP Server with the INetSim default HTML page" width="991" height="523" loading="lazy" /></div><div class="fig-cap">The original report labelled this "retrieval of public RSA-2048 key". The capture shows a GET and a canned reply; the RSA wording appears only in the ransom window.</div></figure>

### 6. Reply stored in the registry and an `.img` file; Triage retry loop

The registry shows the reply written to `HKCU\SOFTWARE\750569DBD0\Keys\Public` (four writes in Procmon at 13.98 s, 13.99 s, 15.45 s and 15.47 s on its own clock, which was not aligned with the pcap) and as bytes to `Keys\Wallpaper`. The Roaming copy also created `C:\Users\w10analysis\AppData\Roaming\750569DBD0.img`. The file is byte-identical to the INetSim page. No change to the wallpaper setting was observed. The order of this step relative to the GETs comes from the ProcDot and Procmon read, not from a timestamp match against the pcap.

In Triage, where nothing resolved, the sample looped: `cabin.su` every 3 to 5 s for the whole run, with passes through `wrax.ru`, `icals.ru`, `hips.su` and `yot.su` roughly every minute or two (W10 at 22 s, 32 s and 86 s; W11 at 15 s and 147 s). That loop is behaviour of the sample's code; the actions a reachable server would have triggered are not shown.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Keys\Public in ProcDot</div><div class="fig-sub">Four writes of the INetSim HTML page, REG_SZ, length 518</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/procdot-keys-public.png" alt="ProcDot data window for REGISTRYKEY hkcu\software\750569dbd0\keys\public with four timestamped REG_SZ values of length 518 containing the INetSim default HTML page" width="979" height="203" loading="lazy" /></div><div class="fig-cap">The original report placed this under Files\(Default). The key in the window title is Keys\public.</div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The .img file in ProcDot</div><div class="fig-sub">750569DBD0.img created under AppData\Roaming</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/procdot-img-file.png" alt="ProcDot graph with a CREATE FILE edge to the node C:\Users\w10analysis\AppData\Roaming\750569DBD0.img" width="1077" height="393" loading="lazy" /></div></figure>

### 7. Ransom window

The local run ended with a window titled `CryptoLocker`. It says the files are encrypted, names a unique RSA-2048 key, asks 300 USD / 300 EUR, shows a countdown and a **Next >>** button. This is the only evidence of user-facing ransomware behaviour. The window is the sample's own statement. It was not established that any file was encrypted; see the limits below.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Ransom window (local run)</div><div class="fig-sub">Shown after the INetSim page was stored as the "public key"</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2014-1002/ransom-window.png" alt="Red CryptoLocker window with the heading Your personal files are encrypted, text about a unique public RSA-2048 key, a price of 300 USD or 300 EUR, a countdown timer and a Next button" width="883" height="731" loading="lazy" /></div></figure>

### Sandbox tags and heuristics reviewed

- **Score 7/10, "Shows suspicious behavior".** Triage did not label the sample ransomware and gave no family. The original report stated that Triage identified it as ransomware; the PDF does not contain this.
- **"Kills process with taskkill" (tagged defense_evasion).** The target is the dropper's own file name. No security product was targeted. The behaviour occurred, but it removes the sample's own first-stage process and does not target security software.
- **Browser Information Discovery, System Time Discovery, "Checks processor information", "Enumerates system info in registry", FindShellTrayWindow, SendNotifyMessage, NtCreateUserProcessBlockNonMicrosoftBinary, SeShutdownPrivilege, SeCreatePagefilePrivilege, and the WriteProcessMemory entries for PID 3024.** Every process Triage lists for these is `C:\Program Files\Google\Chrome\Application\chrome.exe`, the sandbox's browser (Windows 10 run only). They are not evidence about the sample. T1217 and T1124 in Triage's matrix come from these. "Browser Information Discovery" and "Enumerates physical storage devices" list no process, so they cannot be tied to the sample either.
- **"Suspicious use of AdjustPrivilegeToken: SeDebugPrivilege".** Listed for the dropper, `taskkill.exe` and the Roaming copy. Observed; no use of SeDebugPrivilege was seen.
- **"Suspicious use of WriteProcessMemory" for PID 2276 and 3396.** Observed by Triage and attributed to the dropper, but the content written is not shown. Not confirmed as injection.
- **"Reads the TCP/IP host and domain name from the registry" and "Checks computer location settings".** The reads occurred, but the `Geo\Nation` and Tcpip reads are common for .NET and networking code. No geo-fencing or host-name check was seen to change behaviour.
- **"Unsigned PE".** Accurate; provides little information.
- **`rundll32.exe C:\Windows\System32\shell32.dll,SHCreateLocalServerRunDll {9aa46009-3ce0-458a-a354-715610a075e6} -Embedding` and `svchost.exe -k LocalSystemNetworkRestricted -p -s NgcSvc` / `NgcCtnrSvc`.** Windows shell and service processes listed in the process tree. Nothing links them to the sample.
- **`HKLM\SOFTWARE\Microsoft\Tracing\…_RASAPI32` and `…_RASMANCS` keys (four of them).** Windows RAS tracing defaults created per image name. They appear for both `750569DBD0` and `CryptoLocker_2014_1002`, which indicates an operating-system side effect, not sample configuration.
- **`Keys\Public` holding an HTML page.** INetSim answered in the lab. It shows what the sample does with a reply, not what a real server sends.
- **The ransom window.** It proves the sample's UI code ran. It does not prove encryption happened.

## Reverse engineering notes

No code-level analysis was done for this post. FLOSS (v3.1.1) reports the file as .NET and extracts 1,198 static strings (1,170 ASCII, 28 UTF-16LE), mostly metadata. The readable .NET type names include `Mutex`, `AesCryptoServiceProvider`, `RSACryptoServiceProvider`, `SHA1CryptoServiceProvider`, `CryptoStream`, `HttpWebResponse`, `System.Net.Sockets`, `System.Text.RegularExpressions`, `System.Reflection.Emit`, `System.IO.Compression` and `System.Windows.Forms`, plus the name `Microsoft Windows Auto Update.exe`. They indicate the code may be able to encrypt with AES and RSA, make HTTP requests and draw a form, but a name in the metadata does not show that a code path runs. FLOSS found no domain, URL or registry path as a plain string, so the five domains and the `SOFTWARE\<name>` keys are presumably built or decoded at run time; how was not checked. The original report listed "Packed: Yes" and "No FLOSS strings"; neither was confirmed (see the corrections table).

## Detection

- **File:** an unsigned PE with file description `Microsoft Windows Auto Update` running from `%APPDATA%` (any `C:\Users\<user>\AppData\Roaming\<10 hex>.exe`), with a `.img` file of the same stem next to it. The `.img` here is a text file, which does not match the usual use of that extension.
- **Registry:** a Run value and a `*`-prefixed RunOnce value with the same name (10 hex characters) and the same Roaming path; a `HKCU\SOFTWARE\<same 10 hex>` key with `Files` and `Keys` subkeys (`Public`, `Wallpaper`). The 10 hex characters are not fixed, so match the pattern, not the value.
- **Process:** a process that launches a copy of itself from `%APPDATA%` and then runs `taskkill /F /IM <its own image name>`. In the observed runs the name was `CryptoLocker_2014_1002.exe`, which is only the name given to the file by the analyst and Triage, so do not key on it.
- **Network:** DNS queries for `cabin.su`, `wrax.ru`, `icals.ru`, `hips.su` and `yot.su` in that order; repeated `cabin.su` lookups every 3 to 5 s; HTTP GET with `Host: cabin.su`, no User-Agent and a 360-character Base64-style path. It was not checked whether these domains are still registered. No YARA rule was written or tested for this post.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Persistence, Privilege Escalation | T1547.001 Registry Run Keys / Startup Folder | `Run\750569DBD0` and `RunOnce\*750569DBD0` (local Regshot), `52B87B2FC5` and `611F174BC2` (Triage) |
| Defense Evasion | T1112 Modify Registry | `HKCU\SOFTWARE\750569DBD0\Files`, `Keys\Public`, `Keys\Wallpaper` written; Run and RunOnce values set |
| Discovery | T1012 Query Registry | Reads of `Tcpip\Parameters\Hostname` and `Domain` by the dropper and Roaming copy |
| Discovery | T1082 System Information Discovery, T1016 System Network Configuration Discovery | In Triage's matrix. The evidence is the Tcpip registry reads; the system-info signature entries are attributed to `chrome.exe`, so T1082 is weak |
| Defense Evasion | T1036.005 Match Legitimate Name or Location | Analyst mapping, not in Triage's matrix: file description `Microsoft Windows Auto Update` (MuiCache, Process Explorer, FLOSS) |
| Command and Control | T1071.001 Web Protocols | Analyst mapping: four HTTP GETs to `cabin.su` (Local frames 747, 759, 769, 779). Local run only, answered by INetSim |
| Command and Control | T1008 Fallback Channels | Analyst mapping, weak support: five fixed domains tried in order in both Triage runs. Never reached a server, so the fallback role is inferred |
| Execution | T1204.002 Malicious File | Analyst mapping: the file was launched by hand, so this describes the lab, not a delivery method |

Not tagged: T1486 Data Encrypted for Impact (the ransom window claims it; no encrypted file was observed), T1491 Defacement (no wallpaper setting change observed), T1055 Process Injection (Triage's WriteProcessMemory is unexplained), T1070.004 File Deletion (the dropper is terminated; deletion was not observed), T1041 Exfiltration Over C2 Channel (the GET path may carry data but was not decoded), T1217 and T1124 (attributed to `chrome.exe`), T1057 (Triage's "EnumeratesProcesses" is Chrome), and T1497 Sandbox Evasion (nothing observed).

## Confidence and limits

**Observed.** The Roaming self-copy with a 10-hex name in all three runs and the same SHA-256; the Run and RunOnce pair in all three runs; `taskkill /F /IM CryptoLocker_2014_1002.exe`; in the local run, one DNS query and four HTTP GETs to `cabin.su` (frames 741–786) answered with the 258-byte INetSim page; the `Keys\Public` and `Keys\Wallpaper` values and the `.img` file holding that page; the ransom window; and, in Triage, the NXDOMAIN loop for five fixed domains with no HTTP.

**From the code only.** FLOSS names for `Mutex`, AES, RSA, `HttpWebResponse` and `Reflection.Emit`. The file was not decompiled, so the mutex name, the method used to produce the domains and registry names, and the contents of the GET path are unknown.

**Inferred.** That `Keys\Public` is meant to hold an RSA public key (from its name and the ransom text), and that the sample accepted any 200 reply as one. That the long GET path is an encoded request for that key. That the five domains form a fallback list. That the Triage name differences (`52B87B2FC5` against `611F174BC2`) and the local VM's name come from host-specific input.

**Not established.** Whether any file was encrypted in any run. The Procmon read was a string extract of a 21.9 MB log. It showed no document paths under `C:\Users\w10analysis`, but a string extract is not a review of file events. What a live `cabin.su` server would send or do. Who owns the five domains, and whether they were ever active. What the 360-character path carries. The name of the mutex. How the sample would be delivered. Why the dropper is started twice in Triage, and what Triage's WriteProcessMemory events wrote. Whether the Roaming copy or a child showed the window. The Regshot `Wallpaper` check was a text search, not a review of the desktop setting. The Autoruns `.arn`, the two `.hivu` registry snapshots (Regshot used instead) and the Procmon PML events beyond strings were not analysed.

### Corrections to earlier reports

| Earlier report | What the data shows |
|---|---|
| Triage "stated that it was obviously malicious and identified it as ransomware" | Triage scored 7/10, "Shows suspicious behavior", tags defense_evasion, discovery and persistence. No ransomware label or family appears in the PDF |
| The public RSA key is stored in `HKCU\SOFTWARE\750569DBD0\Files\(Default)` (Figure 7 text) | Regshot shows `Files\` as an empty string. The HTML reply is in `Keys\Public` (REG_SZ) and `Keys\Wallpaper` (258 bytes of binary). The window title in the report's Figure 7 says `keys\public` |
| Wireshark "showing retrieval of public RSA-2048 key" (Figure 6) | The capture shows a GET with a long path and INetSim's default page as the reply. It is not a key. RSA-2048 appears only in the ransom window text |
| "Encryption of user's files" followed by the ransom window | No encrypted file was observed. The window is shown; whether encryption ran is not established. The report itself states that encryption did not work |
| Registry table (Table 3) lists the four `HKLM\SOFTWARE\Microsoft\Tracing\…` keys as modifications | They are Windows RAS tracing defaults created per image name, not sample configuration. They are also missing the Triage keys (`52B87B2FC5`, `611F174BC2`) |
| Dropped-files table lists only `750569DBD0.exe` and `.img` | The same copy appears under a different name in each Triage run: `C:\Users\Admin\AppData\Roaming\52B87B2FC5.exe` and `C:\Users\Admin\AppData\Roaming\611F174BC2.exe` |
| File-attributes table (Table 6) gives the `.img` the same TLSH as the executable | The `.img` is the 258-byte INetSim page (SHA-256 `f0a3eec2…ce0`); the TLSH on that row was copied from the executable |
| "No FLOSS strings were successfully extracted" (Table 7) | `floss.txt` lists 1,198 static strings and identifies .NET, including the `Mutex`, AES and RSA type names and `Microsoft Windows Auto Update.exe` |
| "Packed? Yes" for the sample and the copy | Not confirmed. FLOSS reads normal .NET metadata names, which argues against heavy packing, but this was not tested |
| Domains table lists five domains as contacted | Only `cabin.su` was contacted over HTTP, and only in the local run. The other four were queried in Triage and never reached over TCP |

*Sources: Triage report 261109-nhagxaeh47 (PDF, 23 pages), `triage_win10.pcapng`, `triage_win11.pcapng`, `cryptolocker_2014_1002.pcapng`, the Regshot diff (`~res-x64.txt`), `procexp_cryptolocker_2014_1002.txt`, `Logfile.PML` (strings only), `floss.txt`, and the ODT report with its screenshots.*

## References

- Triage sandbox report for this sample: <https://tria.ge/261109-nhagxaeh47/behavioral1>
- Write-up cited in the original report: <https://iss4cf0ng.github.io/2026/04/01/2026-4-1-CryptoLocker/> (not re-read for this post)
- Earlier post on the September 2013 native build: [CryptoLocker (Sep 2013 build)](/posts/cryptolocker-2013)
