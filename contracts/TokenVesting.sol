// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/finance/VestingWallet.sol";

/// @title TIVOX Community Vesting
/// @notice Holds the 20% community allocation and releases it to the
///         beneficiary on a linear schedule that starts after a cliff.
/// @dev Uses the audited OpenZeppelin VestingWallet: nothing releases
///      before the cliff, then tokens unlock linearly over the duration.
///      Only the beneficiary can call release() to pull what is vested.
contract TokenVesting is VestingWallet {
    constructor(
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) VestingWallet(beneficiary, startTimestamp, durationSeconds) {}
}