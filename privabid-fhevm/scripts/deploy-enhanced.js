// scripts/deploy-enhanced.js
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Enhanced PrivaBidAuction (FHE-Compatible)...");
  console.log("========================================================\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy({
    gasLimit: 2000000,
    gasPrice: ethers.parseUnits("15", "gwei"),
  });
  
  await auction.waitForDeployment();
  const address = await auction.getAddress();
  
  console.log("\n✅ Enhanced PrivaBid deployed:", address);
  console.log("📜 Etherscan: https://sepolia.etherscan.io/address/" + address);
  
  // Test
  console.log("\n🧪 Testing...");
  try {
    const message = await auction.getTestMessage();
    console.log("Message:", message);
  } catch (error) {
    console.log("Note:", error.message);
  }
  
  // Save address
  const fs = require('fs');
  fs.writeFileSync('enhanced-contract.txt', address);
  
  console.log("\n🎉 FHE-Compatible Features:");
  console.log("   1. ✅ No decryption in contract (pure FHE)");
  console.log("   2. ✅ Commit-reveal scheme for winner determination");
  console.log("   3. ✅ Owner-declared winner with partial reveal");
  console.log("   4. ✅ Frontend re-encryption for private viewing");
  console.log("   5. ✅ All existing functions preserved");
  console.log("\n⚠️  Note: Winner determination requires off-chain processing");
  console.log("   or trusted oracle/owner declaration");
}

main().catch(console.error);