---
title: "Jigsaw: a ransomware with a hardcoded key and a countdown that deletes your files"
description: A Firefox-branded .NET ransomware that encrypts every drive with one static AES key, then deletes encrypted files every hour until someone pays. How it spreads through the system, how its ConfuserEx layer was removed, and how to decrypt files offline.
authors: [Y2GX64]
category: Malware Analysis
date: 2026-10-24
---

*Analysis date: 11 October 2026. The findings combine a sandbox report, packet captures, a static unpacking of the sample's ConfuserEx layer, the decompiled source and a working decryptor. Nothing from the sample was executed outside the sandbox.*

## Summary

Jigsaw is a .NET ransomware first seen in April 2016. It is named for the puppet from the film *Saw* on its ransom screen, and for a pressure tactic that sets it apart: after the countdown reaches zero, it starts deleting encrypted files, and it does so again every hour.

This sample is a build of the original family. Its activation date is hardcoded to 1 April 2016, which is long past, so it activates immediately. It encrypts every drive with one AES key that is stored inside the binary. **Because the key is static, victims can decrypt their files offline without paying.**

| | |
|---|---|
| Sample | `jigsaw` (run as `jigsaw.exe`), 290,304 B, PE32 .NET GUI executable (Triage reports 283 KB) |
| SHA-256 | `3ae96f73d805e1d3995253db4d910300d8442ea603737a1428b613061e7f61e7` |
| MD5 | `2773e3dc59472296cb0024ba7715a64e` |
| SHA-1 | `27d99fbca067f478bb91cdbcb92f13a828b00859` |
| Packer | ConfuserEx v0.6.0 anti-tamper, plus Costura (bundled assemblies) |
| Triage sample | `261010-j1dvtss19q`, score 10/10, "Known bad", family Jigsaw |
| Triage runs | win10v2004-20260911-en (150 s kernel, 125 s network) and win11-20260911-en (149 s, 125 s) |
| Packet captures | `win10.pcapng` (12 k packets, 135 s) and `win11.pcapng` (80 packets, 125 s) |
| Triage tags | jigsaw, ransomware, persistence, plus `stealer` and `spyware` (not supported by the code, see the end of the post) |

## Concepts used in this sample

- **ConfuserEx anti-tamper.** ConfuserEx is an open-source obfuscator for .NET. Its anti-tamper option encrypts the machine-code bodies of methods and decrypts them in memory at startup, so a decompiler reading the file sees correct method names but garbage inside them.
- **Costura.** A .NET tool that embeds dependencies (here `Newtonsoft.Json` and a resource assembly) inside the main executable, which makes the sample a single file.
- **Run key persistence.** Windows starts every program listed under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` when the user logs in. It needs no admin rights, which is why malware uses it so often (T1547.001).
- **Static key encryption.** Good ransomware generates a fresh key per victim and protects it with the attacker's public key. Jigsaw uses one fixed key and IV for every victim, so anyone who extracts them can decrypt everything.

## High-level overview

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">Jigsaw at a glance</div><div class="fig-sub">From first click to hourly deletions</div></div><div class="fig-draw" role="img" aria-label="Launch, copy to two folders, add a Run key, show a fake registration popup, encrypt every drive, show the ransom screen with a one hour countdown, then delete growing numbers of files every hour and 1000 files on any relaunch."><svg viewBox="0 0 520 414" width="520" height="414" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 26 L11 374" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="26" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="24" font-size="15" style="fill:var(--ink)">Launch</text><text x="34" y="42" font-size="13" style="fill:var(--ink-3)">jigsaw.exe, a Firefox-branded .NET app</text><circle cx="11" cy="84" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="82" font-size="15" style="fill:var(--ink)">Copy</text><text x="34" y="100" font-size="13" style="fill:var(--ink-3)">Drpbx\drpbx.exe and Frfx\firefox.exe</text><circle cx="11" cy="142" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="140" font-size="15" style="fill:var(--ink)">Persist</text><text x="34" y="158" font-size="13" style="fill:var(--ink-3)">HKCU Run value named firefox.exe</text><circle cx="11" cy="200" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="198" font-size="15" style="fill:var(--ink)">Decoy</text><text x="34" y="216" font-size="13" style="fill:var(--ink-3)">Fake "software registered" message box</text><circle cx="11" cy="258" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="258" r="3" style="fill:var(--accent)"/><text x="34" y="256" font-size="15" style="fill:var(--ink)">Encrypt</text><text x="34" y="274" font-size="13" style="fill:var(--ink-3)">Every drive, AES-128-CBC, .fun suffix</text><circle cx="11" cy="316" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><text x="34" y="314" font-size="15" style="fill:var(--ink)">Ransom screen</text><text x="34" y="332" font-size="13" style="fill:var(--ink-3)">$150 in Bitcoin, 60-minute countdown</text><circle cx="11" cy="374" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="374" r="3" style="fill:var(--accent)"/><text x="34" y="372" font-size="15" style="fill:var(--ink)">Punish</text><text x="34" y="390" font-size="13" style="fill:var(--ink-3)">Hourly deletions, 1,000 on any relaunch</text></svg></div></figure>

## Indicators of compromise

### Files

All three files are byte-identical to the original sample.

| Name | Path | SHA-256 |
|---|---|---|
| `drpbx.exe` | `%LOCALAPPDATA%\Drpbx\drpbx.exe` | `3ae96f73…61e7` |
| `firefox.exe` | `%APPDATA%\Frfx\firefox.exe` | `3ae96f73…61e7` |
| work files | `%APPDATA%\System32Work\` | `EncryptedFileList.txt`, `Address.txt`, a marker file named `dr` |

### Registry

The only change is the persistence value, written by both `jigsaw.exe` and `firefox.exe`:

| Key | Value |
|---|---|
| `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | `firefox.exe` = `C:\Users\<USER>\AppData\Roaming\Frfx\firefox.exe` |

### Mutexes

Not recorded in the evidence used for this post.

### Command lines

Triage shows `jigsaw.exe` starting the Drpbx copy and passing its own path as the argument, then the Frfx copy running:

```text
"C:\Users\Admin\AppData\Local\Temp\jigsaw.exe"
"C:\Users\Admin\AppData\Local\Drpbx\drpbx.exe" C:\Users\Admin\AppData\Local\Temp\jigsaw.exe
C:\Users\Admin\AppData\Roaming\Frfx\firefox.exe
```

### Network

None recorded. The sample uses hard-coded keys and makes no key request (see Reverse engineering notes).

### Other indicators

Files ending in `.fun`; an `EncryptedFiles` window listing paths; the "Thank you / Congratulations. Your software has been registered" message box; and assembly metadata claiming to be Firefox (product "Firefox", version `37.0.2.5583`, copyright "1999-2012 Firefox and Mozzilla developers", the misspelling included).

## Execution flow

### 1. Launch and decoy

The first thing a user sees is a message box titled "Thank you":

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The decoy</div><div class="fig-sub">A fake software registration</div></div><div class="fig-draw"><img src="/shared/img/jigsaw/popup.jpg" alt="Message box: Congratulations. Your software has been registered. Confirmation code 994759. Email us this code in the chat to active your software." width="551" height="238" loading="lazy" /></div></figure>

The box implies the program was cracked or pirated software that has now been "registered". The confirmation code is a constant, not a real one. The code shows this box only when the process starts with an argument, which is the second stage launched from the Drpbx copy.

### 2. Self-copy and persistence

On a first launch without arguments, the program creates the Run value, copies itself to `Roaming\Frfx\firefox.exe` and `Local\Drpbx\drpbx.exe`, then starts the Drpbx copy with the original path as its argument (spaces replaced with `?`) and exits. If writing the Run key fails, it falls back to a Startup-folder shortcut. The names imitate Firefox and Dropbox, which makes the files and the Run value blend into a normal user profile.

### 3. Wait, then encrypt

The main form checks every 6 seconds whether the current date is past `2016-04-01`, which is always true today, then encrypts the file system and opens the ransom window. In Triage the `.fun` files are created by `firefox.exe`. The sandbox counted **3,982** renamed files on Windows 10 and **1,677** on Windows 11, the difference coming from the software installed on each image.

### 4. Ransom screen

A topmost window with a typing effect, a one-hour countdown, a Bitcoin address and a "View encrypted files" button:

<figure class="art-fig"><div class="fig-head"><div class="fig-title">The ransom screen</div><div class="fig-sub">Windows 10 sandbox</div></div><div class="fig-draw"><img src="/shared/img/jigsaw/ransom-screen.jpg" alt="Ransom screen: green terminal-style text demanding 150 USD in Bitcoin within 24 hours, a Jigsaw puppet image, a 51:39 countdown and a Bitcoin address" width="1100" height="829" loading="lazy" /></div><div class="fig-cap">"1 file will be deleted." The countdown resets to 60:00 every time it reaches zero.</div></figure>

The note demands **$150 (or 0.4 BTC)** within 24 hours, warns that files will be deleted every hour in growing numbers, and says that after 72 hours everything left will go. The `Are you connected to the internet? Try again!` button is the payment check, covered below.

<figure class="art-fig"><div class="fig-head"><div class="fig-title">What it encrypted</div><div class="fig-sub">The "View encrypted files" window</div></div><div class="fig-draw"><img src="/shared/img/jigsaw/encrypted-files.jpg" alt="EncryptedFiles window listing paths such as C:\Program Files\7-Zip\History.txt with a Deleted column" width="740" height="441" loading="lazy" /></div></figure>

### Sandbox tags and heuristics reviewed

Triage's `stealer` and `spyware` tags are not supported by the evidence. Triage's `stealer` and `spyware` tags: the decompiled source has no credential-theft code, and the "reads browser data" signature most likely comes from files inside browser profile folders being encrypted.

## Reverse engineering notes

### How the encryption works

For each file, the encryption routine recurses breadth-first through every drive, skips `%APPDATA%\System32Work` and `C:\Windows`, and selects files that:

- end with one of **170 or more extensions** from an embedded list: Office and PDF documents, audio and video, QuickBooks files, design and graphics formats, and archives such as `.zip` and `.rar` (the `.fun` extension itself is removed from the list);
- are **smaller than 10,000,000 bytes**.

It then encrypts the file with AES-128-CBC into `<name>.fun` and deletes the original. The list of encrypted paths is saved to `EncryptedFileList.txt`.

```csharp
AesCryptoServiceProvider aes = new AesCryptoServiceProvider();
aes.Key = Convert.FromBase64String("OoIsAwwF23cICQoLDA0ODe==");   // 16 bytes
aes.IV  = <16-byte constant from the PE>;                          // static, not random
EncryptFile(aes, path, path + ".fun");                             // CBC + PKCS7 defaults
```

| | |
|---|---|
| Key (hex) | `3a822c030c05db7708090a0b0c0d0e0d` |
| IV (hex) | `00010003050300010000020006070600` |
| Mode | AES-128-CBC, PKCS7 padding |

Both values are compiled into the binary. There is no per-victim key, no key exchange and no network request to get one. In both Triage runs the only network activity was a certificate-revocation lookup (`c.pki.goog`) on Windows 10, and nothing attributed to the sample on Windows 11. **The ransom buys nothing that cannot be done offline.**

### The pressure mechanics

This is what makes Jigsaw dangerous to leave running:

- **Hourly deletions.** The countdown starts at 3,600 s. Each time it hits zero it resets and deletes `floor(1.1^n)` encrypted files, where `n` rises by one each hour. That is 1 file an hour for the first 8 hours, 2 files an hour from hour 9, about 8 files an hour at hour 24, and it keeps growing.
- **Relaunch penalty.** The first time the ransom form loads, it writes a marker file named `dr` in `System32Work`. If the form loads again, for example after a reboot through the Run key, it **deletes up to 1,000 encrypted files immediately**.
- **No easy exit.** Closing the window is cancelled with a dialog: "You are about to make a very bad decision. Are you sure about it?"
- **The 72-hour promise has no code behind it.** The note says everything left is deleted after 72 hours, but no code implements that. The hourly and relaunch deletions are the only deletion paths in the decompiled source.
- **Bitcoin address.** One of five hardcoded vanity addresses is chosen at random and saved to `Address.txt`, so it stays the same across restarts. The one in the screenshot ends `…ByWSG1`.

**The payment check does not work.** The "I made a payment" button queries a price and an address balance from `btc.blockr[.]io`, and if the balance is worth more than $150 it decrypts the files with the same static key and then removes itself. In the sandbox it only ever showed "Are you connected to the internet? Try again!". Whether that host still answers was not tested. Either way the key is already in the binary.

### Unpacking the ConfuserEx layer

A decompiler shows correct method signatures for this sample but fails on every body (`Invalid method header`, `Stack underflow`). That is the signature of ConfuserEx anti-tamper: every method body is encrypted, and the decryptor sits in plain IL inside `<Module>` so the runtime can execute it.

The layer was removed statically, without running anything:

1. Parse the metadata with `dnfile` and decompile only `<Module>` with `ilspycmd`, which works because those methods are not encrypted. That exposes the decryptor: a hash-based PRNG seeded from a constant that expands into a keystream, mixed again with four more constants from the IL.
2. Reimplement it in Python (`anti_tamper_decrypt.py`). The encrypted PE section is marked by a "name" field that is really a numeric marker, not ASCII text.
3. Rewrite the section and decompile the result. Every body that failed before now decompiled cleanly. The unpacked file has SHA-256 `d84a13b64492845ceea5712616684188ed86aae923f3a877a52e5d88e124cea4`.

A second blob, the Costura resource, was LZMA plus an XOR chain. Once decrypted it is a small .NET assembly (SHA-256 `ba24346c833928fba55c84522389333f35f98c8a9dcd7b16bbbb7fd135df506d`) that holds the extension list, the ransom-screen image, the five Bitcoin addresses and a bundled `Newtonsoft.Json`.

The IV is not a string. It is an array initialised from a `FieldRVA` blob, which a strings scan will not find, so it was dumped from the `FieldRva` table.

### Getting files back

Because the key and IV are constants, any `.fun` file decrypts offline. This was verified on a real `.fun` copy of 7-Zip's `readme.txt` taken from the sandbox. With OpenSSL alone:

```bash
openssl enc -d -aes-128-cbc \
  -K 3a822c030c05db7708090a0b0c0d0e0d \
  -iv 00010003050300010000020006070600 \
  -in readme.txt.fun -out readme.txt
```

The output matches the decryptor's result byte for byte, and OpenSSL strips the PKCS7 padding itself. A Python script, `decrypt_fun_files.py`, and a standalone build of it do the same for whole folders: they scan for `*.fun` files, write each result next to it as `*.fun_decrypted`, never touch the originals, and make no network connections. Run any decryptor on **copies** of the files. Anything Jigsaw has already deleted cannot be recovered this way, so stop the process and remove the Run value first.

## Detection

**YARA.** The exact-hash rule is trivial, so the two worth deploying are the dropped-copy rule and the strings rule for the unpacked or in-memory sample. The dropped-copy rule needs the scanned file's path passed as an external variable (`-d filepath=...`):

```yara
rule Jigsaw_Fun_Dropped_Copy_By_Path
{
    meta:
        description = "Dropped copies identified by install path: Local\\Drpbx\\drpbx.exe and Roaming\\Frfx\\firefox.exe, as small unsigned .NET PEs"
        confidence = "medium; needs the filepath external, catches modified copies"
    condition:
        uint16(0) == 0x5A4D and filesize > 200KB and filesize < 400KB
        and pe.number_of_signatures == 0
        and pe.data_directories[pe.IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR].virtual_address != 0
        and (filepath matches /\\AppData\\Local\\Drpbx\\drpbx\.exe$/i or filepath matches /\\AppData\\Roaming\\Frfx\\firefox\.exe$/i)
}
```

The strings rule looks for `Drpbx`, `Frfx`, `firefox.exe`, `.fun` and the `CurrentVersion\Run` string in a .NET PE. It can miss the on-disk file because ConfuserEx may encrypt those strings. A broad ConfuserEx hunting rule (small, unsigned, managed, "Confused by" markers) also exists, but it produces false positives. These rules were written from the Triage report and tested against the recovered copies only, with no clean-corpus false-positive test yet.

**Behavior.**

- A `firefox.exe` or `drpbx.exe` under `AppData\Roaming\Frfx` or `AppData\Local\Drpbx`, and a `firefox.exe` Run value that points there instead of Mozilla's install folder.
- A mass rename of files to `.fun` across all drives, followed by deletions of `.fun` files.
- A topmost window with the title text "I want to play a game".

## MITRE ATT&CK

| Tactic | Technique | Evidence |
|---|---|---|
| Persistence | T1547.001 Registry Run Keys | Run value written by `jigsaw.exe` and `firefox.exe` |
| Impact | T1486 Data Encrypted for Impact | Mass `.fun` rename |
| Impact | T1485 Data Destruction | Hourly deletion routine, from the code only |
| Defense Evasion | T1027 Obfuscated Files or Information | ConfuserEx layer |
| Defense Evasion | T1036 Masquerading | Copies named like Firefox and Dropbox |
| Collection / Discovery | T1005 Data from Local System / T1083 File and Directory Discovery | File enumeration for encryption |

Triage's own matrix lists T1547.001, T1112, T1012, T1082, T1005, T1555.003 and T1552.001. The last two come with Triage's `stealer` tag, which the code does not support.

## Confidence and limits

**Observed.** The dropped copies and the Run value in both Triage runs, the mass `.fun` rename, the decoy message box, the ransom screen and its countdown, and the file-encryption routine, which was confirmed both in the decompiled source and by decrypting a real `.fun` file.

**From the code only.** The hourly deletion formula, the 1,000-file relaunch deletion, the payment check against `btc.blockr[.]io` and the self-removal after payment. No hourly deletion was observed in the sandbox, and the payment path was not tested.

**Not established.** The payment check and the hourly deletion were not exercised in the sandbox, and the 72-hour deletion promised in the note is absent from the code.

## References

- Check Point Research, [Jigsaw ransomware decryption](https://blog.checkpoint.com/research/jigsaw-ransomware-decryption/)
- Triage sample `261010-j1dvtss19q` (behavioral1 and behavioral2)
