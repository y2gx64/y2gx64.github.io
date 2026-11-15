---
title: "Ransom:Win32/Cryptolocker!exe"
description: "`CryptoLocker_2013.exe` is a 346,112-byte 32-bit PE file with a header timestamp of 2013-09-07 14:57:57 UTC (can be altered) that carries CryptoLocker ransom-note resources. The name `Ransom:Win32/Cryptolocker!exe` comes from the analyst's case label. A January 2014 .NET sample that also uses the CryptoLocker name is covered in a separate post."
authors: [Y2GX64]
category: Malware Analysis
date: 2026-11-08
---

*Analysis date: Triage runs on 4 November 2026, the local execution on 8 November 2026. The analyst's report (version 1, dated 7 to 8 November) covers the same sample. This post re-checks that report against the Triage PDF (Windows 10 and Windows 11 runs), three packet captures, the Regshot diff, FLOSS output and the extracted resources, so some details differ from the report. The differences are listed at the end.*

## Summary

`CryptoLocker_2013.exe` is a 346,112-byte 32-bit Windows executable carrying the CryptoLocker ransom-note resources (RSA-2048 wording, a 76-pattern file-type list, MoneyPak, Ukash, cashU and Bitcoin pages). When run, it copied itself into the user's `%APPDATA%` folder under a GUID-style name, restarted from that copy, wrote a `CryptoLocker` value under the user's Run key, sent one 192-byte HTTP POST to the hard-coded address `184.164.136.134`, and then started resolving a long list of pseudo-random domain names.

**In all three runs the malware reached the point where it needed a server reply and never received one, so the analyst saw no encryption, no ransom window and no ransom-note file.** The hard-coded host completed the TCP handshake and acknowledged the POST but returned no HTTP response. The random domains either did not exist (Triage) or were answered by the lab's simulated-internet server (local), which handed back a default web page. The analyst can describe the persistence and the check-in; the analyst cannot say what the real server would have sent or how the file encryption behaves.

| | |
|---|---|
| Sample | `CryptoLocker_2013.exe` (folder name `CryptoLocker_10Sep2013`), 346,112 B, PE32 i386. Triage ran it as `{71257279-042b-371d-a1d3-fbf8d2fadffa}.exe` |
| SHA-256 | `d765e722e295969c0a5c2d90f549db8b89ab617900bf4698db41c7cdad993bb9` |
| Detection-style name | `Ransom:Win32/Cryptolocker!exe`, taken from the title of the analyst's report (`Ransomware!Win32cryptolocker!exe`), rewritten in Microsoft `Type:Platform/Family!suffix` form. Not checked against a Microsoft detection |
| MD5 / SHA-1 (Triage, of the dropped copy) | `04fb36199787f2e3e2135611a38321eb` / `65559245709fe98052eb284577f1fd61c01ad20d` |
| Header timestamp | 2013-09-07 14:57:57 UTC (can be forged; the analyst does not rely on it) |
| Environment | Triage `win10v2004-20260911-en` and `win11-20260911-en` (sample 261104-rv9djsxt3j, score 10/10); local Windows 10 VM with INetSim as the simulated internet |
| Evidence | Triage PDF (25 pages), `triagewin10.pcapng` (3,824 frames, 888.8 s), `triagewin11.pcapng` (3,595 frames, 901.6 s), `cryptlocker.pcapng` (9,857 frames, 314.9 s), Regshot diff, Process Explorer snapshot, Procmon log (read as strings only), FLOSS, DetectItEasy, 9 extracted resources |

A standalone execution-chain report accompanies this post.

## Concepts used in this sample

- **CryptoLocker.** A ransomware family first seen in September 2013. Public write-ups describe it encrypting documents with RSA and AES and selling the private key. This post only confirms the pieces the analyst's evidence shows.
- **Domain generation algorithm (DGA).** The malware computes many pseudo-random domain names itself and tries them in turn, so defenders cannot block one fixed address. Here the names have 12 to 15 letters and cycle through seven top-level domains.
- **Run key.** A registry location under the current user's hive whose values are programs Windows starts at logon. `HKCU\...\CurrentVersion\Run` needs no administrator rights.
- **INetSim.** A lab tool that simulates internet services. It answers every DNS and HTTP request with a canned reply, so anything "received" in the local capture is not from the real attacker.
- **Hard-coded C2.** A command-and-control address written into the program as a literal IP, so no DNS lookup is needed to reach it.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">CryptoLocker at a glance</div><div class="fig-sub">What the sample did in the lab, in order. The last step was never observed</div></div><div class="fig-draw" role="img" aria-label="Launch the sample, copy itself to the Roaming folder and restart from the copy, write the Run key, POST 192 bytes to 184.164.136.134 with no reply, resolve about a thousand generated domains, and an unobserved final stage of encryption and ransom window."><svg viewBox="0 0 560 350" width="560" height="350" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 318" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Launch the sample</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">Desktop (local) or %TEMP% (Triage)</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="84" r="3" style="fill:var(--accent)"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Copy itself and restart from the copy</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">AppData\Roaming\{GUID-style}.exe, started with "/r&lt;original path&gt;" then "/w000002xx"</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="142" r="3" style="fill:var(--accent)"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Persist with one Run value</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">HKCU\...\CurrentVersion\Run\CryptoLocker</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="200" r="3" style="fill:var(--accent)"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">POST 192 bytes to 184.164.136.134/home/</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">Handshake and ACK only, no HTTP reply, server reset after about 5 s</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Resolve generated domains</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">About 1,000 queries in 15 min, all NXDOMAIN on Triage</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--ink-3);stroke-dasharray:3 3" stroke-width="1.2"/><text x="34" y="314" font-size="15" style="fill:var(--ink-3)">Key fetch, file encryption, ransom window</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">Not observed in any run. Known only from strings and resources</text></svg></div></figure>

The analyst's own flow chart, drawn before this re-check, is below. It shows the last two boxes as events; the evidence does not.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Flow chart from the analyst's report</div><div class="fig-sub">Version 1. See the corrections table</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2013/analyst-flowchart.png" alt="Flow chart: user runs CryptoLocker_2013.exe, copies itself to AppData Roaming, starts a new process from the copy, kills its initial process, then reaches out to 184.164.136.134 and creates a registry key in parallel, begins to encrypt files, displays ransom message" width="441" height="792" loading="lazy" /></div><div class="fig-cap">The boxes "kills its initial process", "begins to encrypt user's files" and "displays ransom message" were expectations, not observations.</div></figure>

## Indicators of compromise

### Files

Full paths. `Admin` is the Triage user; `w10analysis` is the lab user. The folder is `%APPDATA%`, which is `C:\Users\<user>\AppData\Roaming`. The GUID-style name was the same in both Triage runs and different in the local run.

| Path | Status | Hash | Role |
|---|---|---|---|
| `C:\Users\Admin\AppData\Roaming\{34184A33-0407-212E-3320-09040709E2C2}.exe` | Dropped | SHA-256 `d765e722…cdad993bb9`, MD5 `04fb3619…a38321eb` (Triage) | Self-copy, byte-identical to the sample. Triage run on Windows 10 and Windows 11 |
| `C:\Users\w10analysis\AppData\Roaming\{C2E5B1A1-242F-0302-1816-45513D3C0E0D}.exe` | Dropped | Not re-hashed here. The analyst's report states it is identical to the sample | Self-copy in the local run. Persisted by the Run value, seen as parent PID 1120 and child PID 5792 |
| `C:\Users\Admin\AppData\Local\Temp\{71257279-042b-371d-a1d3-fbf8d2fadffa}.exe` | Pre-existing | SHA-256 `d765e722…cdad993bb9` | The sample as Triage launched it. Triage tags it "Deletes itself"; the analyst did not see the deletion in the local run |
| `C:\Users\w10analysis\Desktop\CryptLocker_2013.exe` | Pre-existing | SHA-256 `d765e722…cdad993bb9` | The sample as the analyst launched it. Its path appears in the child's `/r` argument in the Procmon strings |

Left out: the Procmon string table lists thousands of Windows system and analysis-tool paths; none is a sample artifact. Strings such as `{C2E5B1A1-…}.exe.Local`, `.exe.Config` and `AppData\SystemResources\{C2E5B1A1-…}.exe.mun` appear there and look like Windows loader probes for redirection files (the analyst read strings, not results, so the analyst did not confirm that). No ransom-note file, no encrypted file and no exfiltration bundle was observed. The ransom text lives inside the executable as resources (see Other indicators).

### Registry

| Key | Value | Purpose |
|---|---|---|
| `HKU\S-1-5-21-3777368691-943496736-2945925315-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` (the local VM, Regshot) | `CryptoLocker` = `"C:\Users\w10analysis\AppData\Roaming\{C2E5B1A1-242F-0302-1816-45513D3C0E0D}.exe"` | The single autostart entry. Runs the self-copy at logon |
| `\REGISTRY\USER\S-1-5-21-2091445952-3649787497-104050984-1000\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` (Triage Windows 10) | `CryptoLocker` = `"C:\\Users\\Admin\\AppData\\Roaming\\{34184A33-0407-212E-3320-09040709E2C2}.exe"` | Same entry, same value name |
| `\REGISTRY\USER\S-1-5-21-1826067017-2692080558-3687773357-1000\Software\Microsoft\Windows\CurrentVersion\Run` (Triage Windows 11) | `CryptoLocker` = `"C:\\Users\\Admin\\AppData\\Roaming\\{34184A33-0407-212E-3320-09040709E2C2}.exe"` | Same entry |
| `\REGISTRY\MACHINE\SYSTEM\ControlSet001\Services\Tcpip\Parameters\Hostname` and `\Domain` | Read by the Roaming copy | Host name and domain read. A read, not a change |
| `\REGISTRY\MACHINE\SYSTEM\ControlSet001\Control\NLS\Language` | Opened by the Temp original and the Roaming copy | Locale lookup. Weak evidence; see heuristics |

The strings `Software\CryptoLocker`, `Software\CryptoLocker\Files`, `PublicKey`, `PrivateKey` and `VersionInfo` exist in the binary, but Regshot (332 changes between 07:37:49 and 07:44:54) shows no `Software\CryptoLocker` key. The other Regshot changes are Windows (IdentityCRL caches, Error Reporting, Group Policy).

### Mutexes

Not recorded in the evidence used for this post. Triage does not list mutexes for this sample, and Regshot and the Procmon read cannot show them. FLOSS shows the import `CreateMutexW` and the static strings `Global\` and `Local\`, so the sample very likely creates one, but the analyst did not recover a name.

### Command lines

```text
"C:\Users\Admin\AppData\Local\Temp\{71257279-042b-371d-a1d3-fbf8d2fadffa}.exe"
"C:\Users\Admin\AppData\Roaming\{34184A33-0407-212E-3320-09040709E2C2}.exe" "/rC:\Users\Admin\AppData\Local\Temp\{71257279-042b-371d-a1d3-fbf8d2fadffa}.exe"
"C:\Users\Admin\AppData\Roaming\{34184A33-0407-212E-3320-09040709E2C2}.exe" /w00000220
C:\Users\Admin\AppData\Roaming\{34184A33-0407-212E-3320-09040709E2C2}.exe
"C:\Users\Admin\AppData\Roaming\{34184A33-0407-212E-3320-09040709E2C2}.exe" /w00000240
"C:\Users\w10analysis\Desktop\CryptLocker_2013.exe"
"C:\Users\w10analysis\AppData\Roaming\{C2E5B1A1-242F-0302-1816-45513D3C0E0D}.exe" "/rC:\Users\w10analysis\Desktop\CryptLocker_2013.exe"
"C:\Users\w10analysis\AppData\Roaming\{C2E5B1A1-242F-0302-1816-45513D3C0E0D}.exe" /w00000218
```

Lines 1 to 4 are Triage Windows 10 (`/w00000220`); line 5 is Triage Windows 11, whose other three lines are identical to Windows 10 apart from the `/w` value. Lines 6 to 8 are the local run, from the Procmon string table. The `/w` number differs in every run.

### Network

| Indicator | Role |
|---|---|
| `184.164.136.134:80` | Hard-coded C2. One `POST /home/` per run, `Host: 184.164.136.134` |
| `njoanqxnkxkhrpu.ru`, `elbcxsqiasvtpan.org`, `fvvnvkgetcwnquk.co.uk`, `ggygwjlqbeawrrw.info`, `hqtrubbmunbqjal.com` (first five in Triage Windows 10) | Generated domains. Names differ by day, so they are examples, not stable indicators |
| `mrikxpahcakll.co.uk`, `nafapirgryjgm.info`, `omgowanjvwrxe.com` (first three in Triage Windows 11) | Generated domains, same note |
| `etocejkwcnuu.info`, `yqxyhlanqtgn.info`, `xhycosdaeqiht.net` (local run) | Generated domains answered by INetSim. Lab artifact, not attacker infrastructure |
| `192.168.122.10` | The analyst's INetSim and file server. Not an indicator |
| `8.8.8.8:53` | Resolver used by the Triage guests. Not an indicator |
| `c.pki.goog`, `settings-win.data.microsoft.com`, `login.live.com`, `ocsp.digicert.com`, `www.intel.com`, `certificates.intel.com`, Windows Update hosts | Windows and certificate background traffic. Not an indicator |

User-Agent on the POST: `Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.2; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729)` in Triage, and the same without the three `.NET CLR` tokens in the local run.

### Packet correlation

Frame numbers are per capture. "W10" is `triagewin10.pcapng`, "W11" is `triagewin11.pcapng`, "Local" is `cryptlocker.pcapng`.

| Frames | Endpoint | Bytes | Step |
|---|---|---|---|
| W10 188–194, 223 (8.28 s to 13.43 s) | `184.164.136.134:80` | 961 total (361 + 246 sent data frames) | 4. C2 POST. SYN, SYN-ACK, request in frames 191–192, ACKs only, server RST at 223 |
| W11 6–13 (8.51 s to 13.60 s) | `184.164.136.134:80` | 961 total | 4. Same pattern |
| Local 128–134, 196 (39.65 s to 59.20 s) | `184.164.136.134:80` | 913 total | 4. Same pattern; RST arrives about 19.5 s after the SYN |
| W10 336–3823 (18.47 s to 888.67 s) | `8.8.8.8:53` | 1,023 queries for 753 unique names | 5. Generated domains. 1,270 NXDOMAIN, 4 SERVFAIL, 18 NOERROR across the capture (the analyst did not check each name) |
| W11 14–3592 (18.69 s to 901.58 s) | `8.8.8.8:53` | 1,366 queries for 801 unique names | 5. 1,857 NXDOMAIN, 7 NOERROR (not checked) |
| Local 273–9844 (64.29 s to 314.81 s) | `192.168.122.10:53` | 237 queries for 227 unique names | 5. Every answer NOERROR with `192.168.122.10` |
| Local 279–9851 (last at 314.83 s) | `192.168.122.10:80` | 227 POSTs of 192 B each | 5. INetSim replies `200 OK`, default page, 258 B |
| Local 233–265 (62.69 s to 62.85 s) | `192.168.122.10:80` | 8 CRL GETs | Not the sample: certificate revocation lookups for `www.intel.com` and `certificates.intel.com` |
| Local 26.55 s to 310.56 s | `192.168.122.10:445` | 5,453 frames, about 1.9 MB | Not attributed to the sample: SMB2 to the lab server. See limits |

### Cross-run consistency

Identical in all three runs: the `POST /home/ HTTP/1.1` request and its header order (`Cache-Control`, `Connection: Close`, `Pragma`, `Accept`, `User-Agent`, `Content-Length: 192`, `Host`), the 192-byte body length, `Host` equal to the bare IP, the handshake-and-ACK-only response from `184.164.136.134`, the `CryptoLocker` Run value name, the Roaming self-copy and the `/r` then `/w` argument pattern.

Different: the GUID-style file name (identical on both Triage guests, different on the local VM), the number after `/w` (`00000220`, `00000240`, `00000218`), the user SID, the User-Agent's `.NET CLR` tokens, and the 192-byte POST body bytes (starting `65a6d79a`, `fed6e1ba` and `ce808cd6`). The generated domains overlap heavily between the two Triage runs (554 shared names out of 753 and 801 unique) and not at all between Triage (4 November) and the local run (8 November). Together that points to a date-seeded generator and to per-host values in the file name and POST body. The analyst did not reverse the algorithm, so that stays an inference.

Inside the local run, all 228 POST bodies (the one to the IP and 227 to generated domains) are byte-identical.

### Other indicators

- Ransom text (from the extracted resources, hashes below): "Your important files encryption produced on this computer", "RSA-2048", "The single copy of the private key ... located on a secret server", placeholders `%AMOUNT_USD%`, `%AMOUNT_EUR%`, `%BITCOIN_ADDRESS%`, `%AMOUNT_BTC%`.
- Price table in the resources: 300 USD, EUR, AUD and CAD, 600 BRL and NZD, 6000 CZK, 3000 DKK and MXN, 300 GBP, 4500 NOK and SEK, 1500 PLN, 600 RON, 2 BTC.
- Resource SHA-256: ransom RTF `4cde1662…a148a0`, MoneyPak RTF `9509ff35…890854`, Ukash RTF `3edfb302…f48060`, cashU RTF `5c8f47c7…aa681`, Bitcoin RTF `95fad350…b25d9b`, and four PNG payment logos.
- Target file patterns in the strings: 76 entries from `*.odt`, `*.doc`, `*.xls` and `*.pst` through camera RAW formats to `*.p7c`, including `????????.jpg` and `img_*.jpg`.
- Other strings: `version=%u&id=%u`, `s/home/`, `ObtainUserAgentString`, `Microsoft Enhanced RSA and AES Cryptographic Provider`, `The list of encrypted files`.

## Execution flow

### 1. Delivery

The analyst launched `CryptLocker_2013.exe` from the Desktop of the local VM. Triage ran the same bytes from `C:\Users\Admin\AppData\Local\Temp\{71257279-042b-371d-a1d3-fbf8d2fadffa}.exe`. How the sample would reach a real victim is not part of this evidence. Public write-ups describe email and botnet delivery; the analyst did not test that.

### 2. Self-copy and restart

The original process copied itself to `AppData\Roaming` under a GUID-style name and started the copy with the argument `"/r<path of the original>"`. Triage shows the original (PID 3772 on Windows 10, 2284 on Windows 11) writing into the memory of the new process (5200, 2980), and that process writing into a third (4920, 6104) started as `/w00000220` or `/w00000240`. The analyst's Process Explorer snapshot shows the same shape: parent 1120, child 5792.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The restarted copy</div><div class="fig-sub">Process Explorer, the local run</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2013/procexp-tree.png" alt="Process Explorer rows for two processes named {C2E5B1A1-242F-0302-1816-45...}.exe with PIDs 1120 and 5792, the second nested under the first" width="676" height="44" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Where the copy landed</div><div class="fig-sub">ProcDOT graph node, the local run</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2013/procdot-dropped-copy.png" alt="ProcDOT file node for C:\Users\w10analysis\AppData\Roaming\{C2E5B1A1-242F-0302-1816-45513D3C0E0D}.exe" width="749" height="139" loading="lazy" /></div></figure>

The `/r` argument matches Triage's "Deletes itself" tag, because it hands the copy the path of the file to remove. The analyst confirmed the deletion only through that tag, not in the local capture.

### 3. Persistence

The copy wrote `CryptoLocker` under the user's Run key. Triage shows the value being set by the Roaming copy. In the local run Regshot shows the value added, ProcDOT marks it as autostart, and Autoruns lists it next to OneDrive.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The Run key in ProcDOT</div><div class="fig-sub">Graph node marked autostart, the local run</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2013/procdot-run-key.png" alt="ProcDOT yellow node HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\CryptoLocker (AUTOSTART!) with a red arrow from a process node numbered 8024" width="684" height="159" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The Run key in Autoruns</div><div class="fig-sub">Logon tab, the local run</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2013/autoruns-run-key.png" alt="Autoruns listing under HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run with entries CryptoLocker, highlighted in red, and OneDrive" width="706" height="72" loading="lazy" /></div><div class="fig-cap">OneDrive in the same list is a normal Windows entry, not part of the sample.</div></figure>

This is the only autostart mechanism observed. No service, scheduled task or WMI entry appeared in Triage or Regshot.

### 4. Check-in to the hard-coded address

About 8.3 s into both Triage captures, and at 39.65 s into the local capture, the copy opened TCP port 80 on `184.164.136.134` without any DNS lookup and sent a 307-byte header (247 bytes in the local run) and a 192-byte body. The body has Shannon entropy of 6.99 bits per byte in the Windows 10 capture, so it is not readable text, and the analyst did not decode it. The remote end acknowledged the data, sent no HTTP response, and reset the connection about 5 s later (19.5 s in the local run). That host answered through the lab's gateway too (TTL 63, a different MAC address from INetSim), so the analyst cannot tell whether the real server, a sinkhole or the gateway is behind that address.

### 5. Generated domains

Starting about 10 s after the check-in (18.5 s in Triage, 64.3 s locally), the copy resolved a steady stream of 12 to 15 letter names, roughly one per second in Triage, through `.ru`, `.org`, `.co.uk`, `.info`, `.com`, `.net` and `.biz` in repeating order. On Triage they all failed (NXDOMAIN, plus four SERVFAIL for `kbclpqrnuhdja.co.uk`), so no second POST was sent. In the local run INetSim answered every name with its own address, and the copy sent 227 identical 192-byte POSTs to `/home/` on those hosts, each answered with INetSim's default page. Those 227 requests show how the malware reacts to any answer; they say nothing about the real server.

### 6. What the analyst did not see

No key request visibly succeeded, no file was encrypted, no ransom window appeared and no `Software\CryptoLocker` registry key was written. The behaviour in the resources and strings (RSA key pair, list of encrypted files, payment pages) is the evidence for that stage, and it stays unconfirmed.

### Sandbox tags and heuristics reviewed

- **Family `cryptolocker`, tag `ransomware`, score 10/10.** The family label is supported by the resources and strings, but Triage saw no encryption. The tag describes the file, not behaviour in the run.
- **"Deletes itself".** Consistent with the `/r<original path>` argument. Confirmed by Triage only.
- **"Executes dropped EXE".** True and expected: the sample starts its own copy.
- **"Adds Run key to start application".** Confirmed by Triage, Regshot, ProcDOT and Autoruns.
- **"Suspicious use of WriteProcessMemory".** The targets are the sample's own freshly started copies, not another program. It describes how the restart works; the analyst did not see injection into an unrelated process and did not tag T1055.
- **"System Location Discovery: System Language Discovery".** The evidence is a read of `Control\NLS\Language`, which many Windows programs do during start-up, including the first process. The analyst treats it as weak and did not carry it into the analyst's mapping.
- **"Reads the TCP/IP host and domain name from the registry".** True for the Roaming copy. The reason is unknown; `version=%u&id=%u` suggests an ID is built, but the analyst did not show that the host name feeds it.
- **"Unsigned PE".** True and uninformative.
- **Microsoft, Windows Update, Intel and `c.pki.goog` traffic.** Background traffic from Windows and certificate validation. Not the sample.
- **SMB2 to `192.168.122.10:445` in the local capture.** Traffic to the analyst's lab server. Nothing in the sample's strings uses SMB, so the analyst does not count it as malware activity.
- **DetectItEasy "packed (96%)".** An entropy score (7.71 overall). The code region sits near 6.2 to 6.5; the high-entropy part is the 253,952-byte resource section, and the nine resources the analyst extracted explain only 43,173 bytes of it. The analyst did not unpack anything, so the analyst reports "packed" as unconfirmed.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Entropy of the file</div><div class="fig-sub">DetectItEasy, CryptoLocker_2013.exe</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2013/die-entropy.png" alt="DetectItEasy entropy view showing packed (96%) with overall entropy 7.71172, low-to-moderate entropy for the first 60,000 bytes and a flat line near 8 from about 87,000 to 315,000 bytes" width="1501" height="623" loading="lazy" /></div><div class="fig-cap">The flat line near 8 is the resource section.</div></figure>

## Reverse engineering notes

Static checks only. FLOSS 3.1.1 found 4,055 ASCII and 227 UTF-16 strings, no stack strings and four decoded strings (`Global\`, `Local`, and two short fragments). The C2 IP, the registry paths and the whole ransom text are readable in the file, so the sample does not hide its configuration behind a runtime decryption routine that FLOSS could see. Imports of note: `CreateMutexW`, `RegDeleteKeyExW`, `SHGetKnownFolderPath`, `ObtainUserAgentString`, and the Microsoft Enhanced RSA and AES provider. The analyst did not disassemble the key handling, the DGA or the POST body builder.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">FLOSS run</div><div class="fig-sub">Terminal, REMnux</div></div><div class="fig-draw"><img src="/shared/img/cryptolocker-2013/floss-terminal.png" alt="Terminal running floss CryptLocker_2013.exe redirected to floss.txt, with progress bars for finding decoding function features and extracting stackstrings" width="1065" height="132" loading="lazy" /></div></figure>

## Detection

- **File:** a copy of the sample named like `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}.exe` in `%APPDATA%` (a GUID-shaped name in the Roaming root is unusual); executables running from `%APPDATA%` with a `/r<path>` argument. YARA on the strings is a good fit: `184.164.136.134`, `Software\CryptoLocker\Files`, `version=%u&id=%u`, `%AMOUNT_USD%` and the extension list. The analyst did not write or test a rule for this post.
- **Registry:** a new `CryptoLocker` value under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` pointing into `%APPDATA%`. Any `HKCU\Software\CryptoLocker` key means the later stage ran.
- **Process:** a process spawned from `%APPDATA%` with `/r` followed by a path, then a child with `/w` and eight digits; the original file disappearing shortly after.
- **Network:** an HTTP POST to `/home/` with a 192-byte body and an `MSIE 7.0 ... Trident/7.0` User-Agent, sent to a bare IP in the Host header; bursts of about one DNS lookup per second for random 12 to 15 letter names across seven top-level domains with a high NXDOMAIN rate. Block `184.164.136.134` as a precaution; it is one address and may no longer be used.

## MITRE ATT&CK

Rows marked "Triage" appear in Triage's matrix. Rows marked "analyst" are the analyst's mapping from the packets and strings.

| Tactic | Technique | Evidence |
|---|---|---|
| Persistence, Privilege Escalation | T1547.001 Registry Run Keys / Startup Folder (Triage) | `Run\CryptoLocker` set to the Roaming copy; Regshot, ProcDOT, Autoruns |
| Defense Evasion | T1070.004 File Deletion (Triage) | "Deletes itself" plus the `/r<original path>` argument. Not confirmed in the local run |
| Defense Evasion | T1112 Modify Registry (Triage) | The same Run value write; the analyst counts it once |
| Discovery | T1016 System Network Configuration Discovery (Triage) | Reads of `Tcpip\Parameters\Hostname` and `Domain` |
| Command and Control | T1071.001 Web Protocols (analyst) | `POST /home/` over HTTP to `184.164.136.134` and, locally, to INetSim hosts |
| Command and Control | T1568.002 Domain Generation Algorithms (analyst) | About 1,000 generated names in 15 minutes, 554 shared names between same-day runs |

Deliberately not tagged: T1486 Data Encrypted for Impact (no file was encrypted), T1573 Encrypted Channel (the body looks encrypted but the analyst did not decode it), T1055 Process Injection (the memory writes target the sample's own copies), T1614.001 System Language Discovery (weak evidence), T1027.002 Software Packing (unconfirmed) and any exfiltration technique (none seen).

## Confidence and limits

**Observed.** The Roaming self-copy and the `/r` and `/w` restarts in all three runs. The `Run\CryptoLocker` value in all three. One `POST /home/` of 192 bytes to `184.164.136.134` per run, with handshake and ACKs but no HTTP response and a reset afterwards. About 1,000 generated-domain lookups on Triage, all failing, and 227 on the local run, all answered by INetSim, each followed by an identical 192-byte POST. No `Software\CryptoLocker` key, no ransom-note file and no encrypted file.

**From the code only.** The 76 file-type patterns, the RSA-2048 and payment-page text, the price table, the `Software\CryptoLocker\{PublicKey, PrivateKey, VersionInfo, Files}` registry paths and the `CreateMutexW` import. The analyst did not see any of them used.

**Inferred.** That the DGA is date-seeded (554 shared names between same-day runs, none with a run four days later). That the GUID-style name and the POST body depend on the host. That the 192-byte body is encrypted or encoded (entropy 6.99). That the SMB traffic in the local capture is the analyst's own file transfer.

**Not established.** What `184.164.136.134` would answer if it were live, and whether the generated domains ever resolved to real servers. Whether the original file is deleted in the local run, because the analyst read the Procmon log as strings and did not parse events. What the 210,000 or so bytes of the resource section that the analyst did not extract contain. The mutex name. How the encryption works and how fast it runs. Whether a different environment (a victim with Documents, network shares or a working C2) changes the behaviour. The 2014 samples in the same folder (`1002.exe`, `1003.exe`) were not analysed.

### Corrections to earlier reports

| Earlier report | What the data shows |
|---|---|
| Flow chart: "kills its initial process" | Only Triage's "Deletes itself" tag supports it; the analyst did not see it in the local run. The `/r` argument fits it |
| Flow chart and text: "Begins to encrypt user's files", "Displays ransom message" | Not observed in any of the three runs. The report's own text says "presumably"; the chart presents it as fact |
| "Creates another thread of itself" | Triage and Process Explorer show a second and third process (parent and child), not a thread |
| Command-line table: `"C:\Users\Admin\AppData\Roaming{<UUID>}.exe"` | The path has a backslash: `...\Roaming\{<UUID>}.exe`. Also the first row mixes the user `Admin` (Triage) with `w10analysis` (analyst) |
| IOC table: dropped file path `C:\Users\w10analysis\AppData\Roaming\` with name `{<UUID>}.exe` | Two different names were seen: `{34184A33-0407-212E-3320-09040709E2C2}.exe` (Triage, both OS versions) and `{C2E5B1A1-242F-0302-1816-45513D3C0E0D}.exe` (mine). Neither is a fixed indicator |
| Report text: the sample was run "as administrator" | Triage ran it as `Admin` and the Run key is under HKCU; nothing in the evidence needs administrator rights |
| File attributes table: "Packed? Yes" for both files | Based only on DIE's entropy score. Unpacking was not attempted, so "unconfirmed" is the accurate label |
| Domains list in the execution flow | Correct, but they come from Triage Windows 10 and are date-dependent. In the local capture the names were different (for example `etocejkwcnuu.info`) |
| Report says the C2 is "contacted" | True, but there was no HTTP response in any run. "Contacted" should read "POSTed to, no reply" |
| Not in the report | The POST body size and headers, the `/w` argument, the 554-domain overlap between Triage runs, and that INetSim answered all generated domains in the local run |

*Sources: Triage report 261104-rv9djsxt3j (behavioral1 Windows 10, behavioral2 Windows 11), `triagewin10.pcapng`, `triagewin11.pcapng`, `cryptlocker.pcapng`, `~res-x64.txt` (Regshot), `cryptlocker.txt` (Process Explorer), `Logfile.PML` (strings only), `floss.txt`, the analyst's report `cryptolocker_analysis.odt`. Not analysed: the `.hivu` registry snapshots, Procmon events, the `.drawio` source, the 2014 samples.*

## References

- Triage report: <https://tria.ge/261104-rv9djsxt3j>
- MITRE ATT&CK, T1547.001: <https://attack.mitre.org/techniques/T1547/001/>
- MITRE ATT&CK, T1568.002: <https://attack.mitre.org/techniques/T1568/002/>
- INetSim: <https://www.inetsim.org/>
