---
title: ASM - Basic syntax
date: 2026-04-25 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---


## Sections
An assembly program has 3 main sections. These 3 sections being the data, bss and text section.


### data
The data section is used to declare initialised variables with a constant value which does not change even during runtime. This is a bit similar to declaring variables in Python, except that it may change during runtime. 

The syntax for this will be:


```
section.data
```

### bss
The bss section is used to declare uninitialised variables.

The syntax for this will be:

```
section.bss
```

### text
The text section is used to store the actual code. This section must begin with a declaration of `global_start` to tell the kernel where the program execution begins.

The syntax for this will be:

```
section .text
   global _start
_start
```

## Comments
Just like any other programming language, you can leave comments in assembly too. The syntax for this will be:

```
;comment here
```

## Syntax of Assembly Language Statements
Assembly language statements are entered one statement per line with them following this format:

`[label]   mnemonic   [operands]   [;comment]`

Usually, it only contains the mnemonic and operand such as this instruction:

`MOV EAX, SAMPLE`

## Compiling it
As i am running this on Linux, the command to assemble this program with the name sample_program will be:

x86:

To create the object file:

`nasm -f elf32 -o sample_program.o sample_program.asm`

To link the object file to create an executable:

`ld -m elf_i386 -s -o sample_program sample_program.o`

x64:

To create the object file:
`nasm -f elf64 -g -F dwarf -o sample_program.o sample_program.asm`

To link the object file to create an executable:

`ld -o example example.o`

## Refereces:
<https://www.tutorialspoint.com/assembly_programming/assembly_environment_setup.htm>
<https://www.tutorialspoint.com/assembly_programming/assembly_basic_syntax.htm>
