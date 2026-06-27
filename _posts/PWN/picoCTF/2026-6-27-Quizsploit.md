---
title: picoCTF - Quizsploit
date: 2026-06-27 00:00:00 +0800
categories: [PWN]
tags:      # TAG names should always be lowercase
description: Quizsploit walkthrough
toc: true
---

## Introduction
Today i will be explaining how i solved Quizsploit from picoCTF <https://learn.cylabacademy.org/library/727?page=1&category=6>

## Q1 

To solve this, use the command `pwn checksec <filename>` as shown below:

![](assets/posts/PWN/picoCTF/quizsploit/q1sol.png)

Which gives the following answer: 

![](assets/posts/PWN/picoCTF/quizsploit/q1ans.png)

## Q2 
To solve this, use the command `file <filename>` as shown below:

![](assets/posts/PWN/picoCTF/quizsploit/q2sol.png)

Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q2ans.png)

## Q3
To solve this, use the command `file <filename>` as shown below:

![](assets/posts/PWN/picoCTF/quizsploit/q2sol.png)

Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q3ans.png)



## Q4 
When viewing the decompiled code in Ghidra, i can see that it is `0x15` bytes in size as shown below.

![](assets/posts/PWN/picoCTF/quizsploit/q4sol.png)

Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q4ans.png)

## Q5 
When viewing the decompiled code in Ghidra, i can see that `0x90` bytes are read into the buffer as shown below.

![](assets/posts/PWN/picoCTF/quizsploit/q4sol.png)

Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q5ans.png)


## Q6

When comparing the number of bytes read from __fgets__, it is significantly larger than the variable hence a buffer overflow is possible.
![](assets/posts/PWN/picoCTF/quizsploit/q4sol.png)


It gives me the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q6ans.png)


## Q7 

The standard C function for this binary is __fgets__ as shown below. 

![](assets/posts/PWN/picoCTF/quizsploit/q4sol.png)


Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q7ans.png)


## Q8 
When inspecting the binary in Ghidra, i can see that the function __win__ as shown below is not called in __main__ and __vuln__

![](assets/posts/PWN/picoCTF/quizsploit/q8sol.png)


Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q8ans.png)


## Q9 

Due to __fgets__ reading more bytes than the size of the variable, this is prone to a buffer overflow. Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q9ans.png)

## Q10 
Subtract `0x15` from `0x90` which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q10ans.png)

## Q11
To solve this, use the command `pwn checksec <filename>` as shown below:

![](assets/posts/PWN/picoCTF/quizsploit/q1sol.png)

Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q11ans.png)

## Q12
As NX is only partially enabled, overwriting a global address function is still possible which makes it prone to ROP. 

![](assets/posts/PWN/picoCTF/quizsploit/q1sol.png)

Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q12ans.png)

## Q13 
Load the program in gdb and run the command `disassemble win` to get the address of its first instruction. 

![](assets/posts/PWN/picoCTF/quizsploit/q13sol.png)

Which gives the following answer:

![](assets/posts/PWN/picoCTF/quizsploit/q13ans.png)

