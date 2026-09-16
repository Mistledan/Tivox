// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TIVOX Token
/// @notice Fixed-supply ERC-20 token. Burnable by holders. Ownable for future admin needs.
/// @dev Total supply is minted once at deployment. No further minting is possible.
contract TIVOX is ERC20, ERC20Burnable, Ownable {
    // 1,000,000 tokens with 18 decimals
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 10 ** 18;

    constructor(address initialOwner)
        ERC20("TIVOX", "TVX")
        Ownable(initialOwner)
    {
        _mint(initialOwner, TOTAL_SUPPLY);
    }
}
