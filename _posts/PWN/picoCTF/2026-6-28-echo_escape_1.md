---
title: picoCTF - echo escape 1
date: 2026-6-28 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: picoCTF echo escape 1 challenge walkthrough 
toc: true
---
## Introduction
Today i will be explaining how i solved echo escape 1 from picoCTF <https://learn.cylabacademy.org/library?page=1&category=6>


## checksec
The image shown below is the result from running `checksec` on the provided binary. 

![](assets/posts/PWN/picoCTF/echo_escape_1/checksec.png)
 
## Inpsecting the source code
Upon inspecting the source code, i noticed that `buf` had a size of 32 bytes yet the function __read__ had a limit of 128 bytes. This means a buffer overflow is definitely possible.

![](assets/posts/PWN/picoCTF/echo_escape_1/sc1.png)

## Fuzzing
I entered a random long string of input via the `cyclic` function in pwntools to get a segmentation fault as shown via my current payload below: 

```
from pwn import *

payload = cyclic(128)

sys.stdout.buffer.write(payload)
```


Upon running this in gdb, the following was shown:

![](assets/posts/PWN/picoCTF/echo_escape_1/hint1.png)


This means that my input successfully buffer overflowed onto the stack causing the program to return to an invalid address. This means that i can insert the address of the __win__ function onto the stack and trick the program into executing it via __ret__. 

## Completing the challenge
Firstly, determine how many junk bytes was used. This can be found via running `cyclic -l <payload>` as shown below (only works when using cyclic payload). The value used here will be the topmost value on the stack as this is where i will be swapping it for __win__ function address later on.

![](assets/posts/PWN/picoCTF/echo_escape_1/hint3.png)

![](assets/posts/PWN/picoCTF/echo_escape_1/hint2.png)

Secondly, retrieve the __win__ function address as shown below.

![](assets/posts/PWN/picoCTF/echo_escape_1/hint4.png)


Thirdly, i adjusted my input as shown below. My junk bytes will end at byte 40 with the bytes onward containing __win__ function address as shown below. 

```
from pwn import *

payload = cyclic(40)
payload += p64(0x0000000000401256)

sys.stdout.buffer.write(payload)
```

When testing it out locally it gave me the following output as shown below. 

![](assets/posts/PWN/picoCTF/echo_escape_1/hint5.png)


Now to test it on the actual challenge as shown below with the following finalised script. 

![](assets/posts/PWN/picoCTF/echo_escape_1/flag.png)




