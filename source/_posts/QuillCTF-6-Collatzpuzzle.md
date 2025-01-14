---
title: QuillCTF-6.Collatzpuzzle
date: 2024-01-22 17:00:59
tags:
categories: 
    - QuillCTF
---

```
“It's a puzzle I'll keep trying because it's so much fun.”
```

## Objective

- Make a successful call to the callMe function.
- You should be the deployer of the contract at the given addr parameter!

## Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICollatz {
    function collatzIteration(uint256 n) external pure returns (uint256);
}

contract CollatzPuzzle is ICollatz {
    function collatzIteration(uint256 n) public pure override returns (uint256) {
        if (n % 2 == 0) {
            return n / 2;
        } else {
            return 3 * n + 1;
        }
    }

    function callMe(address addr) external view returns (bool) {
        // check code size
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        require(size > 0 && size <= 32, "bad code size!");

        // check results to be matching
        uint256 p;
        uint256 q;
        for (uint256 n = 1; n < 200; n++) {
            // local result
            p = n;
            for (uint256 i = 0; i < 5; i++) {
                p = collatzIteration(p);
            }
            // your result
            q = n;
            for (uint256 i = 0; i < 5; i++) {
                q = ICollatz(addr).collatzIteration{gas: 100}(q);
            }
            require(p == q, "result mismatch!");
        }

        return true;
    }
}
```

## Observation

The Key to solve the Challenge is to make the code size small than 32 bytes.

```solidity
require(size > 0 && size <= 32, "bad code size!");
```

So let‘s write the runtime code that handles the Collatz iteration logic:

```
Push1 0x04 //skip 4-byte selector
CALLDATALOAD
DUP1
PUSH1 0x01
AND
PUSH1 0x13
JUMPI
PUSH1 0x01
SHR
PUSH1 0x17
JUMP
JUMPDEST
PUSH1 0x3
MUL
PUSH1 0x1
ADD
JUMPDEST
PUSH1 0x80
MSTORE
PUSH1 0x20
PUSH1 0x80
RETURN
```

let me explain one by one.

First i use `PUSH1 0x04`  to skip 4-byte selector ,as we know the function selector is the first four bytes of a function's signature, used to identify which function to excute during a contract call.

The `PUSH1 0x04` instruction pushes the number `4` onto the stack. This operation is often used to set up the starting offset for the `calldataload` instruction to extract the function selector from the call data.

then , use SHR to find `n/2`, as shifting right once divides by 2. denote as `m`,push destination to `return`. Then `PUSH1` 0x17 to JUMP.

```
// entry
PUSH1 0x04
CALLDATALOAD
DUP1
PUSH1 0x01
AND
PUSH1 0x10
JUMPI // ═════════════════╗
                       // ║
// even                // ║
PUSH1 0x01             // ║
SHR                    // ║
PUSH1 0x17             // ║
JUMP // ════════════╗     ║
                 // ║     ║
// odd           // ║     ║
JUMPDEST // <═══════║═════╝
PUSH1 0x3        // ║
MUL              // ║
PUSH1 0x1        // ║
ADD              // ║
                 // ║
// return        // ║
JUMPDEST // <═══════╝
PUSH1 0x80
MSTORE
PUSH1 0x20
PUSH1 0x80
RETURN
```
## Attack

so the bytecode is `6004358060011660135760011c6017565b6003026001015b60805260206080f3`
now we need to write our initialization code.which is tasked with copying the runtime code above into the memory.It will do so via `CODECOPY` instruction, and must later return the code from memory.

```
PUSH32 6002600435818106156015576003026001016017565b045b60005260206000f3  
PUSH1 00  
MSTORE  
PUSH1 20  
PUSH1 00  
RETURN
```

The byteCode is `0x7f6002600435818106156015576003026001016017565b045b60005260206000f360005260206000f3`. this will help us to develop the code above the chain.

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import "src/Collatz_Puzzle.sol";

contract Attack{
    function deploy() public returns (address){
        bytes memory con = hex"7f6002600435818106156015576003026001016017565b045b60005260206000f360005260206000f3";
        address addr;
        assembly{
            addr := create(0,add(con,0x20),0x29)
        }
        return addr;
    }
}

contract testCollatz is Test {    
    CollatzPuzzle public cz;
    address attacker;
    function setUp() public {
        attacker = vm.addr(1);
        cz = new CollatzPuzzle();
    }

    function testExploit() public {
        vm.startPrank(attacker);
        Attack att = new Attack();
        address taddr = att.deploy();
        bool ans = cz.callMe(taddr);
        vm.stopPrank();
        assert(ans == true);

    }
}
```