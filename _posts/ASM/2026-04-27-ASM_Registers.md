---
title: ASM - Registers
date: 2026-04-27 00:00:00 +0800
categories: [ASM]
tags:      # TAG names should always be lowercase
description: ASM
toc: true
---

## Registers
There are 10 32-bit and 16-bit processor registers in IA-32 architecture. They are grouped into 3 main categories: general, control and segments registers.

### General
The general registers further divided into: data, pointer and index registers

#### Data
Four 32-bit data registers are used for arithmetic, logical, and other operations. Each register can be used in 4 different ways. 
Firstly the whole register can be used:


```
MOV EAX,1
```

Secondly, the lower half of the register can be used:

```
MOV AX, 1
```
Thirdly,  the upper half of the lower halve of the register can be used:

```
MOV AH, 1
```

Fourthly, the lower half of the lower halve of the register can be used:

```
MOV AL, 1
```

![](assets/posts/ASM/registers/register1.jpg)

These registers have more specific uses:
1. `Primary accumulator - EAX` is mainly used in arithmetic calculations to store the output from an arithmetic operation.
2. `Base register - EBX` can be used for indexed addressing.
3. `Count register - ECX` to store the loop count in iterative operations. 
4. `Data register - EDX` is manly used in input/output operations and usually used alongside the `EAX`register for operations with large values.

#### Pointer registers
The pointer registers are 32-bit `EIP`, `ESP`, and `EBP` registers and corresponding 16-bit right portions `IP`, `SP`, and `BP`:
1. `IP`is mainly used in storing the offset address of the next instruction to be executed. 
2. `SP` is mainly used to provide the offset value within the program stack. 
3. `BP` is mainly used to help in referencing the parameter variables passed to a subroutine. 

![](assets/posts/ASM/registers/register2.jpg)


#### Index registers
The 32-bit index registers, `ESI` and `EDI`, and their 16-bit rightmost portions. Their uses are:
1. `SI` is used as as source index for string operations.
2. `DI` is used as destination index for string operations.

![](assets/posts/ASM/registers/register2.jpg)


### Control registers
The 32-bit instruction pointer register and the 32-bit flags register combined are considered as the control registers.

Many operations involves comparisons, arithmetic operations that changes the statuses of the flags. Some of these commonly used flags being:

1. `Overflow flag - OF` it indicates the overflow of a high-order bit (leftmost bit) of data after a signed arithmetic operation.
2. `Direction flag - DF` It determines left or right direction for moving or comparing string data. When the DF value is 0, the string operation takes left-to-right direction and when the value is set to 1, the string operation takes right-to-left direction.
3. `Interrupt flag - IF` It determines whether the external interrupts like keyboard entry, etc., are to be ignored or processed. It disables the external interrupt when the value is 0 and enables interrupts when set to 1.
4. `Trap flag - TF` It allows setting the operation of the processor in single-step mode. The DEBUG program we used sets the trap flag, so we could step through the execution one instruction at a time.
5. `Sign flag - SF`  It shows the sign of the result of an arithmetic operation. This flag is set according to the sign of a data item following the arithmetic operation. The sign is indicated by the high-order of leftmost bit. A positive result clears the value of SF to 0 and negative result sets it to 1.
6. `Zero flag - ZF` It indicates the result of an arithmetic or comparison operation. A nonzero result clears the zero flag to 0, and a zero result sets it to 1.
7. `Auxiliary flag - AF` It contains the carry from bit 3 to bit 4 following an arithmetic operation; used for specialized arithmetic. The AF is set when a 1-byte arithmetic operation causes a carry from bit 3 into bit 4.
8. `Parity flag - PF`  It indicates the total number of 1-bits in the result obtained from an arithmetic operation. An even number of 1-bits clears the parity flag to 0 and an odd number of 1-bits sets the parity flag to 1.
9. `Carry flag - CF` It contains the carry of 0 or 1 from a high-order bit (leftmost) after an arithmetic operation. It also stores the contents of last bit of a shift or rotate operation.


## Segment registers
These registers store the address to a segment of the program. In a program there are 3 main segments with them being `data`, `text` and `stack`.

## References 
<https://www.tutorialspoint.com/assembly_programming/assembly_registers.htm>>
<https://github.com/0xAX/asm/blob/master/content/asm_1.md>
