const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("🚀 Deploying contracts to Mantle Sepolia...");
  console.log("📍 Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "MNT\n");

  // 1. Deploy MockRWA
  console.log("1️⃣ Deploying MockRWA...");
  const MockRWA = await hre.ethers.getContractFactory("MockRWA");
  const mockRWA = await MockRWA.deploy();
  await mockRWA.waitForDeployment();
  const rwaAddress = await mockRWA.getAddress();
  console.log("✅ MockRWA deployed to:", rwaAddress);

  // 2. Deploy LendingVault
  console.log("\n2️⃣ Deploying LendingVault...");
  const LendingVault = await hre.ethers.getContractFactory("LendingVault");
  const lendingVault = await LendingVault.deploy(rwaAddress);
  await lendingVault.waitForDeployment();
  const vaultAddress = await lendingVault.getAddress();
  console.log("✅ LendingVault deployed to:", vaultAddress);

  // 3. Deploy YieldEngine
  console.log("\n3️⃣ Deploying YieldEngine...");
  const YieldEngine = await hre.ethers.getContractFactory("YieldEngine");
  const yieldEngine = await YieldEngine.deploy(vaultAddress);
  await yieldEngine.waitForDeployment();
  const engineAddress = await yieldEngine.getAddress();
  console.log("✅ YieldEngine deployed to:", engineAddress);

  // 4. Fund the vault with 1 MNT
  console.log("\n4️⃣ Funding LendingVault with 1 MNT...");
  const fundTx = await lendingVault.fundVault({
    value: hre.ethers.parseEther("1"),
  });
  await fundTx.wait();
  console.log("✅ Vault funded with 1 MNT");

  // 5. Mint RWA tokens to deployer for testing
  console.log("\n5️⃣ Minting 1000 RWA tokens to deployer...");
  const mintTx = await mockRWA.mint(
    deployer.address,
    hre.ethers.parseEther("1000")
  );
  await mintTx.wait();
  console.log("✅ Minted 1000 RWA tokens");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   MockRWA:       ", rwaAddress);
  console.log("   LendingVault:  ", vaultAddress);
  console.log("   YieldEngine:   ", engineAddress);
  console.log("\n💡 Next Steps:");
  console.log("   1. Approve RWA tokens to LendingVault");
  console.log("   2. Deposit collateral");
  console.log("   3. Borrow MNT");
  console.log("   4. Fund YieldEngine and generate yield");
  console.log("   5. Reduce debt with yield");

  // Save deployment addresses to JSON file for frontend
  const deployment = {
    lendingVault: vaultAddress,
    yieldEngine: engineAddress,
    mockRWA: rwaAddress,
    deployer: deployer.address,
    network: "mantle-sepolia",
    timestamp: new Date().toISOString(),
  };

  const frontendDir = path.join(__dirname, "..", "frontend");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendDir, "deployment.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("\n✅ Deployment addresses saved to frontend/deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
