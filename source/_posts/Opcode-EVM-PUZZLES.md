---
title: Opcode-EVM_PUZZLES
date: 2024-01-08 13:42:30
tags:
    - solidity
    - evm-puzzles
categories:
    - Opcodes
---
## Puzzles1

```
############
# Puzzle 1 #
############

00      34      CALLVALUE
01      56      JUMP
02      FD      REVERT
03      FD      REVERT
04      FD      REVERT
05      FD      REVERT
06      FD      REVERT
07      FD      REVERT
08      5B      JUMPDEST
09      00      STOP

? Enter the value to send: (0) 
```
> 考察JUMP

**CALLVALUE**
- 操作码：`0x34`
- gas消耗: 2
- 功能：将发送给合约的ether的数量（以wei为单位）压入堆栈。
- 使用场景：当合约需要知道有多少以太币被发送时使用。

**JUMP**
`JUMP`指令用于无条件跳转到一个新的程序计数器位置。它从堆栈中弹出一个元素（也就是栈顶），将这个元素设定为新的程序计数器（`pc`）的值。操作码是`0x56`，gas消耗为8。

**JUMPDEST**

`JUMPDEST`指令标记一个有效的跳转目标位置，不然无法使用`JUMP`和`JUMPI`进行跳转。它的操作码是`0x5b`，`gas`消耗为1。
`JUMP` 和 `JUMPI` 指令只能跳转到被标记为 `JUMPDEST` 的位置。这个机制是为了确保代码的安全性，防止通过跳转到随机或不合适的代码位置来执行潜在的恶意操作。

所以输入`8`,使`CALLVALUE=8`，通过挑战

## Puzzles2

```
############
# Puzzle 2 #
############

00      34      CALLVALUE
01      38      CODESIZE
02      03      SUB
03      56      JUMP
04      FD      REVERT
05      FD      REVERT
06      5B      JUMPDEST
07      00      STOP
08      FD      REVERT
09      FD      REVERT
```
**CODESIZE**
- 操作码：`0x38`
- gas消耗： 2
- 功能：获取当前合约代码的字节长度，然后压入堆栈。
- 使用场景：当合约需要访问自己的字节码时使用。

在这里就是10

**SUB**
算数指令`SUB`指令从堆栈顶部弹出两个元素，然后计算第一个元素减去第二个元素，最后将结果推入堆栈。这个指令的操作码是`0x03`，gas消耗为`3`。

所以目标是 `CODESIZE - CALLVALUE = 6`

所以我们使得 `CALLVALUE = 4` ，就可以通过挑战

## Puzzles3

```
############
# Puzzle 3 #
############

00      36      CALLDATASIZE
01      56      JUMP
02      FD      REVERT
03      FD      REVERT
04      5B      JUMPDEST
05      00      STOP
```

**CALLDATASIZE**
- 操作码：`0x36`
- gas消耗：2
- 功能：获取交易或合约调用的`data`字段的字节长度，并压入堆栈。
- 使用场景：在读取数据之前检查大小。

所以我们传入任意四位长度的data就可以了，`CALLDATASIZE = 0x00000000`


## Puzzles4

```
############
# Puzzle 4 #
############

00      34      CALLVALUE
01      38      CODESIZE
02      18      XOR
03      56      JUMP
04      FD      REVERT
05      FD      REVERT
06      FD      REVERT
07      FD      REVERT
08      FD      REVERT
09      FD      REVERT
0A      5B      JUMPDEST
0B      00      STOP
```

**XOR**
`XOR`指令与`AND`和`OR`指令类似，但执行的是异或运算。操作码是`0x18`，gas 消耗为`3`。

也就是我们使得`CALLVALUE xor 0x0c = a` 也就是`CALLVALUE xor 1100 = 1010`，`CALLVALUE = 0110 = 6`


## Puzzles5

```
############
# Puzzle 5 #
############

00      34          CALLVALUE
01      80          DUP1
02      02          MUL
03      610100      PUSH2 0100
06      14          EQ
07      600C        PUSH1 0C
09      57          JUMPI
0A      FD          REVERT
0B      FD          REVERT
0C      5B          JUMPDEST
0D      00          STOP
0E      FD          REVERT
0F      FD          REVERT
```

**DUP1**
在EVM中，`DUP`是一系列的指令，总共有16个，从`DUP1`到`DUP16`，操作码范围为`0x80`到`0x8F`，gas消耗均为3。这些指令用于复制（Duplicate）堆栈上的指定元素（根据指令的序号）到堆栈顶部。例如，`DUP1`复制栈顶元素，`DUP2`复制距离栈顶的第二个元素，以此类推。

**MUL**
MUL`指令和`ADD`类似，但是它将堆栈的顶部两个元素相乘。操作码是`0x02`，gas消耗为`5`。

**EQ**
EQ`指令从堆栈中弹出两个元素，如果两个元素相等，那么将`1`推入堆栈，否则将`0`推入堆栈。该指令的操作码是`0x14`，gas消耗为`3`。

**JUMPI**
`JUMPI`指令用于条件跳转，它从堆栈中弹出两个元素，如果第二个元素（条件，`condition`）不为0，那么将第一个元素（目标，`destination`）设定为新的`pc`的值。操作码是`0x57`，gas消耗为10。

所以我们要使`CALLVALUE * CALLVALUE = 0x100` ，所以我们可以得到`CALLVALUE = 16`


## Puzzles6
```
############
# Puzzle 6 #
############

00      6000      PUSH1 00
02      35        CALLDATALOAD
03      56        JUMP
04      FD        REVERT
05      FD        REVERT
06      FD        REVERT
07      FD        REVERT
08      FD        REVERT
09      FD        REVERT
0A      5B        JUMPDEST
0B      00        STOP
```
**CALLDATALOAD**
- 操作码：`0x35`
- gas消耗: 3
- 功能：从交易或合约调用的`data`字段加载数据。它从堆栈中弹出calldata的偏移量（`offset`），然后从calldata的`offset`位置读取32字节的数据并压入堆栈。如果`calldata`剩余不足32字节，则补0。
- 使用场景：读取传入的数据。

因为`JUMPDEST`在`0A`，所以传入：`0x000000000000000000000000000000000000000000000000000000000000000a`



## Puzzles7
```
############
# Puzzle 7 #
############

00      36        CALLDATASIZE
01      6000      PUSH1 00
03      80        DUP1  //=CALLDATASIZE
04      37        CALLDATACOPY
05      36        CALLDATASIZE
06      6000      PUSH1 00
08      6000      PUSH1 00
0A      F0        CREATE
0B      3B        EXTCODESIZE
0C      6001      PUSH1 01
0E      14        EQ
0F      6013      PUSH1 13
11      57        JUMPI
12      FD        REVERT
13      5B        JUMPDEST
14      00        STOP
```

**CALLDATACOPY**
- 操作码：`0x37`
- gas消耗：3 + 3 * 数据长度 + 内存扩展成本
- 功能：将`data`中的数据复制到内存中。它会从堆栈中弹出3个参数(mem_offset, calldata_offset, length)，分别对应写到内存的偏移量，读取calldata的偏移量和长度。
- 使用场景：将输入数据复制到内存。

**CREATE**
在EVM中，当一个合约想要创建一个新的合约时，会使用`CREATE`指令。它的简化流程：
1. 从堆栈中弹出`value`（向新合约发送的ETH）、`mem_offset`和`length`（新合约的`initcode`在内存中的初始位置和长度）。
2. 计算新合约的地址，计算方法为:
    ```python
    address = keccak256(rlp([sender_address,sender_nonce]))[12:]
    ```
3. 更新ETH余额。
4. 初始化新的EVM上下文`evm_create`，用于执行`initcode`。
5. 在`evm_create`中执行`initcode`。
6. 如果执行成功，则更新创建的账户状态：更新`balance`，将`nonce`初始化为`0`，将`code`字段设为`evm_create`的返回数据，将`storage`字段设置为`evm_create`的`storage`。
7. 如果成功，则将新合约地址推入堆栈；若失败，将`0`推入堆栈。

所以根据题目，我们要构造一个`runtimecode = 1` 的合约，这样才能通过`0E`的`EQ`。
```
## 把01放进栈，任意长度为1字节的内容即可
PUSH1 01       
PUSH1 00		   
## 把ff存入memory，因为return会才能够内存中返回
MSTORE        
## 将01从内存返回作为runtimecode，压入return需要的另外两个参数。
PUSH1 31
PUSH1 1
RETURN 

```
可以构造出`CALLDATA = 60016000526001601ff3`


## Puzzles8

```
############
# Puzzle 8 #
############

00      36        CALLDATASIZE
01      6000      PUSH1 00
03      80        DUP1
04      37        CALLDATACOPY
05      36        CALLDATASIZE
06      6000      PUSH1 00
08      6000      PUSH1 00
0A      F0        CREATE
0B      6000      PUSH1 00
0D      80        DUP1
0E      80        DUP1
0F      80        DUP1
10      80        DUP1
11      94        SWAP5
12      5A        GAS
13      F1        CALL
14      6000      PUSH1 00
16      14        EQ
17      601B      PUSH1 1B
19      57        JUMPI
1A      FD        REVERT
1B      5B        JUMPDEST
1C      00        STOP

```
想要执行`JUMPDEST` 先要让`CALL = 00`，也就是CALL调用CREATE的新合约要失败，才能通过EQ。
上一题构造了一个`0x60016000526001601ff3`,但是01时ADD，但是没有参数所以执行会失败，所以会也可以通过这题。

## Puzzles9
```
############
# Puzzle 9 #
############

00      36        CALLDATASIZE
01      6003      PUSH1 03
03      10        LT
04      6009      PUSH1 09
06      57        JUMPI
07      FD        REVERT
08      FD        REVERT
09      5B        JUMPDEST
0A      34        CALLVALUE
0B      36        CALLDATASIZE
0C      02        MUL
0D      6008      PUSH1 08
0F      14        EQ
10      6014      PUSH1 14
12      57        JUMPI
13      FD        REVERT
14      5B        JUMPDEST
15      00        STOP

```
输入的`CALLDATASIZE`需要`>3`，同时，`CALLDATASIZE*CALLVALUE = 8` 。
所以我们传入`CALLDATASIZE = 0x00000000`，`CALLVALUE = 2`即可


## Puzzles10
```

#############
# Puzzle 10 #
#############

00      38          CODESIZE
01      34          CALLVALUE
02      90          SWAP1
03      11          GT
04      6008        PUSH1 08
06      57          JUMPI
07      FD          REVERT
08      5B          JUMPDEST
09      36          CALLDATASIZE
0A      610003      PUSH2 0003
0D      90          SWAP1
0E      06          MOD
0F      15          ISZERO
10      34          CALLVALUE
11      600A        PUSH1 0A
13      01          ADD
14      57          JUMPI
15      FD          REVERT
16      FD          REVERT
17      FD          REVERT
18      FD          REVERT
19      5B          JUMPDEST
1A      00          STOP

```

首先`CALLVALUE`最大不能超过`CODESIZE`也就是`27`，其次`CALLDATASIZE mod 3 = 0 `，最后要求`CALLVALUE+0A = 0x19`.
所以我们可以取`CALLDATASIZE = 0x000000`,`CALLVALUE = 15`





