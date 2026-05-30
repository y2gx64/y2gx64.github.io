---
title: ASM - gdb debugging
date: 2026-04-29 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## Introduction
This is a short guide to learning how to use gdb to debug your assembly program. I'll update this when i find new stuff.

## Compiling and linking your assembly program
Firstly, run this command to create the object file:

`nasm -f elf64 -g -F dwarf -o [file_name].o [file_name].asm`

Now link it with this command:

`ld -o [file_name] [file_name].o`

## Start debugging with gdb: gdb
To start debugging with `gdb`:

```
gdb [file_name]
```

![](assets/posts/ASM/gdb/gdb.png)


## Note
Use a null terminator for each variable if not commands like 'x' will display both the input variable and the rest till it caps out.


I will show some of the commonly used commands:

## Displaying assembly code: list [filename]
To view the first 10 lines of the source code of the assembly program, run the following command:

```
list
```

![](assets/posts/ASM/post6/list.png)

To view the next 10 lines, run it again as shown above.

## Display all variables: info variables
Run the following command:

```
info variables
```

![](assets/posts/ASM/gdb/info_all-variables.png)

This displays the current variables and their memory addresses. This is useful for the next command

## Display variable/memory address data: x
Use the following commands to display a variable's data:

```
x [variable_name|memory_address]
```

![](assets/posts/ASM/gdb/x.png)



## Breakpoints
Breakpoints are very important when debugging, they allow you to 'pause' your code. 

### Setting a breakpoint: b
To set a breakpoint run the following command:

```
b [line_number]
```

![](assets/posts/ASM/gdb/b.png)

### Viewing breakpoints: info b
To view all currently set breakpoints, run the following command:

```
info b 
```

![](assets/posts/ASM/gdb/info_b.png)

### Deleting breakpoints: del breakpoint [breakpoint_number]
To delete a breakpoint, run the following command:

```
del breakpoint [breakpoint_number]
```

![](assets/posts/ASM/gdb/del_breakpoint_b.png)

## Viewing all-register data: info all-registers
The program must have executed at least one line of instructions. Run the following command to display the values in all of the registers:

```
info all-registers
```

![](assets/posts/ASM/gdb/info_all-registers.png)

## Viewing a specific register's data: p/d [register]
Run the following command:

```
p/d $[register]
```

![](assets/posts/ASM/gdb/print_register.png)

## Viewing all sections: maint info sections
Run the following command:

```
maint info sections
```

![](assets/posts/ASM/gdb/maint_info_sections.png)


