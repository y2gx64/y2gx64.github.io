---
title: ASM - Memory Segments
date: 2026-04-25 00:00:00 +0800
categories: [ASM]
tags: [non technical]     # TAG names should always be lowercase
description: ASM
toc: true
---

## Segments
The syntax 'segments' can be used instead of 'sections' as they both refer to the same thing.
```
segment .bss   ;allocate memory for variables that are yet to be initialised

segment .data  ;define variables and initialise them


segment .text
  global _start ;this tells the kernel to run from _start

_start:
mov rax, 60
syscall

```


is essentially the same as:

```
section .bss   ;allocate memory for variables that are yet to be initialised

section .data  ;define variables and initialise them


section .text
  global _start ;this tells the kernel to run from _start

_start:
mov rax, 60
syscall
```

## References
<https://www.tutorialspoint.com/assembly_programming/assembly_memory_segments.htm>
