---
title: ASM - Constants
date: 2026-04-30 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---


## Introduction
Constants are similar to variables, this post will cover the various way to define a constant. 

## EQU
This is the same as `X = Y` in Python. The syntax for it in assembly:

```
CONSTANT_NAME EQU expression
```

For example:

```
BNUY EQU 621
```
### Example

```
section .data
  VAR_X EQU 5 ;beware of non-scalar
  VAR_Y EQU 10
  RESULT_Z EQU VAR_X * VAR_Y

section .text
  global  _start
_start:
  mov rax, RESULT_Z
  mov rax, 60
  syscall
```
When trying to view `RESULT_Z` 's value in gdb, i set a breakpoint at line 10 so i can view the register `RAX` which contains RESULT_Z.

![](assets/posts/ASM/constants/EQU.png)


When running the command `info  variables`, none showed up as seen below:

![](assets/posts/ASM/constants/EQU3.png)


This is due to these labels/variables not being initialised in memory. However, `p/d &[label]` can be used instead:

![](assets/posts/ASM/constants/EQU4.png)



## %assign
This is similar to the `EQU` directive, but you can redefine the constant later on in the code. The syntax for it will be:

```
%assign BNUY 621
```

### Example

```
section .data
  %assign BNUY 621

section .text
  global  _start
_start:
  mov rax, BNUY
  %assign BNUY 620  ;bp1
  mov rax, BNUY
  mov rax, 60 ;bp2
  syscall
```
At the first breakpoint RAX has a value of `621` which proves that `BNUY` had a value of `621`:

![](assets/posts/ASM/constants/assign2.png)

At the second breakpoint, RAX has a value of `620` as BNUY value changed to 620 earlier on.
![](assets/posts/ASM/constants/assign3.png)

This means that the value of `BNUY` changed to `620`

## define
This allows for both numeric and string constants. This is similar to the `#define` in c. Similarly to `%assign` you can redefine the constant later.

### Example 
```
section .data
  NUM_1 db "123456"
  STR_1 db "bnuy"
section .text
  global  _start
_start:
  %define TMP STR_1 
  mov rax, TMP
  %define TMP NUM_1
  mov rax, TMP
  mov rax, 60
  syscall
```

At the first breakpoint, the value of the register `RAX` is `4202502`:

![](assets/posts/ASM/constants/define.png)


This is an address, to get the constant from this address we will use the following command:

```
x/s [memory_address]
```

This gives the value `bnuy`.

![](assets/posts/ASM/constants/define2.png)


## References:

<https://www.tutorialspoint.com/assembly_programming/assembly_constants.htm>
<https://github.com/0xAX/asm/blob/master/content/asm_2.md>
