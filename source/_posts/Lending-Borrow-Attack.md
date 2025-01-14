---
title: Lending&Borrow Attack
date: 2024-04-28 16:33:04
tags:
---
# Lending & Borrowing Attack
---
Learning security issues in Lending&Borrowing
## Liquidation Before Default
---
Liquidation allows a borrower's collateral to be seized and either given to the lender. but only be possible if :
- The borrower has failed to meet their repayment schedule obligation, or being late on a repayment
- the value of collateral has fallen below at a set threshold

so, if lender, Liquidator or another market participant can liquidate a Borrower's collateral before the scheduled, this will cause a critical loss of funds for borrower.

### Example
```solidity
function lastRepaidTimestamp(Loan storage loan) internal view returns (uint32) {
    return
        // @audit if no repayments have yet been made, lastRepaidTimestamp()
        // will return acceptedTimestamp - time when loan was accepted
        loan.lastRepaidTimestamp == 0
            ? loan.acceptedTimestamp
            : loan.lastRepaidTimestamp;
}

function canLiquidateLoan(uint loanId) public returns (bool) {
    Loan storage loan = loans[loanId];

    // Make sure loan cannot be liquidated if it is not active
    if (loan.state != LoanState.ACCEPTED) return false;

    return (uint32(block.timestamp) - lastRepaidTimestamp(loan) > paymentDefaultDuration);
    // @audit if no repayments have been made:
    // block.timestamp - acceptedTimestamp > paymentDefaultDuration
    // doesn't check paymentCycleDuration (when next payment is due)
    // if paymentDefaultDuration < paymentCycleDuration, can be liquidated
    // *before* first payment is due. If paymentDefaultDuration is very small,
    // can be liquidated very soon after taking loan, way before first payment
    // is due!
}
```

```solidity
function liquidate(IERC20 collateralToken, address position) external override {
    // @audit collateralToken is never validated, could be empty object corresponding
    // to address(0) or a different address not linked to position's collateral
    (uint256 price,) = priceFeeds[collateralToken].fetchPrice();
    // @audit with empty/non-existent collateral, the value of the collateral will be 0
    // with another address, the value will be whatever that value is, not the value
    // of the Borrower's actual collateral. This allows Borrower to be Liquidated
    // before they are in default, since the value of Borrower's actual collateral is
    // never calculated.
    uint256 entirePositionCollateral = raftCollateralTokens[collateralToken].token.balanceOf(position);
    uint256 entirePositionDebt = raftDebtToken.balanceOf(position);
    uint256 icr = MathUtils._computeCR(entirePositionCollateral, entirePositionDebt, price);

```


## Borrower Can't Be Liquidated
---
If the Borrower can devise a loan offer that results in their collateral not being able to be liquidated.

### Example
```solidity
// AddressSet from https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable
// a loan must have at least one collateral
// & only one amount per token is permitted
struct CollateralInfo {
    EnumerableSetUpgradeable.AddressSet collateralAddresses;
    // token => amount
    mapping(address => uint) collateralInfo;
}

// loanId -> validated collateral info
mapping(uint => CollateralInfo) internal _loanCollaterals;

function commitCollateral(uint loanId, address token, uint amount) external {
    CollateralInfo storage collateral = _loanCollaterals[loanId];

    // @audit doesn't check return value of AddressSet.add()
    // returns false if not added because already exists in set
    collateral.collateralAddresses.add(token);

    // @audit after loan offer has been created & validated, borrower can call
    // commitCollateral(loanId, token, 0) to overwrite collateral record 
    // with 0 amount for the same token. Any lender who accepts the loan offer
    // won't be protected if the borrower defaults since there's no collateral
    // to lose
    collateral.collateralInfo[token] = amount;
}
```

## Debt Closed Without Repayment
---
Normally, when borrower want to close a debt, he needs to repay the principal and the interest. But if the borrower can close the debt without repaying full amount and keep their collateral. it will cause a big Problem.

```solidity
// amount of open credit lines on a Line of Credit facility
uint256 private count; 

// id -> credit line provided by a single Lender for a given token on a Line of Credit
mapping(bytes32 => Credit) public credits; 

// @audit attacker calls close() with non-existent id
function close(bytes32 id) external payable override returns (bool) {
    // @audit doesn't check that id exists in credits, if it doesn't
    // exist an empty Credit with default values will be returned
    Credit memory credit = credits[id];

    address b = borrower; // gas savings
    // @audit borrower attacker will pass this check
    if(msg.sender != credit.lender && msg.sender != b) {
      revert CallerAccessDenied();
    }

    // ensure all money owed is accounted for. Accrue facility fee since prinicpal was paid off
    credit = _accrue(credit, id);
    uint256 facilityFee = credit.interestAccrued;
    if(facilityFee > 0) {
      // only allow repaying interest since they are skipping repayment queue.
      // If principal still owed, _close() MUST fail
      LineLib.receiveTokenOrETH(credit.token, b, facilityFee);

      credit = _repay(credit, id, facilityFee);
    }

    // @audit _closed() called with empty credit, non-existent id
    _close(credit, id); // deleted; no need to save to storage

    return true;
}

function _close(Credit memory credit, bytes32 id) internal virtual returns (bool) {
    if(credit.principal > 0) { revert CloseFailedWithPrincipal(); }

    // return the Lender's funds that are being repaid
    if (credit.deposit + credit.interestRepaid > 0) {
        LineLib.sendOutTokenOrETH(
            credit.token,
            credit.lender,
            credit.deposit + credit.interestRepaid
        );
    }

    delete credits[id]; // gas refunds

    // remove from active list
    ids.removePosition(id);

    // @audit calling with non-existent id still decrements count, can
    // keep calling close() with non-existent id until count decremented to 0
    // and loan marked as repaid!
    unchecked { --count; }

    // If all credit lines are closed the the overall Line of Credit facility is declared 'repaid'.
    if (count == 0) { _updateStatus(LineLib.STATUS.REPAID); }

    emit CloseCreditPosition(id);

    return true;
}
```

## Repayments Paused While Liquidations Enable
---
Lending & Borrowing DeFi platforms should never be able to enter a state where [repayments are paused but liquidations are enabled](https://github.com/sherlock-audit/2023-02-blueberry-judging/issues/290), since this would unfairly prevent Borrowers from making their repayments while still allowing them to be liquidated. 
```solidity
function liquidate(uint256 positionId, address debtToken, uint256 amountCall) 
    external override lock poke(debtToken) {

function repay(address token, uint256 amountCall)
    external override inExec poke(token) onlyWhitelistedToken(token) {
    if (!isRepayAllowed()) revert REPAY_NOT_ALLOWED();

```

## Token Disallow stops Existing Repayment & Liquidation
---
Some Platform allow gov to disallow accepting previously allowed tokens, which means if some borrower use TokenA to make a debt, now Platform disallow the TokenA, so The borrower can not repay the loan and get their collateral back.


## Borrower Immediately Liquidated After Repayments Resume
---
If the Repayments is paused, during the pause , the value of collateral has fallen down, so when the repayment resume, the borrower will be liquidate immediately. Unless the borrower front-run the liquidation bots.


## Infinite Loan Rollover
---
If the Borrower can rollover their loan, the Lender must also be able to limit rollover either by limiting the number of times, the length of time, or through other parameters. If the Borrower can infinitely rollover their loan, this represents a critical loss of funds risk for the Lender who may never be repaid and never be able to liquidate the Borrower to take their collateral.


## Repayment Sent to Zero Address
---
```solidity
function repay (uint256 loanID, uint256 repaid) external {
    Loan storage loan = loans[loanID];

    if (block.timestamp > loan.expiry) 
        revert Default();

    uint256 decollateralized = loan.collateral * repaid / loan.amount;

    // @audit loans[loanID] is deleted here
    // which means that loan which points to loans[loanID]
    // will be an empty object with default/0 member values
    if (repaid == loan.amount) delete loans[loanID];
    else {
        loan.amount -= repaid;
        loan.collateral -= decollateralized;
    }

    // @audit loan.lender = 0 due to the above delete
    // hence repayment will be sent to the zero address
    // some erc20 tokens will revert but many will happily
    // execute and the repayment will be lost forever
    debt.transferFrom(msg.sender, loan.lender, repaid);
    collateral.transfer(owner, decollateralized);
}
```

"loan" points to storage `loans[loanID]`, but `loans[loanID]` is deleted then afterward the repayment is transferred to loan.lender which will be 0 due to the previous deletion. Some ERC20 tokens will revert but many will happily execute causing the repayment to be sent to the zero address and lost forever.

## Borrower Permanently Unable To Repay Loan
---
The borrower should be able to repay the debt until the collateral has been Liquidated.
if the system can enter a state where Borrower can not repay their loan, because the repay() function reverts, the borrower will lose their collateral forever.

## Borrower Repayment Only Partially Credited
---
If the borrower (Borrower) can roll over their loan, i.e., extend the loan term without immediate repayment when the loan is due, then the lender (Lender) must also be able to limit the conditions for the rollover, such as:
- Limiting the number of rollovers
- Limiting the total duration of the rollover
- Limiting the rollover through other parameters

If the borrower can roll over their loan indefinitely, this poses a serious risk of capital loss to the lender. Because:
- The lender may never be able to recover the loan
- The lender may never be able to liquidate the borrower and obtain their collateral

In this case, the borrower can evade the obligation to repay by rolling over indefinitely, while the lender cannot take effective measures to recover the funds or obtain compensation.
## No Incentive To Liquidate Small Positions
---

## Code
All Test Code can be found in [Code](https://github.com/kkontheway/Auditor-Playground)
