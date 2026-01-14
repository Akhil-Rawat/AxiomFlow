const hre = require("hardhat");

// Your deployed contract addresses
const MOCK_RWA_ADDRESS = "0x19551C2864154642e27086Dbac1e9310888F04dE";
const LENDING_VAULT_ADDRESS = "0xaC22230625C831B54f8962319E6f7Fb3c97E81e0";
const YIELD_ENGINE_ADDRESS = "0x393eA73F70CBF8aAD511c3a928134B2Ded0Bc36B";

/**
 * 🚀 FULLY AUTOMATED STREAMING PAYMENT DEMO
 * This script demonstrates the complete lending flow with automated debt reduction
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n" + "=".repeat(80));
  console.log("🎬 AUTOMATED STREAMING PAYMENT DEMO - MANTLE SEPOLIA");
  console.log("=".repeat(80));
  console.log("📍 Wallet:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT\n");

  // Get contract instances
  const mockRWA = await hre.ethers.getContractAt("MockRWA", MOCK_RWA_ADDRESS);
  const lendingVault = await hre.ethers.getContractAt("LendingVault", LENDING_VAULT_ADDRESS);
  const yieldEngine = await hre.ethers.getContractAt("YieldEngine", YIELD_ENGINE_ADDRESS);

  // ============================================================================
  // STEP 1: Check Initial Balances
  // ============================================================================
  console.log("📊 INITIAL STATE");
  console.log("-".repeat(80));
  const rwaBalance = await mockRWA.balanceOf(deployer.address);
  console.log("RWA Balance:", hre.ethers.formatEther(rwaBalance), "RWA");
  console.log("Vault MNT Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(LENDING_VAULT_ADDRESS)), "MNT");
  console.log("");

  // ============================================================================
  // STEP 2: Deposit Collateral
  // ============================================================================
  console.log("🏦 STEP 1: DEPOSIT COLLATERAL");
  console.log("-".repeat(80));
  const depositAmount = hre.ethers.parseEther("200");
  console.log("Depositing:", hre.ethers.formatEther(depositAmount), "RWA");
  
  let tx = await mockRWA.approve(LENDING_VAULT_ADDRESS, depositAmount);
  await tx.wait();
  console.log("✅ Approved");
  
  tx = await lendingVault.depositCollateral(depositAmount);
  await tx.wait();
  console.log("✅ Collateral deposited");

  let position = await lendingVault.getUserPosition(deployer.address);
  console.log("\n📈 Position:");
  console.log("   Collateral:", hre.ethers.formatEther(position[0]), "RWA");
  console.log("   Max Borrow:", hre.ethers.formatEther(await lendingVault.getMaxBorrowAmount(deployer.address)), "MNT (50% LTV)");
  console.log("");

  // ============================================================================
  // STEP 3: Borrow MNT
  // ============================================================================
  console.log("💸 STEP 2: BORROW MNT");
  console.log("-".repeat(80));
  const borrowAmount = hre.ethers.parseEther("0.1");
  console.log("Borrowing:", hre.ethers.formatEther(borrowAmount), "MNT");
  
  const balanceBefore = await hre.ethers.provider.getBalance(deployer.address);
  tx = await lendingVault.borrow(borrowAmount);
  const receipt = await tx.wait();
  const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  
  // Calculate received amount (accounting for gas)
  const gasUsed = receipt.gasUsed * receipt.gasPrice;
  const received = balanceAfter - balanceBefore + gasUsed;
  
  console.log("✅ Borrowed successfully");
  console.log("📥 Received:", hre.ethers.formatEther(received), "MNT");

  position = await lendingVault.getUserPosition(deployer.address);
  console.log("\n📊 Updated Position:");
  console.log("   Collateral:", hre.ethers.formatEther(position[0]), "RWA");
  console.log("   Borrowed:", hre.ethers.formatEther(position[1]), "MNT");
  console.log("   💰 Current Debt:", hre.ethers.formatEther(position[2]), "MNT");
  console.log("");

  // ============================================================================
  // STEP 4: Simulate Yield Generation & AUTOMATED STREAMING PAYMENT
  // ============================================================================
  console.log("⚡ STEP 3: AUTOMATED STREAMING PAYMENT");
  console.log("-".repeat(80));
  console.log("🔄 Simulating yield generation from RWA...");
  console.log("");

  // Simulate multiple yield payments over time
  const yieldPayments = [
    { amount: "0.02", description: "First yield payment" },
    { amount: "0.03", description: "Second yield payment" },
    { amount: "0.05", description: "Final yield payment" }
  ];

  for (let i = 0; i < yieldPayments.length; i++) {
    const payment = yieldPayments[i];
    const yieldAmount = hre.ethers.parseEther(payment.amount);
    
    console.log(`💰 Yield Event ${i + 1}/3: ${payment.description}`);
    console.log(`   Sending ${payment.amount} MNT to YieldEngine...`);
    
    // Fund the yield engine
    tx = await deployer.sendTransaction({
      to: YIELD_ENGINE_ADDRESS,
      value: yieldAmount
    });
    await tx.wait();
    
    // Generate yield - this will AUTOMATICALLY reduce debt!
    console.log(`   🔄 Generating yield → Vault (AUTOMATIC debt reduction)...`);
    tx = await yieldEngine.generateYield();
    const yieldReceipt = await tx.wait();
    
    // Check events
    const debtReducedEvents = yieldReceipt.logs
      .filter(log => log.address.toLowerCase() === LENDING_VAULT_ADDRESS.toLowerCase())
      .map(log => {
        try {
          return lendingVault.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(parsed => parsed && parsed.name === "DebtReduced");
    
    console.log(`   ✅ Yield streamed to vault`);
    
    // Show updated position
    position = await lendingVault.getUserPosition(deployer.address);
    console.log(`   📊 Debt after payment: ${hre.ethers.formatEther(position[2])} MNT`);
    
    if (debtReducedEvents.length > 0) {
      console.log(`   🎯 Debt reduced automatically by ${hre.ethers.formatEther(debtReducedEvents[0].args[1])} MNT`);
    }
    console.log("");
    
    // Small delay for demo effect (optional)
    if (i < yieldPayments.length - 1) {
      console.log("   ⏳ Waiting for next yield event...\n");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // ============================================================================
  // STEP 5: Final Summary
  // ============================================================================
  console.log("=".repeat(80));
  console.log("🎉 DEMO COMPLETE - STREAMING PAYMENT SUCCESS!");
  console.log("=".repeat(80));
  
  position = await lendingVault.getUserPosition(deployer.address);
  const totalDebt = await lendingVault.totalDebt();
  
  console.log("\n📊 FINAL POSITION:");
  console.log("   Collateral:", hre.ethers.formatEther(position[0]), "RWA");
  console.log("   Total Borrowed:", hre.ethers.formatEther(position[1]), "MNT");
  console.log("   💚 Remaining Debt:", hre.ethers.formatEther(position[2]), "MNT");
  console.log("   📈 Debt Paid:", hre.ethers.formatEther(borrowAmount - position[2]), "MNT");
  
  const percentPaid = ((borrowAmount - position[2]) * 100n) / borrowAmount;
  console.log("   ✨ " + percentPaid + "% of debt automatically paid by yield!");
  
  console.log("\n🌐 CONTRACT STATS:");
  console.log("   Total System Debt:", hre.ethers.formatEther(totalDebt), "MNT");
  console.log("   Active Borrowers:", (await lendingVault.getBorrowersCount()).toString());
  
  console.log("\n💡 KEY FEATURES DEMONSTRATED:");
  console.log("   ✅ Collateral deposit");
  console.log("   ✅ MNT borrowing against RWA");
  console.log("   ✅ AUTOMATED yield streaming");
  console.log("   ✅ ZERO manual intervention for debt reduction");
  console.log("   ✅ Real-time debt paydown as yield arrives");
  
  console.log("\n🔗 VIEW ON EXPLORER:");
  console.log("   Vault: https://sepolia.mantlescan.xyz/address/" + LENDING_VAULT_ADDRESS);
  console.log("   Your Wallet: https://sepolia.mantlescan.xyz/address/" + deployer.address);
  
  console.log("\n" + "=".repeat(80));
  console.log("🚀 Fully functional streaming payment system on Mantle Sepolia!");
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
