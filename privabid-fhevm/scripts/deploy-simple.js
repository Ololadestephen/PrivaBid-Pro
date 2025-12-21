const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Simplified Auction (No FHE)");
  console.log("=======================================\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Deploy SIMPLIFIED version (no FHE)
  const SimpleBidAuction = await ethers.getContractFactory("SimpleBidAuction");
  const auction = await SimpleBidAuction.deploy();
  await auction.waitForDeployment();
  
  const address = await auction.getAddress();
  console.log("✅ Contract deployed:", address);
  console.log("�� Etherscan: https://sepolia.etherscan.io/address/" + address);
  
  // Test basic functions
  console.log("\n🧪 Quick test...");
  const bond = await auction.getBondAmount();
  console.log("Bond amount:", ethers.formatEther(bond), "ETH");
  
  const message = await auction.getTestMessage();
  console.log("Message:", message);
  
  // Save address
  const fs = require('fs');
  fs.writeFileSync('simple-contract.txt', address);
  console.log("\n💾 Address saved to: simple-contract.txt");
  
  console.log("\n🎉 Ready for testing!");
  console.log("\n📋 To test:");
  console.log("   pnpm hardhat run scripts/test-simple.js --network sepolia");
}

main().catch(console.error);
