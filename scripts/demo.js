const hre = require("hardhat");

// Replace with your deployed contract addresses
const MOCK_RWA_ADDRESS = "0x19551C2864154642e27086Dbac1e9310888F04dE";
const LENDING_VAULT_ADDRESS = "0xaC22230625C831B54f8962319E6f7Fb3c97E81e0";
const YIELD_ENGINE_ADDRESS = "0x393eA73F70CBF8aAD511c3a928134B2Ded0Bc36B";

async function main() {
  const [user] = await hre.ethers.getSigners();
  
  console.log("🎬 Running End-to-End Demo on Mantle Sepolia");
  console.log("👤 User address:", user.address);
  console.log("💰 User balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(user.address)), "MNT\n");

  // Get contract instances
  const mockRWA = await hre.ethers.getContractAt("MockRWA", MOCK_RWA_ADDRESS);
  const lendingVault = await hre.ethers.getContractAt("LendingVault", LENDING_VAULT_ADDRESS);
  const yieldEngine = await hre.ethers.getContractAt("YieldEngine", YIELD_ENGINE_ADDRESS);

  // Step 1: Check RWA balance
  console.log("1️⃣ Checking RWA balance...");
  const rwaBalance = await mockRWA.balanceOf(user.address);
  console.log("   RWA Balance:", hre.ethers.formatEther(rwaBalance), "RWA");

  // Step 2: Approve and deposit collateral
  console.log("\n2️⃣ Depositing 100 RWA as collateral...");
  const depositAmount = hre.ethers.parseEther("100");
  let tx = await mockRWA.approve(LENDING_VAULT_ADDRESS, depositAmount);
  await tx.wait();
  console.log("   ✅ Approved");
  
  tx = await lendingVault.depositCollateral(depositAmount);
  await tx.wait();
  console.log("   ✅ Deposited");

  // Step 3: Check position and borrow
  let position = await lendingVault.getUserPosition(user.address);
  console.log("\n3️⃣ Current Position:");
  console.log("   Collateral:", hre.ethers.formatEther(position[0]), "RWA");
  console.log("   Borrowed:", hre.ethers.formatEther(position[1]), "MNT");
  console.log("   Debt:", hre.ethers.formatEther(position[2]), "MNT");

  const maxBorrow = await lendingVault.getMaxBorrowAmount(user.address);
  console.log("   Max Borrow:", hre.ethers.formatEther(maxBorrow), "MNT");

  console.log("\n4️⃣ Borrowing 0.05 MNT...");
  const borrowAmount = hre.ethers.parseEther("0.05");
  tx = await lendingVault.borrow(borrowAmount);
  await tx.wait();
  console.log("   ✅ Borrowed");

  position = await lendingVault.getUserPosition(user.address);
  console.log("\n5️⃣ Position After Borrow:");
  console.log("   Collateral:", hre.ethers.formatEther(position[0]), "RWA");
  console.log("   Borrowed:", hre.ethers.formatEther(position[1]), "MNT");
  console.log("   Debt:", hre.ethers.formatEther(position[2]), "MNT");

  // Step 4: Fund YieldEngine and generate yield
  console.log("\n6️⃣ Funding YieldEngine with 0.03 MNT...");
  tx = await user.sendTransaction({
    to: YIELD_ENGINE_ADDRESS,
    value: hre.ethers.parseEther("0.03")
  });
  await tx.wait();
  console.log("   ✅ Funded");

  console.log("\n7️⃣ Generating yield (sending to vault)...");
  console.log("   🔄 STREAMING PAYMENT: Yield will AUTOMATICALLY reduce debt!");
  tx = await yieldEngine.generateYield();
  await tx.wait();
  console.log("   ✅ Yield streamed to vault - debt reduced automatically!");

  // Check position after automated payment
  position = await lendingVault.getUserPosition(user.address);
  console.log("\n8️⃣ Position After AUTOMATED Payment:");
  console.log("   Collateral:", hre.ethers.formatEther(position[0]), "RWA");
  console.log("   Borrowed:", hre.ethers.formatEther(position[1]), "MNT");
  console.log("   Debt:", hre.ethers.formatEther(position[2]), "MNT");
  console.log("   💡 No manual call needed - debt reduced automatically!");
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 STREAMING PAYMENT DEMO COMPLETE!");
  console.log("=".repeat(60));
  console.log("✨ KEY FEATURE: Yield AUTOMATICALLY reduces debt!");
  console.log("🔄 No manual intervention needed - true streaming payments!");
  console.log("💰 Debt was paid down from 0.05 MNT → " + hre.ethers.formatEther(position[2]) + " MNT");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
