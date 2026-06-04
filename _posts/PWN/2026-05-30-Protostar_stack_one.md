---
title: Protostar - stack_one
date: 2026-05-30 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Protostar stack_one ctf
toc: true
---

## introduction
I will be explaining how i did the challenge stack_one from the series Protostar found at <https://exploit.education/phoenix/stack-one/>

## Step one
Before debugging it, i inspected the source code provided on their website and found that it was using `volatile`, `int` and `strcpy`. 

```
/*
 * phoenix/stack-one, by https://exploit.education
 *
 * The aim is to change the contents of the changeme variable to 0x496c5962
 *
 * Did you hear about the kid napping at the local school?
 * It's okay, they woke up.
 *
 */

#include <err.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define BANNER \
  "Welcome to " LEVELNAME ", brought to you by https://exploit.education"

int main(int argc, char **argv) {
  struct {
    char buffer[64];
    volatile int changeme;
  } locals;

  printf("%s\n", BANNER);

  if (argc < 2) {
    errx(1, "specify an argument, to be copied into the \"buffer\"");
  }

  locals.changeme = 0;
  strcpy(locals.buffer, argv[1]);

  if (locals.changeme == 0x496c5962) {
    puts("Well done, you have successfully set changeme to the correct value");
  } else {
    printf("Getting closer! changeme is currently 0x%08x, we want 0x496c5962\n",
        locals.changeme);
  }

  exit(0);
}
```

This suggests that the target, changeme is located right after the variable buffer. Secondly, the use of `strcpy` and not `strncpy` suggests that a buffer overflow attack is possible. 

Hence, my plan is to overflow from the variable buffer with the overflowed value being `\x62\x59\x6c\x49\`. 

## Step two
To test if this is possible i ran the program with the following argument:

![](assets/posts/PWN/phoenix_stack_one/overfow_test1.png)

This showed that a buffer overflow attack is definitely possible. Hence, i proceeded to ran it with the following argument:

![](assets/posts/PWN/phoenix_stack_one/flag.png)



