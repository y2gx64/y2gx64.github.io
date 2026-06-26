---
title: Phoenix - stack_four, NCS
date: 2026-06-26 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix stack_four challenge
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_four from the series Phoenix found at <https://exploit.education/phoenix/stack-four/> but without referencing the source code this time. 


## Disassembling it
Firstly, i loaded the binary `stack-four.elf` using Ghidra, followed by jumping to the starting function and selecting graph view.

![](assets/posts/PWN/phoenix_stack_four_ncs/fg.png)


The function __main__ calls the function __start_level__ which is shown below. 

![](assets/posts/PWN/phoenix_stack_four_ncs/fg2.png)

As the function __gets__ is used in __start_level__ , i assume that a buffer overflow is used here in which i will need to buffer overflow `local_50` and get it return to the function __complete_level__ as shown below, similar to the previous challenge. 

![](assets/posts/PWN/phoenix_stack_four_ncs/fg3.png)

## Testing out my payload
When testing out the payload shown below, i could not alter the function pointer to contain the value of my input. 
```
import sys
changeme = b"A"*72
changeme += b"bbbbcccceeeedddd"
sys.stdout.buffer.write(changeme)
```
However, i did realise that ESP value changed to `0x65656565` as shown below.

![](assets/posts/PWN/phoenix_stack_four_ncs/stack1.png)

## Finalising my payload

When `0x65656565` is converted to text, it is `eeee` which is byte 80 in my payload. Hence, i placed the memory address of the function __complete_level__ at byte 80 as shown below:

```
import sys
changeme = b"A"*72 #larger than size
changeme += b"bbbbcccc" # filler 8 bytes
changeme += b"\xad\x61\x55\x56" # address
sys.stdout.buffer.write(changeme)
```

This means that i could load __complete_level__ function address into ESP, causing the execution flow to go to __complete_level__ when __ret__ is called as shown below.

![](assets/posts/PWN/phoenix_stack_four_ncs/flag.png)



