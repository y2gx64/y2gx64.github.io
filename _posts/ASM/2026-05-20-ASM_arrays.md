---
title: ASM - arrays
date: 2026-05-20 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## What is an array?
An array is a structure that stores a collection of items.

## Defining an array
An example will be:

```
NUMBERS	DW  1,  2,  3,  4,  5, 6
```

This defines the array NUMBERS consisting of the values 1,2,3,4,5,6. Each one of the values takes up 2 bytes due to `DW`. To retrieve the 2nd value use `[NUMBERS+2]`. Another example being:

```
NUMBER2 TIMES 8 DW 1
```

This define the array NUMBER2 with 8 `1`s with each taking up 2 bytes.


![](assets/posts/ASM/arrays/arrays_1.png)
## Stack overflow/underflow

### underflow 
pop too many times

```
section .data
  msg db "hello"

section .text
  global _start

_start:
mov rax, 1
push rax
mov rcx, 100000
JMP NUKE

NUKE:
pop rax
DEC rcx
JNZ NUKE

END:
mov rax, 60
syscall 
ret

```
This leads to a segmentation fault

### overflow
```

section .data
  msg db "hello"

section .text
  global _start

_start:
mov rax, 1
push rax
mov rcx, 0xffffffff
JMP NUKE

NUKE:
push rax
DEC rcx
JNZ NUKE

END:
mov rax, 60
syscall 
ret
```

## References
<https://www.tutorialspoint.com/assembly_programming/assembly_arrays.htm>
