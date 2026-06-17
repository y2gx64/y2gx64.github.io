---
title: Phoenix - format_two 
date: 2026-06-06 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix format_two ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge format_two from the series Phoenix found at <https://exploit.education/phoenix/format-two/>

## Step one
Firstly, i inspect the source code, this time i will be exploiting the function __printf__:

```
/*
 * phoenix/format-two, by https://exploit.education
 *
 * Can you change the "changeme" variable?
 *
 * What kind of flower should never be put in a vase?
 * A cauliflower.
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
  char buf[256];

  printf("%s\n", BANNER);

  if (argc > 1) {
    memset(buf, 0, sizeof(buf));
    strncpy(buf, argv[1], sizeof(buf));
    bounce(buf);
  }

  if (changeme != 0) {
    puts("Well done, the 'changeme' variable has been changed correctly!");
  } else {
    puts("Better luck next time!\n");
  }

  exit(0);
}
```
## How the code works
`main` checks if an argument has been provided when running the binary. If one is provided, `bounce` is called which contains the vulnerable function __printf__. 

![](assets/posts/PWN/phoenix_stack_two/test.png)

## Step two
As the goal of this challenge is to alter the variable `changeme`, my approach is to use printf to write to the memory address where `changeme` is located. To do so, I will need to retrieve the address of `changeme`. I loaded the binary in gdb , set a breakpoint at main and used the command `info var` to get the memory address of `changeme`.

![](assets/posts/PWN/phoenix_stack_two/changme.png)

The address of `changme` is `0x56559024` which is `\x24\x90\x55\x56`.  Now i need to know where my input is stored on the stack. I will run gdb with arguments provided. In this case the argument is `AAAA`. I will set a breakpoint at __bounce__ right after __prinf__ was called. 

![](assets/posts/PWN/phoenix_stack_two/bp.png)

At the breakpoint, i can see that the value `AAAA` is at offset 12 from the stack. When the input `$'\x24\x90\x55\x56%x %x %x %x %x %x %x %x %x %x %x %n\n'` is provided, `\x24\x90\x55\x56` is stored on the stack and output to stdout (value on the left):

![](assets/posts/PWN/phoenix_stack_two/output1.png)

As the number of `%x` is 12, this causes __printf__ to look at the next value on the stack 12 times. This eventually reaches where my input is stored. Eventually it reaches my input and it will now proceed to treat it as a parameter due to the presence of `%x`. Afterwards, `%n` tells __printf__ to write into a target value which is this case is my input AKA `\x24\x90\x55\x56`. It will proceed to write into the memory address thus completing the challenge. 

![](assets/posts/PWN/phoenix_stack_two/flag.png)

But why `0x62` AKA `98`. This is actually the number of bytes so far. As the first 4 are the raw memory address, followed by 8 bytes per %x (additional 1 for the space) this continues on except for one value being `100` which makes it 4 bytes (3+1). This keeps going on till %n hence giving 98 bytes and thus changing the value of `changeme` to `0x62`.

In summary, i tricked __printf__ into writing to a memory address located on the stack. 
![](assets/posts/PWN/phoenix_stack_two/flag.png)


