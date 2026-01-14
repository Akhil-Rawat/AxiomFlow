# 🚀 Mantle Lending MVP - Deployment Guide

## 📋 Prerequisites

1. **Get Mantle Sepolia Testnet MNT:**
   - Faucet: https://faucet.sepolia.mantle.xyz/
   - Or bridge from Sepolia ETH

2. **Set up your wallet:**
   - Add Mantle Sepolia to MetaMask
   - Network Name: Mantle Sepolia Testnet
   - RPC URL: https://rpc.sepolia.mantle.xyz
   - Chain ID: 5003
   - Currency Symbol: MNT
   - Block Explorer: https://sepolia.mantlescan.xyz/

## 🛠️ Installation & Compilation

```powershell
# Install dependencies
npm install

# Compile contracts
npx hardhat compile
```

## 🚀 Deployment

1. **Create .env file:**
```bash
PRIVATE_KEY=your_private_key_here
```

2. **Deploy to Mantle Sepolia:**
```powershell
npx hardhat run scripts/deploy.js --network mantleSepolia
```

This will:
- Deploy MockRWA (collateral token)
- Deploy LendingVault
- Deploy YieldEngine
- Fund vault with 1 MNT
- Mint 1000 RWA tokens to deployer

## 🎬 Running the Demo

1. **Update demo.js with your deployed addresses**

2. **Run end-to-end demo:**
```powershell
npx hardhat run scripts/demo.js --network mantleSepolia
```

## 📝 Manual Testing Flow

### Step 1: Deposit Collateral
```javascript
// Approve RWA tokens
await mockRWA.approve(lendingVaultAddress, ethers.parseEther("100"));

// Deposit collateral
await lendingVault.depositCollateral(ethers.parseEther("100"));
```

### Step 2: Borrow MNT
```javascript
// Check max borrowable amount
const maxBorrow = await lendingVault.getMaxBorrowAmount(userAddress);

// Borrow MNT (receives native MNT)
await lendingVault.borrow(ethers.parseEther("0.05"));
```

### Step 3: Generate Yield
```javascript
// Fund YieldEngine with MNT
await signer.sendTransaction({
  to: yieldEngineAddress,
  value: ethers.parseEther("0.03")
});

// Generate yield (sends to vault)
await yieldEngine.generateYield();
```

### Step 4: Reduce Debt
```javascript
// Apply yield to reduce user debt
await lendingVault.reduceDebtForUser(userAddress);

// Check updated position
const position = await lendingVault.getUserPosition(userAddress);
console.log("Remaining Debt:", ethers.formatEther(position[2]));
```

## 🔗 Network Information

- **Network**: Mantle Sepolia Testnet
- **RPC URL**: https://rpc.sepolia.mantle.xyz
- **Chain ID**: 5003
- **Native Token**: MNT
- **Explorer**: https://sepolia.mantlescan.xyz/

## 🎯 Key Features

- **50% LTV**: Borrow up to 50% of collateral value
- **Real MNT**: Uses native MNT token on Mantle Sepolia
- **Yield-backed**: Yield automatically reduces debt
- **Simple & Functional**: No complex math, ready for demo

## 📞 Contract Functions

### LendingVault
- `depositCollateral(uint256 amount)` - Deposit RWA as collateral
- `borrow(uint256 amount)` - Borrow MNT against collateral
- `reduceDebtForUser(address user)` - Apply yield to reduce debt
- `getUserPosition(address user)` - View user's position
- `fundVault()` - Add MNT liquidity (payable)

### YieldEngine
- `generateYield()` - Send all balance to vault
- `generateYieldAmount(uint256)` - Send specific amount

### MockRWA
- `mint(address to, uint256 amount)` - Mint collateral tokens (owner only)
