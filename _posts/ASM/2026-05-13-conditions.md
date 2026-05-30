---
title: ASM - condition
date: 2026-05-13 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## Jumps
A jump is a instruction that transfers the control of the current address of an instruction to another address. There are two types of jumps, conditional and unconditional

## unconditional
The syntax for this is:

```
JMP [label]
```
### Example

```
segment .data
  hellomsg db `hello\n`
  lenhellomsg equ $-hellomsg
section .text
  global _start
_start:
  JMP PRINT
END:
mov rax,60
syscall

PRINT:
mov rax,1 ;bp1: RIP should point to PRINT
mov rdi,1 ;unsigned int
mov rsi, hellomsg ;const char *buf
mov rdx,lenhellomsg ;size t_count
syscall 

JMP END

```
At the first breakpoint, as the code jumped to line 13, RIP has the memory address of line 13. 

![](assets/posts/ASM/conditions/jmp_1.png)




## Conditional - signed arithmetic
These only apply to signed arithmetic due to signed flag (SF) being used.

### JZ/JE
This jump looks for `ZF` being set to `1`. This is used to determine if two numbers are equal.

#### Example
```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax,5
sub rax, 5
JE WORKS  ;bp1: ZF = 1, JE triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall

```

At the first breakpoint, `ZF` has been set to `1`. 

![](assets/posts/ASM/conditions/je_1.png)


This causes the control of execution to be moved to line 13. At the second breakpoint, i can see that RIP has the address of line 17 due to its previous jump. 

![](assets/posts/ASM/conditions/je_2.png)


### JNE/JNZ 
Both jumps look for `ZF` being set to `0` This is used to determine if two numbers are not equal to each other.


### Example
```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax,6
mov rbx, -5
add rax, rbx
JNE WORKS   ;bp1: ZF = 0, JNE triggers 



WORKS:
mov rax,1 ;bp2: RIP = WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END: 
mov rax,60
syscall
```
At the first breakpoint, `ZF` has been set to `0`. 

![](assets/posts/ASM/conditions/jne_1.png)


This triggers the jump to line 16. At the second breakpoint, RIP has the memory address of line 16 due to the previous jump.


![](assets/posts/ASM/conditions/jne_2.png)

## JG/JNLE
This jump looks for  ZF = `0` and SF=OF. This is usually used to compare if a number is bigger than the other.

### Example
```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax,6
mov rbx, 5
cmp rbx, rax  
JG WORKS   ;bp1: ZF=0, SF=OF 

WORKS:
mov rax,1 ;
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall
```
At the first breakpoint, ZF=0 with SF=OF=0. 
![](assets/posts/ASM/conditions/jg_1.png)
This triggers the jump to line 14. At the second breakpoint, RIP has the memory address of line 14 due to the previous jump

![](assets/posts/ASM/conditions/jg_2.png)


### JGE/JNL
This jump triggers when SF = OF . This is used to compare if a number is bigger OR equal to the other.


#### Example

```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax,6
mov rbx, 5
cmp rax, rbx  
JGE TEST2   ;bp1: SF=OF 

TEST2:
mov rax,5
mov rbx,5
cmp rax, rbx
JGE WORKS ;bp2: SF=OF

WORKS:
mov rax,1 ;bp3: RIP=WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall
```

At the first breakpoint, SF=OF.

![](assets/posts/ASM/conditions/jge_1.png)

This causes it to jump to TEST2. At the second breakpoint, SF=OF which causes it to jump to WORKS. 

![](assets/posts/ASM/conditions/jge_2.png)

At breakpoint 3, RIP contains the address of WORKS due to the previous jump.

![](assets/posts/ASM/conditions/jge_3.png)

### JL/NGE
This jump triggers when . This is used to compare if a number is lesser than the other.


#### Example

```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax,6
mov rbx, 5
cmp rbx, rax  
JL WORKS   ;bp1: SF!=OF, SF=1, OF=0

WORKS:
mov rax,1 ;bp2: 
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall
```
At the first breakpoint, SF=1 while OF=0 making it SF!=OF. 
![](assets/posts/ASM/conditions/jl_1.png)

This causes it to jump to WORKS. At the second breakpoint, RIP contains the address of line 14 due to the previous jump.
![](assets/posts/ASM/conditions/jl_2.png)


### JLE/JNG
This jump triggers when . This is used to compare if a number if lesser or equal to the other 

#### Example
```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax,6
mov rbx, 5
cmp rbx, rax  
JLE TEST2   ;bp1: ZF=1 OR SF!=OF, SF=1 hence !=0

TEST2:
mov rax, 5
mov rbx, 5
cmp rax, rbx
JLE WORKS ;bp2: ZF=1

WORKS:
mov rax,1 ;bp3: RIP=works
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall
```

At the first breakpoint, SF=1 while OF=0 hence making it SF!=0F
![](assets/posts/ASM/conditions/jle_1.png)

This causes it to jump to TEST2. At the second breakpoint, ZF=1. 
![](assets/posts/ASM/conditions/jle_2.png)

This causes it to jump to WORKS. At the third breakpoint.

![](assets/posts/ASM/conditions/jle_3.png)

## Conditional - unsigned arithmetic


## JA/JNBE
This jump looks for `(CF = 0) AND (ZF = 0)`. This determines if a number is greater than the other.

## JAE/JNB
This jump looks for CF = `0`. This determines if a number is greater than or equal to the other

## JB/JNAE
This jump looks for CF = `1`. This determines if a number is lesser than the other.
 
## JBE / JNA
This jump looks for `(CF = 1) OR (ZF = 1)`. This determines if a number is lesser or equal to the other.

## Special condition jumps

### JO/JNO
Looks for OF = `1` and jump if Overflow. `JNO` is the opposite of this.

### JS + JNS 
Look for SF=`1` and jump if negative. `JNS` is the opposite of this.

### JC + JNC 
Looks for CF=`1` and jump if negative. `JNC` is the opposite of this.

### JP/JPE
Looks for PF=`1` and jump if parity is even.

### JNP / JPO
Looks for PF=`0`and jump if no parity.



## Other conditionals 

### JXCZ
Jumps if CX is Zero

### JC
Jump If Carry 

#### Example
```

segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax, -96 
add rax, -12
JC WORKS  ;bp1: CF=1, JC triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall

```

At the first breakpoint, CF=1. 
![](assets/posts/ASM/conditions/jc_1.png)

This causes the code to jump to WORKS. At the second breakpoint, RIP contains the memory address of line 15. 

![](assets/posts/ASM/conditions/jc_2.png)



### JNC
Jump If No Carry

#### Example
```

segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax, 4 
add rax, 4
JNC WORKS  ;bp1: CF=0, JNC triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall

```
At the first breakpoint, CF=0.

![](assets/posts/ASM/conditions/jnc_1.png)

This causes the code to jump to WORKS. At the second breakpoint, RIP contains the memory address of line 15. 

![](assets/posts/ASM/conditions/jnc_2.png)


###  JO
Jump If Overflow

#### Example

```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov al, 96  
add al, 32
JO WORKS  ;bp1: OF=1, JO triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall
```

At the first breakpoint, OF=1 which causes the code to jump to WORKS. 
![](assets/posts/ASM/conditions/jo_1.png)


At the second breakpoint, RIP contains the memory address of line 15.
![](assets/posts/ASM/conditions/jo_2.png)




### JNO
Jump If No Overflow

#### Example
```

segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax, 4 
add rax, 4
JNO WORKS  ;bp1: OF=0, JNC triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall
```

At the first breakpoint, OF=0 which causes the code to jump to WORKS. 
![](assets/posts/ASM/conditions/jno_1.png)


At the second breakpoint, RIP contains the memory address of line 15.
![](assets/posts/ASM/conditions/jno_2.png)


### JP/JPE
Jump Parity or Jump Parity Even

#### Example
```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax, 12 
add rax, 12
JP WORKS  ;bp1: PF=1, JP triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall

```

At the first breakpoint, PF=1 which causes the code to jump to WORKS. 
![](assets/posts/ASM/conditions/jp_1.png)


At the second breakpoint, RIP contains the memory address of line 15.
![](assets/posts/ASM/conditions/jp_2.png)



### JNP/JPO
Jump No Parity or Jump Parity Odd

#### Example 

```

segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax, 1 
inc rax 
JNP WORKS  ;bp1: PF=0, JNP triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall

```

At the first breakpoint, PF=0 which causes the code to jump to WORKS. 
![](assets/posts/ASM/conditions/jnp_1.png)


At the second breakpoint, RIP contains the memory address of line 15.
![](assets/posts/ASM/conditions/jnp_2.png)


### JS
Jump Sign (negative value)

#### Example


```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov al, 12
add al, -13
JS WORKS  ;bp1: SF=1, JS triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END
END:
mov rax,60
syscall

```
At the first breakpoint, SF=1 which causes the code to jump to WORKS. 
![](assets/posts/ASM/conditions/js_1.png)


At the second breakpoint, RIP contains the memory address of line 15.
![](assets/posts/ASM/conditions/js_2.png)

![](assets/posts/ASM/conditions/js_3.png)



### JNS 
Jump No Sign (positive value)

#### Example

```
segment .data
  testmsg db `works\n`
  lentestmsg equ $-testmsg
section .text
  global _start


_start:
mov rax, 12
add rax, 2
JNS WORKS  ;bp1: SF=0, JNS triggers 


WORKS:
mov rax,1 ;bp2: RIP points to WORKS
mov rdi,1 ;unsigned int
mov rsi, testmsg ;const char *buf
mov rdx,lentestmsg ;size t_count
syscall
JMP END

END:
mov rax,60
syscall

```


At the first breakpoint, SF=0 which causes the code to jump to WORKS. 
![](assets/posts/ASM/conditions/jns_1.png)


At the second breakpoint, RIP contains the memory address of line 15.
![](assets/posts/ASM/conditions/jns_2.png)

