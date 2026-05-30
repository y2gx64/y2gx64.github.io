---
title: ASM - Adressing modes
date: 2026-04-28 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---


## Addressing modes
In assembly, most operations require operands (values) to be processed. An address provides the location where this value is located. There are many ways of doing so, here are some of them:

1. Register addressing
2. Immediate addressing
3. Memory addressing

## Register addressing
In this mode, a register contains the operand. The first operand is the destination with the second being the source. 
This is the fastest mode of addressing. For example:

```
MOV DX, TAX_RATE   ; Register in first operand
MOV COUNT, CX	   ; Register in second operand
MOV EAX, EBX	   ; Both the operands are in registers
```
This moves the operand in register `RBX` to `RAX`

## Immediate addressing
In this mode, the operand is an immediate constant. For example:

```
MOV RAX,1
```
## Memory addressing
### Direct memory addressing
In direct memory addressing, one of the operands refers to a memory location and the other operand references a register.This takes slightly longer destination to get the `text` segment address and the offset value where the operand is stored. For example:

```
hellomsg db 'hello\n'
MOV RSI, hellomsg
```

### Direct-offset addressing
This addressing mode uses the arithmetic operators to get a portion of an operand. For example:
```
BYTE_TABLE DB  14, 15, 22, 45      ; Tables of bytes
WORD_TABLE DW  134, 345, 564, 123  ; Tables of words

MOV CL, BYTE_TABLE[2]	; Gets the 3rd element of the BYTE_TABLE
MOV CL, BYTE_TABLE + 2	; Gets the 3rd element of the BYTE_TABLE
MOV CX, WORD_TABLE[3]	; Gets the 4th element of the WORD_TABLE
MOV CX, WORD_TABLE + 3	; Gets the 4th element of the WORD_TABLE
```

### Indirect Memory Addressing
Indirect addressing is generally used for operands containing several elements such as arrays. For example, if the starting address of the operand is stored in register `EBX`


```
MY_TABLE TIMES 10 DW 0  ; Allocates 10 words (2 bytes) each initialized to 0
MOV EBX, [MY_TABLE]     ; Effective Address of MY_TABLE in EBX
MOV [EBX], 110          ; MY_TABLE[0] = 110
ADD EBX, 2              ; EBX = EBX +2
MOV [EBX], 123          ; MY_TABLE[1] = 123
```
## Type specifiers
When moving the operand, you may want to specify the number of bytes you want to move from it. The table below states the commonly
used type specifiers:

1. BYTE - 1 byte
2. WORD - 2 bytes
3. DWORD - 4 bytes
4. QWORD - 8 bytes
5. TBYTES - 10 bytes

## References
<https://www.tutorialspoint.com/assembly_programming/assembly_addressing_modes.htm>

