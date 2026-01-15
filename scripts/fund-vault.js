const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("💰 FUNDING VAULT WITH 300 MNT");
  console.log("👤 Deployer:", deployer.address);
  
  const deployment = require("../frontend/deployment.json");
  const lendingVault = await hre.ethers.getContractAt("LendingVault", deployment.lendingVault);
  
  const fundTx = await lendingVault.fundVault({
    value: hre.ethers.parseEther("300")
  });
  await fundTx.wait();
  
  console.log("✅ Vault funded with 300 MNT!");
  
  const balance = await hre.ethers.provider.getBalance(deployment.lendingVault);
  console.log("🏦 Vault balance:", hre.ethers.formatEther(balance), "MNT");
}

main().then(() => process.exit(0)).catch(console.error);
