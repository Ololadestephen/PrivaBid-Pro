// scripts/deploy-fhe.js - FIXED FOR YOUR FHE CONTRACT
const { ethers } = require("hardhat");
const { fhenix } = require("hardhat");

async function main() {
  console.log("🚀 Deploying PrivaBidAuction (FHE Version)...");
  console.log("============================================\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (ethers.formatEther(balance) < 0.01) {
    console.error("❌ Insufficient ETH for deployment. Get Sepolia ETH from faucet.");
    return;
  }
  
  console.log("\n📦 Compiling FHE contract...");
  
  try {
    // Get contract factory
    const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
    
    console.log("⚙️  Deploying... (this may take 30-60 seconds)");
    
    // For FHE contracts on Sepolia, we need more gas
    const auction = await PrivaBidAuction.deploy({
      gasLimit: 3000000,  // FHE needs more gas
      gasPrice: ethers.parseUnits("20", "gwei"),  // Higher gas price
    });
    
    console.log("⏳ Waiting for deployment confirmation...");
    await auction.waitForDeployment();
    
    const address = await auction.getAddress();
    console.log("\n✅ FHE Contract deployed:", address);
    console.log("📜 Etherscan: https://sepolia.etherscan.io/address/" + address);
    
    // Save address
    const fs = require('fs');
    fs.writeFileSync('fhe-contract.txt', address);
    console.log("💾 Address saved to: fhe-contract.txt");
    
    // Test basic function
    console.log("\n🧪 Testing basic functions...");
    try {
      const message = await auction.getTestMessage();
      console.log("Test message:", message);
    } catch (e) {
      console.log("Note: FHE functions might require special setup");
    }
    
    console.log("\n🎉 FHE Auction deployed successfully!");
    console.log("\n⚠️  IMPORTANT: FHE operations require:");
    console.log("   1. Frontend with FHEVM.js");
    console.log("   2. User permission grants with FHE.allow()");
    console.log("   3. Encrypted inputs from client side");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("   1. Try with even higher gas limit: --gas-limit 5000000");
    console.log("   2. Ensure you have latest @fhenixprotocol packages");
    console.log("   3. Try different RPC endpoint");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
