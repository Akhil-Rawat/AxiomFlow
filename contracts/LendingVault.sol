// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LendingVault
 * @notice Core lending contract that accepts RWA collateral and lends MNT
 * @dev Yield received automatically reduces user debt. Uses real MNT on Mantle Sepolia.
 */
contract LendingVault is ReentrancyGuard, Ownable {
    // Collateral token (MockRWA)
    IERC20 public immutable collateralToken;

    // Loan-to-Value ratio (50% = 5000 basis points)
    uint256 public constant LTV_RATIO = 5000; // 50%
    uint256 public constant BASIS_POINTS = 10000;

    // Track user positions
    struct UserPosition {
        uint256 collateralAmount; // Amount of RWA deposited
        uint256 borrowedAmount; // Amount of MNT borrowed
        uint256 remainingDebt; // Current debt (starts equal to borrowed)
    }

    mapping(address => UserPosition) public positions;

    // Track all borrowers for automated yield distribution
    address[] private borrowers;
    mapping(address => bool) private isBorrower;

    // Total debt across all users for proportional distribution
    uint256 public totalDebt;

    // Events
    event CollateralDeposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event YieldReceived(uint256 amount);
    event DebtReduced(address indexed user, uint256 amount);
    event VaultFunded(address indexed funder, uint256 amount);
    event AutomatedPayment(uint256 totalYield, uint256 usersProcessed);

    constructor(address _collateralToken) Ownable(msg.sender) {
        require(_collateralToken != address(0), "Invalid collateral token");
        collateralToken = IERC20(_collateralToken);
    }

    /**
     * @notice Fund the vault with MNT to enable lending
     * @dev Anyone can fund the vault, typically done by owner/protocol
     */
    function fundVault() external payable {
        require(msg.value > 0, "Must send MNT");
        emit VaultFunded(msg.sender, msg.value);
    }

    /**
     * @notice Deposit RWA tokens as collateral
     * @param amount Amount of RWA tokens to deposit
     */
    function depositCollateral(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        // Transfer RWA tokens from user to contract
        require(
            collateralToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        // Update user position
        positions[msg.sender].collateralAmount += amount;

        emit CollateralDeposited(msg.sender, amount);
    }

    /**
     * @notice Borrow MNT against deposited collateral
     * @param amount Amount of MNT to borrow
     */
    function borrow(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        UserPosition storage position = positions[msg.sender];
        require(position.collateralAmount > 0, "No collateral deposited");

        // Calculate maximum borrowable amount based on LTV
        uint256 maxBorrow = (position.collateralAmount * LTV_RATIO) /
            BASIS_POINTS;
        uint256 newTotalBorrowed = position.borrowedAmount + amount;

        require(newTotalBorrowed <= maxBorrow, "Exceeds borrowing limit");
        require(address(this).balance >= amount, "Insufficient MNT in vault");

        // Update position
        position.borrowedAmount += amount;
        position.remainingDebt += amount;
        totalDebt += amount;

        // Track borrower for automated payments
        if (!isBorrower[msg.sender]) {
            borrowers.push(msg.sender);
            isBorrower[msg.sender] = true;
        }

        // Send MNT to user
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "MNT transfer failed");

        emit Borrowed(msg.sender, amount);
    }

    /**
     * @notice Receive yield from YieldEngine and AUTOMATICALLY reduce debts
     * @dev STREAMING PAYMENT: Yield is automatically distributed to all borrowers proportionally
     */
    function receiveYield() external payable {
        require(msg.value > 0, "No yield received");

        emit YieldReceived(msg.value);

        // AUTOMATED STREAMING PAYMENT - no manual intervention needed!
        _distributeYieldAutomatically(msg.value);
    }

    /**
     * @notice Internal function to automatically stream yield to reduce debts
     * @param yieldAmount Amount of yield to distribute
     * @dev Distributes proportionally based on each user's debt share
     */
    function _distributeYieldAutomatically(uint256 yieldAmount) internal {
        if (totalDebt == 0) return; // No debt to reduce

        uint256 remainingYield = yieldAmount;
        uint256 usersProcessed = 0;

        // Distribute yield proportionally to all borrowers
        for (uint256 i = 0; i < borrowers.length && remainingYield > 0; i++) {
            address borrower = borrowers[i];
            UserPosition storage position = positions[borrower];

            if (position.remainingDebt == 0) continue;

            // Calculate proportional share: (user debt / total debt) * yield
            uint256 userShare = (position.remainingDebt * yieldAmount) /
                totalDebt;

            // Don't exceed user's debt or remaining yield
            uint256 debtReduction = userShare > position.remainingDebt
                ? position.remainingDebt
                : userShare;
            debtReduction = debtReduction > remainingYield
                ? remainingYield
                : debtReduction;

            if (debtReduction > 0) {
                position.remainingDebt -= debtReduction;
                totalDebt -= debtReduction;
                remainingYield -= debtReduction;
                usersProcessed++;

                emit DebtReduced(borrower, debtReduction);
            }
        }

        emit AutomatedPayment(yieldAmount, usersProcessed);
    }

    /**
     * @notice Manually reduce a specific user's debt with available yield
     * @param user Address of the user whose debt to reduce
     * @dev This function allows targeted debt reduction (alternative to automated)
     */
    function reduceDebtForUser(address user) external {
        UserPosition storage position = positions[user];
        require(position.remainingDebt > 0, "No debt to reduce");

        uint256 availableYield = address(this).balance;
        require(availableYield > 0, "No yield available");

        // Calculate how much debt can be paid off
        uint256 debtReduction = position.remainingDebt > availableYield
            ? availableYield
            : position.remainingDebt;

        // Reduce debt
        position.remainingDebt -= debtReduction;
        totalDebt -= debtReduction;

        emit DebtReduced(user, debtReduction);
    }

    /**
     * @notice Get user's current position
     * @param user Address of the user
     * @return collateralAmount Amount of collateral deposited
     * @return borrowedAmount Total amount borrowed
     * @return remainingDebt Current outstanding debt
     */
    function getUserPosition(
        address user
    )
        external
        view
        returns (
            uint256 collateralAmount,
            uint256 borrowedAmount,
            uint256 remainingDebt
        )
    {
        UserPosition memory position = positions[user];
        return (
            position.collateralAmount,
            position.borrowedAmount,
            position.remainingDebt
        );
    }

    /**
     * @notice Get maximum borrowable amount for a user
     * @param user Address of the user
     * @return Maximum amount of MNT that can be borrowed
     */
    function getMaxBorrowAmount(address user) external view returns (uint256) {
        UserPosition memory position = positions[user];
        uint256 maxBorrow = (position.collateralAmount * LTV_RATIO) /
            BASIS_POINTS;

        // Return remaining borrowing capacity
        if (maxBorrow > position.borrowedAmount) {
            return maxBorrow - position.borrowedAmount;
        }
        return 0;
    }

    /**
     * @notice Get contract's MNT balance (available yield)
     * @return Current MNT balance
     */
    function getAvailableYield() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get total number of active borrowers
     * @return Number of users who have borrowed
     */
    function getBorrowersCount() external view returns (uint256) {
        return borrowers.length;
    }

    // Allow contract to receive MNT - triggers automated payment!
    receive() external payable {
        emit YieldReceived(msg.value);
        // Automatically distribute yield when received
        if (msg.value > 0 && totalDebt > 0) {
            _distributeYieldAutomatically(msg.value);
        }
    }
}
