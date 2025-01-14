---
title: Paradigm2023-100%
date: 2024-04-11 10:59:12
tags:
---
# Description

Your funds are safe when you use our innovative new payment splitter that ensure that 100% of assets make it to their intended recipients

# Goal

Drain all $ETH from the deployed Split and SplitWallet contracts.

# Code
`Split`: Implement one NFT Called `Split`, and it can assign a group of user can withdraw tokens by the pre-defined ratio. Each new `Split` NFT will bind with a new SplitWallet contract. 

`SplitWallet`: The token receiver point of each Split. 

`Split::distribute()`：Can take the token from the `Wallet` to `Split` contract.

# Solution
We can find that `Split::distribute()`：Can take the token from the `Wallet` to `Split` contract simply, but the problem is to drain the $ETH from Split.

The key is in the `Split::_hashSplit()`, there are Abi Hash Collisions problem in `abi.encodePacked`, 
```solidity
function _hashSplit(address[] memory accounts, uint32[] memory percents, uint32 relayerFee)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(accounts, percents, relayerFee));
    }
```
which means:
```solidity
abi.encodePacked([account1,account2],[percents1,percents2],relayerfee) = abi.encodePacked([account1],[account2,percents1,percents2],relayerfee)
```
We have 100$ ETH at begin, so we can deposit create our own `accounts[]`,and let last acconut be the first account percent value that bypass the restriction that the sum value of the percent of a Split must be exactly 100% (1e6).

# Exp
Full code is here.
