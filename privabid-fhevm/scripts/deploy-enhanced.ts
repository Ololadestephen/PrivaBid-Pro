import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Enhanced PrivaBidAuction with Bid Bonds...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance for deployment");
    console.log("Get Sepolia ETH from: https://sepoliafaucet.com/");
  }
  
  // Deploy new contract
  console.log("\n📦 Deploying enhanced contract...");
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy();
  
  await auction.waitForDeployment();
  const address = await auction.getAddress();
  
  console.log("✅ Enhanced PrivaBidAuction deployed to:", address);
  console.log("\n✨ New Features:");
  console.log("   • 0.01 ETH Bid Bonds (anti-spam)");
  console.log("   • Bid withdrawal for non-winners");
  console.log("   • Enhanced bidder tracking");
  console.log("   • Settlement mechanism");
  console.log("\n🔍 View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${address}`);
  console.log("\n📋 To test:");
  console.log(`   pnpm hardhat run scripts/test-withdrawal.js --network sepolia`);
  
  return address;
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error.message);
  process.exitCode = 1;
});
