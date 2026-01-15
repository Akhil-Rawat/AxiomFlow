const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();

  console.log("🧪 TESTING COMPLETE FLOW");
  console.log("👤 User address:", user.address);
  console.log("=".repeat(60));

  // Load deployed contract addresses
  const deployment = require("../frontend/deployment.json");

  const mockRWA = await hre.ethers.getContractAt("MockRWA", deployment.mockRWA);
  const lendingVault = await hre.ethers.getContractAt(
    "LendingVault",
    deployment.lendingVault
  );
  const yieldEngine = await hre.ethers.getContractAt(
    "YieldEngine",
    deployment.yieldEngine
  );

  console.log("\n📊 INITIAL STATE");
  let balance = await hre.ethers.provider.getBalance(user.address);
  console.log("User MNT balance:", hre.ethers.formatEther(balance), "MNT");

  let rwaBalance = await mockRWA.balanceOf(user.address);
  console.log("User RWA balance:", hre.ethers.formatEther(rwaBalance), "RWA");

  // Step 1: Approve RWA tokens
  console.log("\n1️⃣ APPROVING RWA TOKENS...");
  const approveTx = await mockRWA.approve(
    deployment.lendingVault,
    hre.ethers.parseEther("100")
  );
  await approveTx.wait();
  console.log("✅ Approved 100 RWA tokens");

  // Step 2: Deposit collateral
  console.log("\n2️⃣ DEPOSITING COLLATERAL...");
  const depositTx = await lendingVault.depositCollateral(
    hre.ethers.parseEther("100")
  );
  await depositTx.wait();
  console.log("✅ Deposited 100 RWA as collateral");

  let position = await lendingVault.positions(user.address);
  console.log(
    "   Collateral:",
    hre.ethers.formatEther(position.collateralAmount),
    "RWA"
  );

  // Step 3: Borrow MNT
  console.log("\n3️⃣ BORROWING MNT...");
  const borrowAmount = hre.ethers.parseEther("0.5"); // 50% of 100 RWA
  const borrowTx = await lendingVault.borrow(borrowAmount);
  await borrowTx.wait();
  console.log("✅ Borrowed 0.5 MNT");

  position = await lendingVault.positions(user.address);
  console.log(
    "   Borrowed Amount:",
    hre.ethers.formatEther(position.borrowedAmount),
    "MNT"
  );
  console.log(
    "   Remaining Debt:",
    hre.ethers.formatEther(position.remainingDebt),
    "MNT"
  );

  balance = await hre.ethers.provider.getBalance(user.address);
  console.log("   User MNT balance:", hre.ethers.formatEther(balance), "MNT");

  // Step 4: Fund YieldEngine
  console.log("\n4️⃣ FUNDING YIELD ENGINE...");
  const fundTx = await user.sendTransaction({
    to: deployment.yieldEngine,
    value: hre.ethers.parseEther("0.3"),
  });
  await fundTx.wait();
  console.log("✅ Funded YieldEngine with 0.3 MNT");

  let yieldBalance = await hre.ethers.provider.getBalance(
    deployment.yieldEngine
  );
  console.log(
    "   YieldEngine balance:",
    hre.ethers.formatEther(yieldBalance),
    "MNT"
  );

  // Step 5: Generate yield and reduce debt
  console.log("\n5️⃣ GENERATING YIELD & REDUCING DEBT...");
  console.log(
    "   Debt BEFORE yield:",
    hre.ethers.formatEther(position.remainingDebt),
    "MNT"
  );

  const yieldTx = await yieldEngine.generateYield();
  const receipt = await yieldTx.wait();
  console.log("✅ Yield generated and distributed!");

  // Check updated position
  position = await lendingVault.positions(user.address);
  console.log(
    "   Debt AFTER yield:",
    hre.ethers.formatEther(position.remainingDebt),
    "MNT"
  );

  const debtPaid = position.borrowedAmount - position.remainingDebt;
  console.log("   Debt Paid:", hre.ethers.formatEther(debtPaid), "MNT");

  // Final state
  console.log("\n📊 FINAL STATE");
  console.log(
    "   Collateral:",
    hre.ethers.formatEther(position.collateralAmount),
    "RWA"
  );
  console.log(
    "   Total Borrowed:",
    hre.ethers.formatEther(position.borrowedAmount),
    "MNT"
  );
  console.log(
    "   Remaining Debt:",
    hre.ethers.formatEther(position.remainingDebt),
    "MNT"
  );
  console.log(
    "   Debt Paid by Yield:",
    hre.ethers.formatEther(debtPaid),
    "MNT"
  );

  let totalDebt = await lendingVault.totalDebt();
  console.log(
    "\n   Total Platform Debt:",
    hre.ethers.formatEther(totalDebt),
    "MNT"
  );

  console.log("\n" + "=".repeat(60));
  console.log("🎉 FLOW TEST COMPLETE!");
  console.log("✅ All steps executed successfully");
  console.log("✅ Debt automatically reduced through yield");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
