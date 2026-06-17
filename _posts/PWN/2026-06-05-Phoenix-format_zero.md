---
title: Phoenix - format_zero
date: 2026-06-05 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix format_zero challenge
toc: true
---

## Introduction
I will be explaining how i did the challenge format_zero from the series Phoenix found at <https://exploit.education/phoenix/format-zero/>


## Step one
Firstly, i inspect the source code, this time i will be exploiting __sprintf__:

```

/*
 * phoenix/format-zero, by https://exploit.education
 *
 * Can you change the "changeme" variable?
 *
 * 0 bottles of beer on the wall, 0 bottles of beer! You take one down, and
 * pass it around, 4294967295 bottles of beer on the wall!
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
    char dest[32];
    volatile int changeme;
  } locals;
  char buffer[16];

  printf("%s\n", BANNER);

  if (fgets(buffer, sizeof(buffer) - 1, stdin) == NULL) {
    errx(1, "Unable to get buffer");
  }
  buffer[15] = 0;

  locals.changeme = 0;

  sprintf(locals.dest, buffer);

  if (locals.changeme != 0) {
    puts("Well done, the 'changeme' variable has been changed!");
  } else {
    puts(
        "Uh oh, 'changeme' has not yet been changed. Would you like to try "
        "again?");
  }

  exit(0);
}

```

The function i want to target will be __sprintf__ which takes the input and allocates it inside a buffer.

## Step two 
As __sprintf__ is used, my approach is to overflow `buffer` which will affect the value of `changeme`. To do this, provide `%100x` which causes 100 hex characters to be taken as input. This will cause `buffer`` to" overflow causing `changeme` to be altered. 

![](assets/posts/PWN/phoenix_stack_zero/flag.png)


