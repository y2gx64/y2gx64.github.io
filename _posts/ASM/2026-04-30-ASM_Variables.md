---
title: ASM - Variables
date: 2026-04-30 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## Introduction

The assembly programming language allows to the reserving of bytes for variables. Do take note of how the values are stored first:


1. Each byte of character is stored as its ASCII value in hexadecimal.
2. Each decimal value is automatically converted to its 16-bit binary equivalent and stored as a hexadecimal number.
3. Negative numbers are converted to its 2's complement representation.
4. Short and long floating-point numbers are represented using 32 or 64 bits, respectively.
5. Processor uses the little-endian byte ordering.

This is done via the following syntax:
```
[variable-name]    define-directive    initial-value   
```

## x86 - define-directives
There are 5 main define-directives for x86

### DB - define byte

Allocates 1 byte or X bytes depending on the value:

```
hello db `hello` ;defines 5 bytes as 1 byte PER character
abyte db `1`;defines 1 byte as it is interpreted as a character
```

### DW - define word
Allocates 2 bytes:

```
number dw `12345`
abmsg dw `ab`
```
How does `12345` fit into 2 bytes AKA 16 bits? Well as DW is used, it is interpreted as an integer. This means the hexadecimal value of `12345` which is `3039` is actually stored in the register. As `3039` only takes up 4 bits, this means it can fit in the provided 16 bits.

### DD - define double word
Allocates 4 bytes:

```
abcdmsg dd `abcd`
```

### DQ - define quad word
Allocates 8 bytes:

```
abcdefghmsg dq `abcdefgh`
```

### DT - define ten bytes
Allocates 10 bytes

```
abcdefghijklmsg dt `abcdefghijklmsg`
```
## x64 - additional define-directives

### D0 
Allocates 16 bytes

```
abcdx4_msg do "abcdabcdabcdabcd"
```
### DY 
Allocates 32 bytes

```
abcd_x8 dy "abcdabcdabcdabcdabcdabcdabcdabcd"
```
### DZ 
Allocates 64 bytes


## Reserving bytes
This is usually used for uninitialised variables, such as:

```
section .bss 
lateruse resb ;reserve 1 byte
```

The syntax for reserving bytes in x86 is Similar to allocating bytes:

1. RESB - reserve 1 byte
2. RESW - reserve 2 bytes
3. RESD - reserve 4 bytes
4. RESQ - reserve 8 bytes
5. REST - reserve 10 bytes

While for x64:

1. RESO - reserve 16 bytes
2. RESY - reserve 32 bytes
3. RESZ - reserve 64 bytes

## References
<https://www.tutorialspoint.com/assembly_programming/assembly_variables.htm>
<https://github.com/0xAX/asm/blob/master/content/asm_2.md>
