// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockRWA
 * @notice Mock ERC20 token representing a Real-World Asset
 * @dev Used as collateral in the lending system
 */
contract MockRWA is ERC20, Ownable {
    constructor() ERC20("Mock Real-World Asset", "RWA") Ownable(msg.sender) {}

    /**
     * @notice Mint new RWA tokens (for demo purposes)
     * @param to Address to receive tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
