---
title: Protostar - stack_zero, NCS
date: 2026-06-25 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenixstack_zero ctf but no source code
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_zero from the series Phoenix found at <https://exploit.education/phoenix/stack-zero/> but without referencing the source code this time. 


## Disassembling the  source code 
Firstly, i loaded the binary `stack-zero.elf` using Ghidra, followed by jumping to the starting function and selecting graph view. 

![](assets/posts/PWN/phoenix_stack_zero_ncs/fg.png)



This shows that a comparison statement was made to determine if a variable has a value different than zero. The decompiler view also shows that the function __gets__ which is prone to a buffer overflow.

![](assets/posts/PWN/phoenix_stack_zero_ncs/dc.png)


## Testing out a buffer overflow. 
To test if a buffer overflow works, i provided an input larger than 64 bytes which completed this challenge as seen below. 

![](assets/posts/PWN/phoenix_stack_zero_ncs/flag.png)

When a value larger than 64 bytes is loaded into `local_54` via ___gets__, this causes it overflow into `changeme` thus changing its value. 





