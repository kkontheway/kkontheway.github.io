---
title: QuillCTF-Summary
date: 2024-01-23 09:51:56
tags:
---
# WHAT I LEARN FROM QUILLCTF

# 5-D31eg4t3

1. Basic storage.

# 8-Pelusa

1. The contract codesize is set only at the end of constructor. so it can pass the vertify like `msg.sender.code.length == 0`
2. Use create2 to create the address.

# 19-Predictable-nft

1. Use `createSelectFork` cheatcode on Foundry to create a new fork.

```solidity
 function setUp() public {
        vm.createSelectFork("https://eth-goerli.g.alchemy.com/v2/api_key");
        vm.deal(hacker, 1 ether);
        nft = INFT(0xFD3CbdbD9D1bBe0452eFB1d1BFFa94C8468A66fC);
    }
```
