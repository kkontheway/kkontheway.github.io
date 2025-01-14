---
title: DamnVulnerableDeFi-1
date: 2023-12-28 10:39:51
tags:
    - Defi
    - FlashLoan
    - DamnVulnerableDefi
categories: 
    - DamnVulnerableDefi
---

# Unstoppable
---
## Description
```
# Challenge #1 - Unstoppable

There’s a tokenized vault with a million DVT tokens deposited. It’s offering flash loans for free, until the grace period ends.

To pass the challenge, make the vault stop offering flash loans.

You start with 10 DVT tokens in balance.
```

## Code
`UnstoppableLender.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts/security/ReentrancyGuard.sol";

/**
 * @title DamnValuableToken
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract UnstoppableLender is ReentrancyGuard {
    IERC20 public immutable damnValuableToken;
    uint256 public poolBalance;

    error MustDepositOneTokenMinimum();
    error TokenAddressCannotBeZero();
    error MustBorrowOneTokenMinimum();
    error NotEnoughTokensInPool();
    error FlashLoanHasNotBeenPaidBack();
    error AssertionViolated();

    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert TokenAddressCannotBeZero();
        damnValuableToken = IERC20(tokenAddress);
    }

    function depositTokens(uint256 amount) external nonReentrant {
        if (amount == 0) revert MustDepositOneTokenMinimum();
        // Transfer token from sender. Sender must have first approved them.
        damnValuableToken.transferFrom(msg.sender, address(this), amount);
        poolBalance = poolBalance + amount;
    }

    function flashLoan(uint256 borrowAmount) external nonReentrant {
        if (borrowAmount == 0) revert MustBorrowOneTokenMinimum();

        uint256 balanceBefore = damnValuableToken.balanceOf(address(this));
        if (balanceBefore < borrowAmount) revert NotEnoughTokensInPool();

        // Ensured by the protocol via the `depositTokens` function
        if (poolBalance != balanceBefore) revert AssertionViolated();

        damnValuableToken.transfer(msg.sender, borrowAmount);

        IReceiver(msg.sender).receiveTokens(
            address(damnValuableToken),
            borrowAmount
        );

        uint256 balanceAfter = damnValuableToken.balanceOf(address(this));
        if (balanceAfter < balanceBefore) revert FlashLoanHasNotBeenPaidBack();
    }
}

interface IReceiver {
    function receiveTokens(address tokenAddress, uint256 amount) external;
}
```
`ReceiverUnstoppable.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {UnstoppableLender} from "./UnstoppableLender.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ReceiverUnstoppable
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract ReceiverUnstoppable {
    using SafeERC20 for IERC20;

    UnstoppableLender private immutable pool;
    address private immutable owner;

    error OnlyOwnerCanExecuteFlashLoan();
    error SenderMustBePool();

    constructor(address poolAddress) {
        pool = UnstoppableLender(poolAddress);
        owner = msg.sender;
    }

    /// @dev Pool will call this function during the flash loan
    function receiveTokens(address tokenAddress, uint256 amount) external {
        if (msg.sender != address(pool)) revert SenderMustBePool();
        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
    }

    function executeFlashLoan(uint256 amount) external {
        if (msg.sender != owner) revert OnlyOwnerCanExecuteFlashLoan();
        pool.flashLoan(amount);
    }
}
```

## Observation
- The contract use >0.8.0 which means there is no underflow/overflow question
- The contract inherit from Openzepplien's ReentrancyGuard contract, so we can be sure that reentrancy will not be a problem.
- The `constructor` is correctly checking that the DVT token is not an empty address
- Our goal is to make the flash loan can;t be support again

## Attack
`flashloan()`：
```solidity
function flashLoan(IERC3156FlashBorrower receiver,address _token,uint256 amount,
bytes calldata data) external returns (bool) {
        if (amount == 0) revert InvalidAmount(0); // fail early
        if (address(asset) != _token) revert UnsupportedCurrency(); // enforce ERC3156 requirement
        uint256 balanceBefore = totalAssets();
        if (convertToShares(totalSupply) != balanceBefore)
            revert InvalidBalance(); // enforce ERC4626 requirement
        uint256 fee = flashFee(_token, amount);
        // transfer tokens out + execute callback on receiver
        ERC20(_token).safeTransfer(address(receiver), amount);
        // callback must return magic value, otherwise assume it failed
        if (
            receiver.onFlashLoan(
                msg.sender,
                address(asset),
                amount,
                fee,
                data
            ) != keccak256("IERC3156FlashBorrower.onFlashLoan")
        ) revert CallbackFailed();
        // pull amount + fee from receiver, then pay the fee to the recipient
        ERC20(_token).safeTransferFrom(
            address(receiver),
            address(this),
	            amount + fee
        );
        ERC20(_token).safeTransfer(feeRecipient, fee);
        return true;
    }
```

## Refer
---
https://stermi.xyz/blog/damn-vulnerable-defi-challenge-1-solution-unstoppable
https://zach030.xlog.app/damn-vulnerable-defi--Unstoppable
https://github.com/WTFAcademy/WTF-Solidity/blob/main/51_ERC4626/readme.md