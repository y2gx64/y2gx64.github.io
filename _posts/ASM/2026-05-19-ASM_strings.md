---
title: ASM - strings
date: 2026-05-19 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## String instruction
Each string instruction may require a source operand, a destination operand or both. For 32-bit segments, string instructions use ESI and EDI registers to point to the source and destination operands, respectively. Each of one of the following instructions have 4 variants. For example, MOVS:
1. MOVSB - move 1 byte as indicated by 'B'
2. MOVSW - move 2 bytes as indicated by 'W'
3. MOVSD - move 4 bytes as indicated by 'D'
4. MOVSQ - move 8 bytes as indicated by 'Q'

## CLD + STD
CLD clears the directional flag which causes the operation to be left to right while STD sets the directional flag. 

## REP
REP stands for repeat. The number of times to repeat is determined by the RCX register. 

### REPE / REPZ
It is conditional repeat. It repeats the operation while the zero flag indicates equal/zero. It stops when the ZF indicates not equal/zero or when CX is zero.

### REPNE or REPNZ
It is also conditional repeat. It repeats the operation while the zero flag indicates not equal/zero. It stops when the ZF indicates equal/zero or when CX is decremented to zero.


## MOVS
This instruction moves 1 Byte, Word or Doubleword of data from memory location to another. RSI is used to store the source with RDI to store the destination.

### Example

```
section .data
  src1 db "a" ;each letter takes up 1 byte
  src2 dw "ab"
  src3 dd "abcd"
  src4 dq "abcdefghij"
section .bss
  dest1 resb 1
  dest2 resw 1
  dest3 resd 1
  dest4 resq 1

section .text
  global _start

_start:
  lea rsi, [src1]
  lea rdi, [dest1]
  movsb 
  
  lea rsi, [src2] ;b1 dest1 = a
  lea rdi, [dest2]
  movsw 

  lea rsi, [src3] ;bp2: dest2 = ab
  lea rdi, [dest3]
  movsd 

  lea rsi, [src4] ;bp3: dest3 = "abcd"
  lea rdi, [dest4]
  movsq 

  mov rax, 60 ;bp4: dest4 = abcdefghij
  syscall  
```
At the first breakpoint, as 1 byte from `src1` is moved from `src1` to `dest1`, this causes `dest1` to have the value `a`.

![](assets/posts/ASM/strings/movs_1.png)

At the second breakpoint, as 2 bytes from `src2` is moved from `src2` to `dest2`, this causes `dest2` to have the value `ab`.

![](assets/posts/ASM/strings/movs_2.png)

At the second breakpoint, as 2 bytes from `src3` is moved from `src3` to `dest3`, this causes `dest3` to have the value `abcd`.

![](assets/posts/ASM/strings/movs_3.png)

At the second breakpoint, as 2 bytes from `src2` is moved from `src2` to `dest4`, this causes `dest4` to have the value `abcdefgh`.

![](assets/posts/ASM/strings/movs_4.png)

## LODS
This instructions moves a byte from the memory loaded via `lea rsi` to the destination which is usually RAX. 

### Example

```
section .data 
  string db "abcdabceabcf"
  
section .bss
  msg resb 10
  
section .text
  global _start

_start:
  lea rsi, [string]
  lodsb 
  lodsw ;bp1: rax = a
  lodsd  ;bp2 rax = b
  lodsq  ;bp3 rax = d
  mov rax, 60 ;bp4 rax=e
  syscall

```
At the first breakpoint, the first byte from `string` is loaded into RAX. This byte is `a` hence RAX having the value `a`.

![](assets/posts/ASM/strings/lods_1.png)

At the second breakpoint, the second byte from `string` is loaded into RAX. This byte is `b` hence RAX having the value `b`.

![](assets/posts/ASM/strings/movs_2.png)

At the third breakpoint, the fourth byte from `string` is loaded into RAX. This byte is `c` hence RAX having the value `c`.

![](assets/posts/ASM/strings/movs_3.png)

At the fourth breakpoint, the eighth byte from `string` is loaded into RAX. This byte is `e` hence RAX having the value `e`.

![](assets/posts/ASM/strings/movs_4.png)

## STOS
This instruction stores data from register (AL, AX, or EAX) to memory.

### Example

```
section .data
  msg db "idk"
section .bss
  newmsg resb 3
section .text
  global _start

_start:
  lea rdi, [newmsg]
  mov rax, "abc"
  stosb
  
  mov rax, 60 ;bp1
  syscall 


```

At the first breakpoint, newmsg has the value `a`. This is caused by `abc` being stored into RAX with 1 byte from RAX being stored into newmsg. 

![](assets/posts/ASM/strings/stos_1.png)

## CMPS
This instruction compares two data items in memory. Data could be of a byte size, word or doubleword. This is similar to cmp but just comparing more data. The source is loaded via `lea rsi` while the destination via `lea rdi`. 

###
```
section .data
  src1 db '1',0 ;each letter takes up 1 byte
  dest1 db '1', 0
  src2 dw '22', 0
  dest2 dw '22', 0
  src3 dd '333', 0
  dest3 dd '333', 0
  src4 dq '44444444', 0
  dest4 dq '44444444', 0

section .text
  global _start

_start:
  lea rsi, [src1]
  lea rdi, [dest1]
  cmpsb
  
  lea rsi, [src2] ;b1 ZF = 1
  lea rdi, [dest2]
  cmpsw

  lea rsi, [src3] ;bp2: ZF = 1
  lea rdi, [dest3]
  cmpsd

  lea rsi, [src4] ;bp3: ZF = 1  
  lea rdi, [dest4]
  cmpsq 

  mov rax, 60 ;bp4: ZF = 1
  syscall  
```



Before `cmpsb` is ran, i can see that the values in RSI and RDI are identical

![](assets/posts/ASM/strings/cmps_0.png)

At the first breakpoint, as the values in RSI and RDI are identical, ZF is set to `1`.

![](assets/posts/ASM/strings/cmps_1.png)

This happens for the remaining comparisons.


## SCAS
his instruction compares the contents of a register (AL, AX or EAX) with the contents of an item in memory.

### Example

```
section .data 
  string db "abcdef"
  msg db "work"
  msglen equ $ - msg

section .text
  global _start

_start:
  lea rdi, [string]
  mov rax, "d"
  mov rcx, 6  ;watch rcx
  repnz scasb
  jz WORK ;bp1: ZF = 1
  mov rax, 60
  syscall

WORK:
mov rax, 1
mov rdi, 1
mov rsi, msg
mov rdx, msglen
syscall
```
scasb is usually used with rep to find a character in a string. scasb means to search 1 byte. In this example, the purpose is to find the letter `d` as indicated by `mov rax, "d"`. `lea rdi [string]` indicates that `string` is the destination to search for the character `d`. `mov rcx, 6` indicates how many times to repeat the instruction `scasb`. 

![](assets/posts/ASM/strings/scas-1_1.png)

RCX is decremented while the search continues while RDI increases. RDI increases so as to update the location to check if the byte matches `d`.

![](assets/posts/ASM/strings/scas-1_2.png)

Eventually, when the character `d` is found, the zero flag is set to 1 due to repnz being used.

![](assets/posts/ASM/strings/scas-1_3.png)

