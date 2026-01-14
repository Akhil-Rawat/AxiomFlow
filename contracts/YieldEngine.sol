// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YieldEngine
 * @notice Yield generator that sends MNT to LendingVault
 * @dev Uses real MNT on Mantle Sepolia. Owner funds this contract to simulate yield.
 */
contract YieldEngine is Ownable {
    // Address of the lending vault that receives yield
    address payable public immutable lendingVault;

    // Events
    event YieldGenerated(uint256 amount);

    constructor(address payable _lendingVault) Ownable(msg.sender) {
        require(_lendingVault != address(0), "Invalid vault address");
        lendingVault = _lendingVault;
    }

    /**
     * @notice Generate and send yield to the LendingVault
     * @dev Sends all MNT balance to the vault
     */
    function generateYield() external {
        uint256 yieldAmount = address(this).balance;
        require(yieldAmount > 0, "No MNT to generate yield");

        // Send MNT to LendingVault
        (bool success, ) = lendingVault.call{value: yieldAmount}("");
        require(success, "Yield transfer failed");

        emit YieldGenerated(yieldAmount);
    }

    /**
     * @notice Generate specific amount of yield
     * @param amount Amount of MNT to send as yield
     */
    function generateYieldAmount(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient balance");

        // Send specified amount to LendingVault
        (bool success, ) = lendingVault.call{value: amount}("");
        require(success, "Yield transfer failed");

        emit YieldGenerated(amount);
    }

    /**
     * @notice Get current MNT balance (simulated yield pool)
     * @return Current MNT balance
     */
    function getYieldBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow contract to receive MNT (to simulate yield accumulation)
    receive() external payable {}
}
