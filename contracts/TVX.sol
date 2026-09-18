// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TVX Token
/// @notice Mainnet ERC-20 token: 1,000,000,000 TVX minted once at deployment.
/// @dev 0% transfer tax, burnable by holders, no mint function, no pausing,
///      no freezing. Ownership is transferable and renounceable but grants no
///      special powers over the token.
contract TVX is ERC20, ERC20Burnable, Ownable {
    // 1,000,000,000 tokens with 18 decimals
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    constructor() ERC20("TIVOX", "TVX") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}