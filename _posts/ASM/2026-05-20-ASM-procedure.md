---
title: ASM - procedures
date: 2026-05-20 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## What is a proecudure
A procedure or subroutine is a section of code in the assembly program. Think of it as the equivalent to a function. The syntax to define a procedure being:

```
procedure_name:
(code goes here)
ret
```
A return is needed so that the code will return back to where is was originally executing at. 

### Example
```
section .data
  msg db "hello"
  msglen equ $-msg

section .text
  global _start 

_start:
  call output
  mov rax, 60
  syscall 
  
output:
  mov rax, 1
  mov rdi, 1
  mov rsi, msg
  mov rdx, msglen
  syscall
  ret
```

The procedure `output` shown here does a syscall to print out the message hello. Afterwards, it returns back to `mov rax, 60` and exits. 
