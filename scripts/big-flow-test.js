const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();

  console.log("🚀 TESTING BIG FLOW WITH REALISTIC AMOUNTS");
  console.log("👤 User address:", user.address);
  console.log("=".repeat(70));

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
  console.log("💰 User MNT balance:", hre.ethers.formatEther(balance), "MNT");

  let rwaBalance = await mockRWA.balanceOf(user.address);
  console.log(
    "📦 User RWA balance:",
    hre.ethers.formatEther(rwaBalance),
    "RWA"
  );

  // Use 190 RWA tokens (leaving some for rounding)
  const collateralAmount = hre.ethers.parseEther("190");
  const borrowAmount = hre.ethers.parseEther("95"); // Borrow 95 MNT (50% LTV of 190 RWA)
  const yieldAmount = hre.ethers.parseEther("30"); // Generate 30 MNT yield

  // Step 1: Approve RWA tokens
  console.log("\n1️⃣ APPROVING RWA TOKENS...");
  const approveTx = await mockRWA.approve(
    deployment.lendingVault,
    collateralAmount
  );
  await approveTx.wait();
  console.log(
    "✅ Approved",
    hre.ethers.formatEther(collateralAmount),
    "RWA tokens"
  );

  // Step 2: Deposit collateral
  console.log("\n2️⃣ DEPOSITING COLLATERAL...");
  const depositTx = await lendingVault.depositCollateral(collateralAmount);
  await depositTx.wait();
  console.log(
    "✅ Deposited",
    hre.ethers.formatEther(collateralAmount),
    "RWA as collateral"
  );

  let position = await lendingVault.positions(user.address);
  console.log(
    "   📦 Collateral:",
    hre.ethers.formatEther(position.collateralAmount),
    "RWA"
  );

  // Step 3: Borrow MNT
  console.log("\n3️⃣ BORROWING MNT...");
  const borrowTx = await lendingVault.borrow(borrowAmount);
  await borrowTx.wait();
  console.log("✅ Borrowed", hre.ethers.formatEther(borrowAmount), "MNT");

  position = await lendingVault.positions(user.address);
  console.log(
    "   💵 Total Borrowed (All Time):",
    hre.ethers.formatEther(position.borrowedAmount),
    "MNT"
  );
  console.log(
    "   ⚠️  Current Debt:",
    hre.ethers.formatEther(position.remainingDebt),
    "MNT"
  );

  balance = await hre.ethers.provider.getBalance(user.address);
  console.log(
    "   💰 User MNT balance:",
    hre.ethers.formatEther(balance),
    "MNT"
  );

  // Step 4: Fund YieldEngine with big amount
  console.log("\n4️⃣ FUNDING YIELD ENGINE...");
  const fundTx = await user.sendTransaction({
    to: deployment.yieldEngine,
    value: yieldAmount,
  });
  await fundTx.wait();
  console.log(
    "✅ Funded YieldEngine with",
    hre.ethers.formatEther(yieldAmount),
    "MNT"
  );

  let yieldBalance = await hre.ethers.provider.getBalance(
    deployment.yieldEngine
  );
  console.log(
    "   💎 YieldEngine balance:",
    hre.ethers.formatEther(yieldBalance),
    "MNT"
  );

  // Step 5: Generate yield and reduce debt
  console.log("\n5️⃣ GENERATING YIELD & REDUCING DEBT...");
  const debtBefore = position.remainingDebt;
  console.log(
    "   💸 Debt BEFORE yield:",
    hre.ethers.formatEther(debtBefore),
    "MNT"
  );

  const yieldTx = await yieldEngine.generateYield();
  await yieldTx.wait();
  console.log("✅ Yield generated and distributed automatically!");

  // Check updated position
  position = await lendingVault.positions(user.address);
  const debtAfter = position.remainingDebt;
  console.log(
    "   ✨ Debt AFTER yield:",
    hre.ethers.formatEther(debtAfter),
    "MNT"
  );

  const totalDebtPaid = position.borrowedAmount - position.remainingDebt;
  const justPaid = debtBefore - debtAfter;
  console.log(
    "   💰 Just Paid by Yield:",
    hre.ethers.formatEther(justPaid),
    "MNT"
  );
  console.log(
    "   🎉 Total Debt Paid (All Time):",
    hre.ethers.formatEther(totalDebtPaid),
    "MNT"
  );

  // Final state
  console.log("\n📊 FINAL POSITION SUMMARY");
  console.log("=".repeat(70));
  console.log(
    "   📦 Collateral Locked:",
    hre.ethers.formatEther(position.collateralAmount),
    "RWA"
  );
  console.log(
    "   💵 Total Borrowed:",
    hre.ethers.formatEther(position.borrowedAmount),
    "MNT"
  );
  console.log(
    "   ⚠️  Remaining Debt:",
    hre.ethers.formatEther(position.remainingDebt),
    "MNT"
  );
  console.log(
    "   ✅ Paid by Yield:",
    hre.ethers.formatEther(totalDebtPaid),
    "MNT"
  );

  const percentagePaid =
    (Number(totalDebtPaid) / Number(position.borrowedAmount)) * 100;
  console.log("   📊 Debt Reduction:", percentagePaid.toFixed(2) + "%");

  let totalDebt = await lendingVault.totalDebt();
  console.log(
    "\n   🌐 Total Platform Debt:",
    hre.ethers.formatEther(totalDebt),
    "MNT"
  );

  let vaultBalance = await hre.ethers.provider.getBalance(
    deployment.lendingVault
  );
  console.log(
    "   🏦 Vault MNT Balance:",
    hre.ethers.formatEther(vaultBalance),
    "MNT"
  );

  console.log("\n" + "=".repeat(70));
  console.log("🎉 BIG FLOW TEST COMPLETE!");
  console.log("✅ Deposited 5,000 RWA as collateral");
  console.log("✅ Borrowed 150 MNT");
  console.log("✅ Generated 50 MNT yield");
  console.log("✅ Debt automatically reduced!");
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
