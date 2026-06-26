---
title: Protostar - stack_two, NCS
date: 2026-06-26 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix stack_two ctf but no source code
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_two from the series Phoenix found at <https://exploit.education/phoenix/stack-two/> but without referencing the source code this time. 

## Disassembling it
Firstly, i loaded the binary `stack-two.elf` using Ghidra, followed by jumping to the starting function and selecting graph view. 

![](assets/posts/PWN/phoenix_stack_two_ncs/fg.png)

Based on the string `please set the ExploitEducation environment variable` , i can tell that the environment variable `ExploitEducation` must be set to a certain value. 

![](assets/posts/PWN/phoenix_stack_two_ncs/hint1.png)

Secondly, based on the disassembly, i can tell that this certain value is `0xd0a090a`. 

![](assets/posts/PWN/phoenix_stack_two_ncs/hint2.png)

Thirdly, the function __strcpy__ is used which suggests a buffer overflow may be used which suggests that a variable might be copying the value of environment variable `ExploitEducation` and as __strcpy__ is unsafe, this may overflow and affect the target variable, similar to other challenges. 


## Setting the environment variable
Run the following command to set the environment variable `ExploitEducation` to the correct value:

```
export ExploitEducation=$(python3 -c 'print( "A" * 64 + b"\x0a\x09\x0a\xd0")')
```
Run `stack_two.elf` afterwards:

![](assets/posts/PWN/phoenix_stack_two_ncs/flag.png)


