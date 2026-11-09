---
title: "Brbbot: a trojan that copies itself, hides its config in a resource and tells a server what is running on your PC every 30 seconds"
description: A walk through brbbot.exe from launch to beacon, built from my own lab analysis with Process Monitor, ProcDOT, Wireshark and IDA. Covers the persistence, the delayed self-delete my first report missed, how the RC4 config and XOR-encoded process list work, and corrections to the first report.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-27
---

*Analysis dates: the detonation and packet capture ran on 29 July 2026 on an isolated Windows 10 VM. My report is version 1.0. This post re-checks that report against the raw Procmon, Wireshark and configuration files, so a few details differ from the PDF. Those differences are listed below.*

## Summary

Brbbot is a small 64-bit Windows trojan, 75,776 bytes, with no packing and no child processes. It does four things in the first second after launch. It copies itself to the user's Roaming folder, writes a machine-wide Run key that points at the copy, queues the original file and its config for deletion at the next reboot, and decrypts a 73-byte settings string it carries as a resource. Then it starts a loop. Every 30 seconds it sends the victim's IP address, computer name and a list of every running process to `brb.3dtuts.by`.

My lab network answered with INetSim's default web page. The configuration lists five command words (`exec`, `file`, `conf`, `exit`, `sleep`), so a real server could probably run programs or push files, but **nothing in my capture exercised them**. What I can show is a persistent beacon and a fingerprinting channel. I can't show what a live operator would have done with it.

| | |
|---|---|
| Sample | `f47060d0…8f05034a21e.exe`, 75,776 B, PE64, not packed |
| SHA-256 | `f47060d0f7de5ee651878eb18dd2d24b5003bdb03ef4f49879f448f05034a21e` |
| SHA-1 | `4db5a8e237937b6d7b435a8506b8584121a7e9e3` |
| MD5 | `1c7243c8f3586b799a5f9a2e4200aa92` |
| Header timestamp | 2015-02-25 06:12:18 UTC (can be forged, so I do not rely on it) |
| Environment | Windows 10 x64 guest, run as administrator from `C:\binaries\brbbot\`, INetSim and Wireshark on a REMnux VM |
| Telemetry | Procmon (2,940 brbbot events), ProcDOT, Wireshark (737 frames, 265 s), FLOSS, IDA, CyberChef |

A standalone, print-ready execution-chain report with every registry value, path and frame range accompanies this post.

## Concepts used in this sample

- **Run key.** Anything listed under `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` starts when any user logs on. Writing under HKLM needs administrator rights.
- **PE resource.** Executables can carry named blobs in their `.rsrc` section. Brbbot hides its settings in one called `CONFIG`.
- **CryptoAPI key derivation.** `CryptCreateHash`, `CryptHashData` and `CryptDeriveKey` turn a string into an encryption key. Here a string is hashed with MD5 and the digest becomes an RC4 key.
- **RC4 and XOR.** Both are simple stream ciphers. They hide data from a casual look, but they are trivial to reverse once the key is known, and here the key is in the file.
- **PendingFileRenameOperations.** A registry value that Windows reads at boot. An entry with an empty destination means "delete this file". Programs use it to remove files that are locked or that they want gone after a restart.
- **WinINet.** The Windows HTTP library behind Internet Explorer. Malware uses it because it follows system proxy settings and looks like normal browser traffic.
- **ZwQuerySystemInformation.** An undocumented ntdll call. Class 5 returns every running process.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Brbbot at a glance</div><div class="fig-sub">Everything the sample did in my capture, in order</div></div><div class="fig-draw" role="img" aria-label="Run, copy to Roaming, set the Run key, queue deletion of the original and the config at reboot, decrypt the embedded config, collect IP, hostname and process list, then beacon to brb.3dtuts.by every 30 seconds."><svg viewBox="0 0 560 400" width="560" height="400" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 374" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Run as brbbot.exe</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">From C:\binaries\brbbot, with administrator rights</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Copy to Roaming</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">C:\Users\&lt;user&gt;\AppData\Roaming\brbbot.exe</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="142" r="3" style="fill:var(--accent)"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Set the Run key</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">HKLM\...\Run\brbbot points at the copy</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="200" r="3" style="fill:var(--accent)"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Queue deletions</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">PendingFileRenameOperations removes the original and the config at next boot</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Decrypt the config</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">Resource CONFIG, MD5 of YnJiYm90 as the RC4 key</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Collect</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">IP, hostname and process names, XOR 0x5B then hex</text><circle cx="11" cy="374" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="374" r="3" style="fill:var(--accent)"/><text x="34" y="372" font-size="15" style="fill:var(--ink)">Beacon every 30 s</text><text x="34" y="390" font-size="13" style="fill:var(--ink-3)">GET brb.3dtuts.by/ads.php. The sinkhole never answered with a command</text></svg></div></figure>

## Indicators of compromise

### Files

Full paths were seen in Procmon.

| Path | SHA-256 | Role |
|---|---|---|
| `C:\Users\w10analysis\AppData\Roaming\brbbot.exe` | same as the sample (analyst's IOC table; not re-hashed) | Self-copy that the Run key points at |
| `C:\binaries\brbbot\brbconfig.tmp` | `ee20ec1f9a574280270c0045caa6eda5b35b35d131e7a45db7d0afdaef131e08` | 73-byte RC4-encrypted config, written next to the original exe |

### Registry

| Key | Value |
|---|---|
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | `brbbot` = `C:\Users\w10analysis\AppData\Roaming\brbbot.exe` (REG_SZ, 96 B) |
| `HKLM\System\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations` | REG_MULTI_SZ with `\??\C:\binaries\brbbot\brbbot.exe` and `\??\C:\binaries\brbbot\brbconfig.tmp`, each with an empty destination |

### Mutexes

None observed. Procmon cannot record them, and the import table and strings contain no `CreateMutex` or `OpenMutex`.

### Command lines

One, verbatim from Procmon: `"C:\binaries\brbbot\brbbot.exe" `, PID 6796, parent explorer.exe. No child processes were created.

### Network

| Indicator | Notes |
|---|---|
| `brb.3dtuts.by` | C2 host. DNS frame 303 and Host header of all 8 requests. Lab DNS pointed it at my INetSim box |
| `/ads.php?i=<ip>&c=<hostname>&p=<hex>` | Beacon URI. The format string `%s?i=%s&c=%s&p=%s` is in the binary |
| `Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)` | Hard-coded user agent. Claims Windows 7 even on Windows 10 |
| Port 80, one new TCP connection per beacon, 30 s apart | Plain HTTP, no encryption |

## Execution flow

### 1. Start

Procmon records `Process Start` at 01:25:32.134 with an empty command line and the working directory `C:\binaries\brbbot\`. A worker thread (6820) does everything that follows. Windows looks for DLLs such as `WININET.dll` in that directory first and finds nothing (NAME NOT FOUND), then loads the real ones from System32. This is ordinary search order, not a side-loading attempt.

### 2. Copy

The worker creates `C:\Users\w10analysis\AppData\Roaming\brbbot.exe` with disposition OverwriteIf, sets its length to 75,776 bytes and reads the source file of the same size. There is no separate `WriteFile` because `CopyFileA` copies inside the kernel. The copy has the source's last-write time, which is normal `CopyFile` behaviour and not deliberate timestomping.

### 3. Persist

Within a millisecond of the copy it opens the HKLM Run key for writing, sets `brbbot` to the copy's path and calls `RegFlushKey`. The copy has not been run, and nothing in the capture shows the key firing, because the VM never rebooted.

### 4. Queue the clean-up

The step my first report missed. Right after the Run key the worker writes `PendingFileRenameOperations` twice. The first write lists the original `brbbot.exe` with an empty target. The second adds `brbconfig.tmp`. Between them Procmon shows a `CreateFile` on `brbconfig.tmp` returning NAME NOT FOUND, so the config is queued for deletion before it exists. After a reboot the original and the config disappear and only the Roaming copy remains. I did not reboot, so the deletion itself is not observed, and my reading depends on how Windows treats an empty target.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">What brbbot touched</div><div class="fig-sub">ProcDOT graph of PID 6796, worker thread 6820 and WinINet thread 7724</div></div><div class="fig-draw"><img src="/shared/img/brbbot/procdot-overview.jpg" alt="ProcDOT graph with brbbot.exe PID 6796 connected to threads 6820 and 7724, the files brbbot.exe and brbconfig.tmp, the brbbot autostart key, a Crypto RSA key file, SOFTWARE.LOG1, an HTML file and the server 192.168.122.10" width="1508" height="643" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Registry writes</div><div class="fig-sub">ProcDOT: the Run key, PendingFileRenameOperations and the WinINet values</div></div><div class="fig-draw"><img src="/shared/img/brbbot/procdot-registry.jpg" alt="ProcDOT registry view showing the autostart key Run brbbot, PendingFileRenameOperations, and several Internet Settings ZoneMap and Cache CachePrefix values written by thread 7724" width="1053" height="602" loading="lazy" /></div></figure>

### 5. Extract and decrypt the config

IDA shows the function that does this.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Writing the config</div><div class="fig-sub">IDA: FindResourceA on CONFIG, then CreateFileA("brbconfig.tmp") and WriteFile</div></div><div class="fig-draw"><img src="/shared/img/brbbot/code-create-config.jpg" alt="Decompiled function create_brbconfig calling FindResourceA with the name CONFIG, LoadResource, LockResource, CreateFileA brbconfig.tmp and WriteFile" width="1023" height="582" loading="lazy" /></div></figure>

It calls `FindResourceA` for the `CONFIG` resource, then `CreateFileA("brbconfig.tmp")` and `WriteFile`. Procmon logs a 73-byte write at 01:25:32.3629 and a 73-byte read at .3890. I also found the same 73 bytes in the executable at file offset 74352.

The next function hashes the string `YnJiYm90` (that is base64 for `brbbot`) with MD5, calls `CryptDeriveKey` with Algid `0x6801` (RC4) and decrypts the file. MD5 of the string is `e2834a5bba1c28b7f536bd3ec5f1d8e0`. With that as the RC4 key the file becomes:

```text
uri=ads.php;exec=cexe;file=elif;conf=fnoc;exit=tixe;encode=5b;sleep=30000
```

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Decrypted configuration</div><div class="fig-sub">CyberChef: RC4 with the MD5 of YnJiYm90 over the 73-byte brbconfig.tmp</div></div><div class="fig-draw"><img src="/shared/img/brbbot/cyberchef-config.jpg" alt="CyberChef RC4 recipe on the 73 byte brbconfig.tmp with output uri=ads.php;exec=cexe;file=elif;conf=fnoc;exit=tixe;encode=5b;sleep=30000" width="1218" height="737" loading="lazy" /></div></figure>

Reading it: `uri` is the page the beacon requests. `exec`, `file`, `conf` and `exit` are the four command words with their values, and the values are simply the words reversed or mangled (`exec` becomes `cexe`, `file` becomes `elif`, `conf` becomes `fnoc`, `exit` becomes `tixe`). `encode=5b` is the XOR key for the data it sends. `sleep=30000` is the delay in milliseconds. Running the CryptoAPI code also makes Windows create a key-container file under `Microsoft\Crypto\RSA`, which is a side effect and not an attacker file.

### 6. Collect

The computer name comes from `ActiveComputerName` in the registry (`DESKTOP-EMBRA04`). The IP address is `192.168.122.205`. The process list comes from `ZwQuerySystemInformation` with class 5.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Process enumeration</div><div class="fig-sub">IDA: ZwQuerySystemInformation with class 5</div></div><div class="fig-draw"><img src="/shared/img/brbbot/code-zwquery.jpg" alt="Decompiled line calling ZwQuerySystemInformation with the first argument 5" width="1150" height="100" loading="lazy" /></div></figure>

Each name is joined with `;`, XOR-ed with 0x5B and written as two hex digits per byte with `sprintf("%02x")`.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Hex encoding</div><div class="fig-sub">IDA: sprintf("%02x") over each byte of the buffer</div></div><div class="fig-draw"><img src="/shared/img/brbbot/code-hex-encode.jpg" alt="Decompiled loop calling sprintf with format %02x for each byte and advancing the output pointer by two" width="838" height="303" loading="lazy" /></div></figure>

Decoding frame 308 this way gives 122 names starting `Idle;System;Registry;smss.exe;csrss.exe;...` and ending with `Procmon64.exe;procexp64.exe;Wireshark.exe;dumpcap.exe;conhost.exe;...;brbbot.exe`. The list therefore also tells the server which analysis tools are running. The sample does not act on that in my capture.

### 7. Beacon

WinINet thread 7724 sends the request. DNS frames 303 and 304 resolve `brb.3dtuts.by`, then frame 308 is the first GET: 3,479 bytes, with the process list as the `p=` value. Each beacon is a new TCP connection.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The HTTP request list</div><div class="fig-sub">Wireshark HTTP requests. The 239.255.255.250:1900 entry is not brbbot</div></div><div class="fig-draw"><img src="/shared/img/brbbot/wireshark-http.jpg" alt="Wireshark HTTP requests dialog listing 239.255.255.250:1900 and brb.3dtuts.by with several GET /ads.php requests carrying i, c and p parameters" width="953" height="586" loading="lazy" /></div></figure>

| # | Time (s) | GET frame | Stream frames | Names in `p=` |
|---|---|---|---|---|
| 1 | 52.9 | 308 | 305–317 | 122 |
| 2 | 82.9 | 336 | 333–344 | 119 |
| 3 | 113.0 | 365 | 362–373 | 117 |
| 4 | 143.1 | 560 | 557–568 | 117 |
| 5 | 173.1 | 597 | 594–605 | 116 |
| 6 | 203.1 | 624 | 621–632 | 116 |
| 7 | 233.3 | 653 | 650–661 | 116 |
| 8 | 263.3 | 710 | 707–718 | 119 |

The gaps are 30.0 to 30.1 seconds, matching `sleep=30000`. The count falls when `sppsvc.exe` exits after the first beacon and rises when the search indexer helpers start before the last one, which shows `p=` is built fresh each time. Every reply is INetSim's 258-byte default page. Each time, WinINet writes the body to `INetCache\IE\BA75UDV4\ads[1].htm` and deletes it straight away. Procmon stopped before beacon 8, so that one is visible only in the capture.

### 8. End

I let it run about six minutes and then killed it.

### Sandbox tags and heuristics reviewed

Several things in the capture look suspicious and are not brbbot: the `239.255.255.250:1900` request in Wireshark's HTTP dialog, the HKCU `ZoneMap` and `CachePrefix` values, a 52-byte file under `Microsoft\Crypto\RSA`, and the `ads[1].htm` cache file. They are explained below.

## Detection

- A new `HKLM\...\Run` value pointing at `AppData\Roaming` for an executable that was created seconds earlier, especially from a process that also writes `PendingFileRenameOperations`.
- A process that writes a `.tmp` file into its own directory and then reads the same file back, with no other file activity.
- Repeated HTTP GETs to `/ads.php` every 30 seconds with a very long hex `p=` query and an `MSIE 8.0` user agent on a Windows 10 host. The query length (3,100 to 3,300 hex digits) is about twice the process count.
- Proxy or DNS logs for `brb.3dtuts.by`.

**YARA.** One rule from strings in the sample, tested with YARA 4.5.0. It matches `brbbot.exe` and does not match the encrypted `brbconfig.tmp`, `/bin/ls`, `/usr/bin/python3` or `/usr/bin/curl`. The config blob is better matched by hash.

```yara
rule Brbbot_Beacon_Trojan
{
    meta:
        description = "brbbot.exe: encrypted CONFIG resource written to brbconfig.tmp, key string, beacon URI template and hard-coded MSIE 8 user agent"
    strings:
        $cfg  = "brbconfig.tmp" ascii
        $res  = "CONFIG" ascii
        $key  = "YnJiYm90" ascii
        $uri  = "%s?i=%s&c=%s&p=%s" ascii
        $ua   = "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)" ascii
        $run  = "Software\\Microsoft\\Windows\\CurrentVersion\\Run" ascii
    condition:
        uint16(0) == 0x5A4D and filesize < 500KB and $cfg and $uri and 2 of ($key, $ua, $res, $run)
}
```

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Persistence | T1547.001 Registry Run Keys | HKLM Run value `brbbot` |
| Defense Evasion | T1070.004 File Deletion | Delete-at-reboot queue |
| Defense Evasion | T1140 Deobfuscate/Decode Files / T1027.013 Encrypted/Encoded File | Config in a resource, decrypted at run time |
| Discovery | T1082 System Information / T1057 Process Discovery / T1016 Network Configuration | Host, process and network data in the beacon |
| Command and Control | T1071.001 Web Protocols | HTTP beacon to `brb.3dtuts.…` |
| Command and Control | T1132.002 Non-Standard Encoding | XOR and hex encoding |
| Exfiltration | T1041 Exfiltration Over C2 Channel / T1029 Scheduled Transfer | Fixed-interval beacon carrying the data |

## Confidence and limits

**Observed.** The self-copy, the Run key, both `PendingFileRenameOperations` writes, the config write and read, all 8 beacons with their frame ranges, the DNS lookup, and the content of every `p=` value (decoded from the capture with the key from the decrypted config).

**From the code only.** The MD5 and RC4 derivation, the `ZwQuerySystemInformation` class, the `%02x` encoding and the meaning of the command words. I decrypted the config by hand and it came out as readable text, which supports that reading, but no command was ever delivered.

**Inferred.** That the empty-target entries delete the files at reboot, that the command words are tasking verbs, that the IP address comes from an IP Helper call, and that the Roaming copy has the same hash as the sample.

**Not established.** What a live server replies with, what the sample does after a reboot or after an `exec` or `file` reply, whether the Run key launches the copy successfully, and whether the 2015 header timestamp is real. Only one run has telemetry, so I cannot say whether other runs behave identically.

### Corrections to earlier reports

Going back to the raw files turned up several points where my report was wrong or incomplete:

- **The domain is `brb.3dtuts.by`.** My text, flow figure and IOC table spell it `3duts.by`. Anyone blocking my spelling would block nothing.
- **`239.255.255.250:1900` is not brbbot.** I read Wireshark's HTTP request list as the sample trying to reach that address. It is an SSDP `M-SEARCH` sent by `192.168.122.1`, the host bridge, and it is multicast, not a server.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Process Explorer</div><div class="fig-sub">brbbot.exe shows PID 4060 here, but 6796 in Procmon and ProcDOT</div></div><div class="fig-draw"><img src="/shared/img/brbbot/procexp.jpg" alt="Process Explorer tree showing brbbot.exe under explorer.exe next to Procmon64, procexp64 and Wireshark with dumpcap" width="863" height="704" loading="lazy" /></div></figure>

- **The Run key path was garbled.** I wrote `...\Runbrbbot\`. The key is `...\CurrentVersion\Run` and `brbbot` is the value name.
- **I missed `PendingFileRenameOperations`.** It is visible in my own ProcDOT screenshot but I never described it.
- **The CyberChef screenshot shows a truncated key.** The passphrase field reads `bd3ec5f1d8e0`, the last 6 bytes of the MD5. The full 16 bytes decrypt the file. Those 6 bytes alone do not.
- **Process Explorer shows a different PID.** brbbot is PID 4060 there and 6796 in Procmon and ProcDOT, so that screenshot is from another execution, whose logs I did not keep. All numbers in this post are from the 6796 run.
- **The `p=` value is not an opaque payload.** It is a hex string of XOR-encoded process names, and it decodes with the config's own `encode=5b`.

## References

- Local lab analysis, report v1.0 (28 July 2026), Procmon, ProcDOT and Wireshark captures of 29 July 2026
- Execution-chain report accompanying this post
