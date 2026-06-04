---
title: Protostar - stack_four
date: 2026-05-30 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Protostar stack_four ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_four from the series Protostar found at <https://exploit.education/phoenix/stack-four/>

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
This seems to be the same as before?

## Step two
I will be setting a breakpoint at start_level to allow myself to retrieve the address of complete_level.

![](assets/posts/PWN/phoenix_stack_four/flagaddress.png)

I will be using the following command to set the payload:

```
python3 -c 'import sys; sys.stdout.buffer.write(b"A" * 64 + b"\xad\x61\x55\x56")' > stack_four_payload
```
![](assets/posts/PWN/phoenix_stack_four/nowork.png)


And it does not work, seems that something else should be done instead. When looking at the disassembled function, i noticed the following:

![](assets/posts/PWN/phoenix_stack_four/hint1.png)

My plan is to now alter the stack right before return is called. So i set a breakpoint at start_level, followed with a breakpoint at ret.

![](assets/posts/PWN/phoenix_stack_four/break1.png)

Afterwards, i set the saved eip register value to the start of complete_level.

![](assets/posts/PWN/phoenix_stack_four/set.png)

It works.

![](assets/posts/PWN/phoenix_stack_four/set2.png)



