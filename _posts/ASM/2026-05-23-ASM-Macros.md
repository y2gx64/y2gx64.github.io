---
title: ASM - macros
date: 2026-05-23 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## Macros 
A macro is a sequence of instructions, assigned by a name and could be used anywhere in the program. The syntax to define it is:

```
%macro [macro_name]  [number_of_params]

%endmacro

```
This is useful when there is a need to run the same set of instructions multiple times such as a write system call for example 
 

### Example

```
%macro write 2
  mov rax, 1
  mov rdi, 1
  mov rsi, %1
  mov rdx, %2
$endmacro

```
%1 represents the first parameter needed while %2 represents the second. 

## Macro vs procedure
So which one should one use? Macros actually duplicate code to the site which may affect code maintainability.This will be troublesome down the line when trying the maintain the code. Procedures are better in this case due to it not duplicating the code.

