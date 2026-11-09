---
title: "Cerber: a ransomware sample that deletes itself, drops its ransom note first and hides an RSA key in plain sight"
description: A walk through a Cerber-tagged 32-bit ransomware executable, built from my own lab report, two Triage sandbox runs and my static checks of the binary. Covers the self-deleting batch file, the ransom note in Crashpad folders, the embedded RSA key and Tor portal, why the sandbox saw no encryption, and corrections to my first reports.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-27
---

*Analysis dates: sandbox runs on 9 October 2026, my report (version 1) written 9 to 10 October. This post re-checks that report against the Triage export, the sample itself and the sandbox packet captures, so a few details differ from the PDF. Those differences are listed below.*

## Summary

This is a 764,928-byte 32-bit Windows console executable that Triage scored 10/10 and tagged **Cerber**. When I ran it in a sandbox it did three visible things. It looked up the machine's language and country, it wrote a small batch file called `1.bat` that deletes the original executable (retrying until the delete works), and it dropped a ransom note called `__$$RECOVERY_README$$__.html` into browser Crashpad folders. In the same folders it created empty-looking `.locked` copies of files named `metadata`, `settings.dat` and `throttle_store.dat`.

**No user documents were encrypted in either run, and no network traffic belonged to the sample.** The sandbox image held nothing the sample wanted. The binary tells the rest of the story: a hard-coded RSA-1024 public key, linked Crypto++ RSA-OAEP and AES code, a Tor payment address that matches the note, and a target list built around Atlassian Confluence backup folders. So I can say the ransomware capability is real. I can't say what it would have encrypted on a real server, because I never ran it on one.

| | |
|---|---|
| Sample | `84cbffb8…ed12f973.exe`, 764,928 B, PE32 console, not packed |
| SHA-256 | `84cbffb84b7c9ced79b511f82a15414d9202ab68479dfe44cec7b745ed12f973` |
| Header timestamp | 2021-12-04 12:17:05 UTC (can be forged, so I do not rely on it) |
| Sandbox | Triage sample `261009-nzjf5svzdy`: Windows 10 2004 (84 s) and Windows 11 (270 s), both 9 Oct 2026 |
| Other evidence | Static strings and imports (readpe, rabin2, strings, DetectItEasy), YARA 4.5.0, Triage packet captures |

A standalone execution-chain report with every path, command line and frame range accompanies this post.

## Concepts used in this sample

- **Hybrid encryption.** Ransomware encrypts files with a fast symmetric cipher such as AES, then encrypts that AES key with an RSA public key built into the program. Only the holder of the matching private key can recover the file key, which is why the victim has to pay.
- **Crypto++.** A public C++ cryptography library. Malware authors link it in instead of writing their own, and its C++ type names survive in the binary, which makes it easy to recognise.
- **Crashpad.** The crash-report database that Chrome, Edge and other Chromium software keep in a `Crashpad` folder. Its files (`metadata`, `settings.dat`) are small and always present, so they are easy targets for a program that just wants to touch something.
- **8.3 short name.** Windows keeps a short alias for long file names. `84cbffb84b…exe` becomes `84CBFF~1.EXE`, which is why the delete command in the logs looks shortened.
- **Onion address.** A Tor hidden service. It can only be reached through Tor, so a sandbox that never starts Tor never contacts it.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Cerber at a glance</div><div class="fig-sub">Everything the sample did in the sandbox, in order</div></div><div class="fig-draw" role="img" aria-label="Run the executable, query language and country, drop and run 1.bat, delete the original by its short name, then drop the ransom note and .locked files in Crashpad folders. No network traffic."><svg viewBox="0 0 560 290" width="560" height="290" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 258" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Run from %TEMP%</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">32-bit console executable, no dropper stage before it</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Check language and country</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">NLS\Language and Geo\Nation registry values are read, nothing is written</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="142" r="3" style="fill:var(--accent)"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Drop and run 1.bat</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">Loops until the original executable is gone, then deletes itself</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="200" r="3" style="fill:var(--accent)"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Second delete by short name</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">cmd /c del ...\84CBFF~1.EXE >> NUL</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Ransom note and .locked files</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">In Crashpad folders only. No network traffic from the sample</text></svg></div></figure>

My own flow chart from the report shows the same five steps:

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Flow chart from my report</div><div class="fig-sub">The first-pass view, before the static analysis below</div></div><div class="fig-draw"><img src="/shared/img/cerber/flow-diagram.png" alt="Flow chart: user runs the Cerber executable, it queries geolocation registry keys, drops and runs 1.bat in Temp, runs cmd del on the short-named executable, then drops the ransom message in the Chrome Crashpad folder" width="462" height="572" loading="lazy" /></div></figure>

## Indicators of compromise

### Files

Full paths from the Triage report. Hashes are for the files Triage captured; I re-hashed the two I hold.

| Path | SHA-256 | Role |
|---|---|---|
| `C:\Users\Admin\AppData\Local\Temp\84cbffb84b7c9ced79b511f82a15414d9202ab68479dfe44cec7b745ed12f973.exe` | `84cbffb8…ed12f973` (re-hashed) | The sample, run in place and then deleted |
| `C:\Users\Admin\AppData\Local\Temp\1.bat` | `4e86c42a3ccde83c3ead528f8aa0915cac6825452d2e756d366658cf2851611b` (re-hashed) | Self-delete script, identical in both runs |
| `C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Crashpad\__$$RECOVERY_README$$__.html` | `092e60467befd714e66eff884184d53ec1e44d0c44c9fc3306c14e0794688973` (re-hashed) | Ransom note |
| `C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Crashpad\metadata.locked` | `fd73489e0d8e73389f1bee6b48e31d014bce5480bef8518311fe21405cef252a` | Output of the encryption routine (Windows 10 run) |
| `C:\Program Files (x86)\Google\GoogleUpdater\141.0.7340.0\Crashpad\` | not captured | `metadata.locked`, `settings.dat.locked`, note. Both runs |
| `C:\Program Files\MsEdgeCrashpad\` | not captured | `metadata.locked`, `settings.dat.locked`, `throttle_store.dat.locked`, note. Windows 10 run only |
| `C:\Program Files\Crashpad\` | not captured | `metadata.locked`, `settings.dat.locked`, note. Windows 10 run only |

Triage lists `settings.dat` under `C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Crashpad\` (win11) and `C:\Program Files\MsEdgeCrashpad\` (win10) with the same SHA-256, `e9ffef11…e66d4f`. The same hash in two different folders means the file is a stock empty Crashpad settings file, not something the sample made.

### Registry

No Run key, scheduled task or other persistence value was observed.

### Mutexes

None observed. No mutex appears anywhere in either Triage run, and I am not inventing one.

### Command lines

```text
"C:\Users\Admin\AppData\Local\Temp\84cbffb84b7c9ced79b511f82a15414d9202ab68479dfe44cec7b745ed12f973.exe"
C:\Windows\system32\cmd.exe /c ""C:\Users\Admin\AppData\Local\Temp\1.bat" "
"C:\Windows\system32\cmd.exe" /c del C:\Users\Admin\AppData\Local\Temp\84CBFF~1.EXE >> NUL
```

### Network

None from the sample. The `.onion` address was never contacted.

### Other indicators

Byte-verified strings from the binary:

| String | Notes |
|---|---|
| `http://pigetrzlperjreyr3fbytm27bljaq4eungv3gdq2tohnoyfrqu4bx5qd.onion/bt01` | Tor payment portal prefix. The note appends a long victim ID after `bt01` |
| `http://xxxx.onion/xxxx-xxxx-xxxx-xxxx` | Template for a second portal address |
| `__$$RECOVERY_README$$__.html`, `.locked` | Note name and encrypted-file marker |
| `C:\Program Files\Atlassian\Application Data\Confluence` (plus `\backups`, `\attachments`, `\shared-home`) | Target folders |
| `del /f /q "`, `>> NUL`, `1.bat` | Batch and delete command fragments |

## Execution flow

### 1. Start

The sample runs straight from `%TEMP%` in both sandbox runs. There is no earlier dropper stage in either.

### 2. Language and country check

The sample and both `cmd.exe` children open `HKLM\SYSTEM\ControlSet001\Control\NLS\Language`. In the Windows 10 run the sample also reads `Control Panel\International\Geo\Nation`, which is what produced Triage's "Checks computer location settings" tag. Nothing is written. This matches ransomware that skips machines in certain countries, but the report only shows the lookup, not any decision made from it.

### 3. Drop and run `1.bat`

The batch file is the same in both runs (same SHA-256), so it is a fixed part of the sample and not generated by the sandbox. Triage did not extract its text, but I had a copy of the file and its contents are:

```bat
@echo off
:Repeat
del /f /q "C:\Users\Admin\AppData\Local\Temp\84cbffb8...ed12f973.exe"
if exist "C:\Users\Admin\AppData\Local\Temp\84cbffb8...ed12f973.exe" (
choice /t 1 /d y /n >nul
goto Repeat
)
del %0
```

It deletes the executable, and if the file is still locked it waits one second with `choice` and tries again. When the executable is finally gone, `del %0` removes the batch file itself. The command line is `cmd.exe /c ""...\1.bat" "`.

### 4. Second delete

A separate `cmd.exe` runs `del ...\84CBFF~1.EXE >> NUL`. This deletes the same executable by its short name and hides any error. Triage records that the sample process wrote to the memory of both `cmd.exe` children, so the sample is what built these command lines.

### 5. Ransom note and `.locked` files

In each Crashpad folder the sample opens an existing file for modification and creates a sibling with `.locked` added, then writes `__$$RECOVERY_README$$__.html` next to them. The note is a multi-language page with a Cerber banner:

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Ransom note, language picker</div><div class="fig-sub">__$$RECOVERY_README$$__.html opened in a browser. Eleven languages</div></div><div class="fig-draw"><img src="/shared/img/cerber/note-language.png" alt="Page titled Cerber Ransomware Instructions with a Select your language list: English, Arabic, Chinese, Dutch, French, German, Italian, Japanese, Portuguese, Spanish and Turkish" width="1512" height="737" loading="lazy" /></div></figure>

<figure class="art-fig"><div class="fig-head"><div class="fig-title">Ransom note, English text</div><div class="fig-sub">Says the files are encrypted but "not damaged", and sends the victim to a personal Tor page</div></div><div class="fig-draw"><img src="/shared/img/cerber/note-english.png" alt="English ransom text saying files have been encrypted by Cerber Ransomware and that the only way to decrypt them is to buy Cerber Decryptor at a personal onion page" width="1378" height="697" loading="lazy" /></div></figure>

The link in the note is the same `pigetrz…bx5qd.onion/bt01…` address found in the binary. The note's HTML contains that URL 33 times and no other `.onion` address.

### 6. What did not happen

Only Crashpad-adjacent files were touched. No Desktop or Documents file was changed, no browser `Login Data`, `Cookies` or `Web Data` file was opened, and no `.locked` copy of a user file exists in either run. This is a narrow dynamic footprint. The static section below explains why I think the sandbox image simply had nothing on the target list.

### 7. Unrelated processes

In the Windows 10 run `OpenWith.exe` and `rundll32.exe shell32.dll,SHCreateLocalServerRunDll` also appear. Triage attributes "Modifies registry class" and "Suspicious use of SetWindowsHookEx" to `OpenWith.exe`, and the report links the sample's process only to its two `cmd.exe` children. I read these as ordinary shell activity, not part of the sample.

### Sandbox tags and heuristics reviewed

Step 7 above lists the unrelated processes seen in the Windows 10 run. The Crashpad writes first looked like sandbox housekeeping; the evidence in step 5 shows they come from the sample.

## Reverse engineering notes

### What the binary shows

Dynamic analysis showed the note and the deletes. These checks show what the sample is built to do.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">RSA public key in the executable</div><div class="fig-sub">DetectItEasy hex view at file offset 0x952a8, next to the "CBC" and "AES" strings</div></div><div class="fig-draw"><img src="/shared/img/cerber/die-rsa-key.png" alt="DetectItEasy hex viewer showing a base64 string starting MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ followed by the strings CBC and AES and MGF1 and RSA" width="1064" height="593" loading="lazy" /></div></figure>

| Finding | Evidence |
|---|---|
| RSA-1024 public key | Base64 DER blob starting `MIGfMA0GCSqGSIb3DQEB…` at file offset `0x952a8`, in `.rdata` |
| Crypto++ RSA-OAEP and AES-CBC | Type names such as `OAEP@VSHA1`, `TF_EncryptorBase`, `CBC_Encryption`, `MGF1` in the strings |
| CryptoAPI random numbers | `CryptAcquireContextA`, `CryptGenRandom`, `CryptReleaseContext` |
| Note name and Tor address | `__$$RECOVERY_README$$__.html` sits right beside the two onion strings |
| Confluence target list | The four `Atlassian\Application Data\Confluence` paths above, with `c:\windows` and `c:\system volume information` excluded |
| Not packed | Five standard sections, entropy 3.4 to 6.7, readable C++ type names |

Together these fit the usual shape: AES encrypts the files, the embedded RSA key wraps the AES key, and the victim is told to visit the Tor page. I did not run the encryption on test data, so I have not verified key generation, the file format or whether the files can be recovered.

## Detection

- A process that creates `1.bat` in `%TEMP%` and runs `cmd.exe /c ""…\1.bat" "`, followed by `cmd.exe /c del …~1.EXE >> NUL` for its own parent. The `choice /t 1 /d y /n` retry loop is unusual.
- Files named `__$$RECOVERY_README$$__.html` or ending in `.locked`, especially inside `Crashpad` folders under `Program Files`.
- Any process writing to `C:\Program Files\Atlassian\Application Data\Confluence\backups` that is not Confluence.
- Network or DNS for `pigetrzlperjreyr3fbytm27bljaq4eungv3gdq2tohnoyfrqu4bx5qd.onion` from a user's browser (it will not resolve outside Tor).

**YARA.** My report ships a hash-only rule. The strings below are byte-verified and more useful on variants:

```yara
rule Cerber_Confluence_Ransomware
{
    meta:
        description = "Cerber-tagged ransomware: RSA/OAEP linkage, note name, onion portal prefix and Confluence target paths"
    strings:
        $note  = "__$$RECOVERY_README$$__.html" ascii
        $onion = "pigetrzlperjreyr3fbytm27bljaq4eungv3gdq2tohnoyfrqu4bx5qd.onion" ascii
        $ext   = ".locked" ascii
        $oaep  = "OAEP@VSHA1@CryptoPP" ascii
        $conf  = "Atlassian\\Application Data\\Confluence" ascii nocase
    condition:
        uint16(0) == 0x5A4D and filesize < 2MB and $note and 2 of ($onion, $conf, $oaep, $ext)
}
```

My report's version of this rule is validated against the sample and four system binaries. The one above is not re-run in this post, so treat it as a draft until it has been.

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Execution | T1059.003 Windows Command Shell | `cmd.exe /c 1.bat`, `cmd /c del` |
| Defense Evasion | T1070.004 File Deletion | `1.bat` and the short-name `del` |
| Discovery | T1614 System Location Discovery / T1614.001 System Language Discovery | `NLS\Language` and `Geo\Nation` reads |
| Discovery | T1082 System Information | Registry reads in both runs |
| Impact | T1486 Data Encrypted for Impact | From the binary and the `.locked` output |

Triage also lists T1555.003, T1552.001 and T1005 for credential theft and local data collection. **I am not carrying those forward.** No browser credential file was read and nothing was staged or sent.

## Confidence and limits

**Observed.** Both command lines, the identical `1.bat` hash across runs, the language and country lookups, the `.locked` files and the note in the Crashpad folders, and the absence of any sample-related network traffic, persistence key or mutex.

**From the binary only.** The RSA key, the Crypto++ linkage, the Confluence target list and the Tor address. The note's link matching the binary's address is checked, but I have not decoded the key or tried to decrypt anything.

**Inferred.** That `.locked` files are the encryption routine's output, that the note is dropped to every folder it encrypts in, and that the empty sandbox is why no real files were encrypted. The `.locked` files were not opened.

**Not established.** What the sample would encrypt on a real Confluence server, what the Geo\Nation check does with its result, whether the 2021 header timestamp is real, and how this sample relates to the Cerber family from 2016. I only know that family from the Proofpoint reference below, not from comparing code. Triage's "Cerber" tag is the sandbox's call, and the 2021 timestamp and Confluence targeting do not match the 2016 original, so "Cerber-tagged" is the claim I can make.

**Not used.** After the Triage runs I made a local detonation with a Procmon log, before and after registry hives and a 15-minute packet capture. I have not parsed those for this post. The capture contains about 28 MB of SMB traffic between the guest and another lab host, which looks like my own file sharing, but I have not confirmed it. Nothing in this post depends on them.

### Corrections to earlier reports

- **The Crashpad writes are not Crashpad housekeeping.** I first read them as a sandbox false positive. The ransom note name, `.locked` marker and Tor address are all in the binary, so the writes are encryption output and note drops.
- **"Stealer" and "spyware" tags are not supported.** They come from the sample opening files inside browser-profile folders. No credential store was read, and no data left the machine.
- **My report v1 gave the file size as 794,624 bytes.** The file on disk is 764,928 bytes (Triage's 747 KB). The DetectItEasy table in the report has a typo.
- **My report v1 describes one ransom note, in the Chrome Crashpad folder.** Triage shows the note written into three or four Crashpad folders per run (two in the Windows 11 run, four in the Windows 10 run, counting the Chrome profile folder).
- **The sandbox run does not show encryption of user files.** My report v1 says "no encryption was observed" and I still stand by that, but with the explanation above.

## References

- Local lab analysis, report v1 (9 to 10 October 2026)
- Triage sandbox report `261009-nzjf5svzdy`, behavioral1 (Windows 10) and behavioral2 (Windows 11)
- Execution-chain report accompanying this post
- Proofpoint, Cerber ransomware: <https://www.proofpoint.com/us/threat-reference/cerber-ransomware>
