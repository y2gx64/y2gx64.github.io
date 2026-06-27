---
title: Phoenix - format_zero, NCS
date: 2026-06-27 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix format_zero ctf but no source code
toc: true
---


## Introduction
I will be explaining how i did the challenge format_zero from the series Phoenix found at <https://exploit.education/phoenix/format_zero/> but without referencing the source code this time. 

## Disassembling it
Firstly, i loaded the binary `format_zero.elf` using Ghidra, followed by jumping to the starting function and selecting graph view. 

![](assets/posts/PWN/phoenix_format_zero_ncs/fg1.png)


Based on the graph view, i can infer that i need to alter a variable's value to be not zero. Upon viewing the decompiled view, i found out that this variable is `local_14` as shown below. 

![](assets/posts/PWN/phoenix_format_zero_ncs/dc1.png)

I also found out that __sprintf__ was used without any format specifiers as shown below. This means that i can potentially retrieve values from the stack and even write values to a memory address. 

![](assets/posts/PWN/phoenix_format_zero_ncs/dc2.png)

## Testing out my payload
My plan now is to firstly provide an input larger than 32 bytes which may cause a buffer overflow resulting in `local_14` value to change. However, when trying the below payload, it does not achieve a buifer overflow. 

```
import sys
changeme = b"A" * 40
#changeme = b"%33x"
sys.stdout.buffer.write(changeme)

```

## WHy it does not buffer overflow 
To figure out why a buffer overflow did not happen, i must look at the code before __sprintf__, to be more specific, the function __fgets__ as shown below. 

![](assets/posts/PWN/phoenix_format_zero_ncs/exp1.png)

__fgets__ essentially stores the input of a specified length into the variable `local_44`while limiting the length of the input to 32 bytes. This prevents a buffer overflow using characters such as the letter A, B and C. Afterwards , the value of `local_44` will be copied into `local_34` as shown below.

![](assets/posts/PWN/phoenix_format_zero_ncs/exp2.png)

## How to make it buffer overflow 
As __sprintf__ is used without any format specifiers as shown below making it unsafe,  this means that an format specifier of `%33x` as input is will make it buffer overflow as shown below. 

![](assets/posts/PWN/phoenix_format_zero_ncs/exp3.png)

The function __fgets__ "checks" the length of `%33x` which is 4 characters, as it is less than 32 characters, it is stored into `local_44` with it being used as a parameter in __sprintf__. However, while __fgets__ interprets as just 4 characters, __sprintf__ interprets it as "retrieve the next 33 hexidecimal characters from the stack" As 33 is more than 32, this will cause a buffer overflow for `local_34` leading to the target variable `local_14` value being altered. 

