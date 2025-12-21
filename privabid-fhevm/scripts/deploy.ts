import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying PrivaBidAuction...");
  
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy();
  
  await auction.waitForDeployment();
  const address = await auction.getAddress();
  
  console.log("✅ PrivaBidAuction deployed to:", address);
  console.log("📋 Contract features:");
  console.log("   - Encrypted bid storage (euint32)");
  console.log("   - FHE comparison (gt(), select())");
  console.log("   - Private auction management");
  console.log("   - Winner tracking without bid revelation");
  
  // Verify on Etherscan (if API key is set)
  console.log("\n🔍 To verify on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
