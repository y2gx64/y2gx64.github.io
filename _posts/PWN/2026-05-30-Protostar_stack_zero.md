---
title: Protostar - stack_zero
date: 2026-05-30 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Protostar stack_zero ctf
toc: true
---

## Introduction
I will be explaining how i did the challenge stack_zero from the series Protostar found at <https://exploit.education/phoenix/stack-zero/>

## Step 1
Firstly, i will load the binary in gdb to disassemble it. 

![](assets/posts/PWN/phoenix_stack_zero/maingdb1.png)

i have also loaded this in IDA to view its execution flow.

![](assets/posts/PWN/phoenix_stack_zero/mainida1.png)

This shows that at 0x000011e7, a comparison was made to check if X was equal to zero. This was inferenced based on the presence of the TEST instruction.

![](assets/posts/PWN/phoenix_stack_zero/keyjmp.png)

As the goal of this challenge is to change variable X's value, i will manually change it right before the mov instruction executes.

## Step two
I will set a breakpoint at main to allow the function to be loaded into memory.

![](assets/posts/PWN/phoenix_stack_zero/b_main.png)

Afterwards, i will set a breakpoint at the mov instruction. This is to allow me to modify variable X before it is loaded into EAX. 


![](assets/posts/PWN/phoenix_stack_zero/b_mov.png)

I will now modify the value of variable X.

![](assets/posts/PWN/phoenix_stack_zero/x_aftervalue.png)

This results in the challenge being successfully completed.

![](assets/posts/PWN/phoenix_stack_zero/flag.png)



