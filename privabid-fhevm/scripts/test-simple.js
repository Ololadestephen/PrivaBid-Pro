const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Simplified Auction");
  console.log("=============================\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  // Get contract from file
  const fs = require('fs');
  const address = fs.readFileSync('simple-contract.txt', 'utf8').trim();
  console.log("Contract:", address);
  
  const SimpleBidAuction = await ethers.getContractFactory("SimpleBidAuction");
  const auction = SimpleBidAuction.attach(address);
  
  // 1. Create auction
  console.log("\n1. 🏷️ Creating auction...");
  await auction.createAuction("Test Auction", 1); // 1 minute
  console.log("   Auction #0 created");
  
  // 2. Submit bid
  console.log("\n2. 🎯 Submitting bid...");
  const bond = await auction.getBondAmount();
  await auction.submitSimpleBid(0, { value: bond });
  console.log("   Bid submitted +", ethers.formatEther(bond), "ETH bond");
  
  // 3. Wait (simulate)
  console.log("\n3. ⏳ Waiting for auction to end...");
  console.log("   (In real network, wait 1 minute)");
  
  // For Sepolia, we need to wait real time
  console.log("   ⚠️  On Sepolia: Wait 1 minute, then continue");
  
  // 4. Check status
  console.log("\n4. 📊 Current status:");
  const info = await auction.getAuctionInfo(0);
  console.log("   Active:", info[3]);
  console.log("   Bids:", info[4].toString());
  console.log("   Highest bidder:", info[5]);
  console.log("   Highest bid:", ethers.formatEther(info[6]), "ETH");
  
  console.log("\n📋 MANUAL STEPS:");
  console.log("1. Wait 1 minute for auction to end");
  console.log(`2. Run: await auction.endAuction(0)`);
  console.log(`3. Run: await auction.settleAuction(0)`);
  console.log(`4. Run: await auction.withdrawBid(0)`);
  console.log("\n⏰ Auction ends at:", new Date(Number(info[2]) * 1000));
}

main().catch(console.error);
