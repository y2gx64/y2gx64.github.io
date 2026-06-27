---
title: Phoenix - stack_one, NCS
date: 2026-06-25 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenixstack_one ctf but no source code
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_one from the series Phoenix found at <https://exploit.education/phoenix/stack-one/> but without referencing the source code this time. 

## Disassembling it 
Firstly, i loaded the binary `stack-one.elf` using Ghidra, followed by jumping to the starting function and selecting graph view. 

![](assets/posts/PWN/phoenix_stack_one_ncs/fg.png)


Firstly, this showed that the register EAX value is being compared to `0x496c5962`. 

Secondly the decompiled code shows use of __strcpy__ suggests a buffer overflow being used here. This means that i can buffer overflow `local_64` with an input larger than 64 bytes which might affect the target variable `local_24`. 

![](assets/posts/PWN/phoenix_stack_one_ncs/dc.png)

## Testing out a buffer overflow
When my input is larger than 64 bytes for example 100 letter 'A' it displays the following output:

![](assets/posts/PWN/phoenix_stack_one_ncs/poc1.png)

This meant that the overflowing input from `local_64` affects the value of `local_24`. Hence i altered my payload to contain the specified value after the 64th byte.

```
import sys
changeme = b"A"* 64 # exact size of target variable
changeme += b"\x62\x59\x6c\x49" # payload address here
sys.stdout.buffer.write(changeme)
```
This gave me the following output:


![](assets/posts/PWN/phoenix_stack_one_ncs/flag.png)






