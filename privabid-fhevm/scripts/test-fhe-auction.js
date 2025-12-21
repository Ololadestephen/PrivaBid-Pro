const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Testing PrivaBid Auction Contract...");
  
  try {
    // Get signers
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    
    console.log("Testing with deployer:", deployer.address);
    console.log("Contract address: 0x543b6Be18c0191108b7B8c3a8aB381950527b16a");
    
    // Get contract instance
    const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
    const auction = PrivaBidAuction.attach("0x543b6Be18c0191108b7B8c3a8aB381950527b16a");
    
    console.log("\n📊 Test 1: Get contract info...");
    
    // Test getAuctionCount
    const count = await auction.getAuctionCount();
    console.log("✅ Total auctions:", count.toString());
    
    // Test getTestMessage
    const message = await auction.getTestMessage();
    console.log("✅ Contract message:", message);
    
    if (count > 0) {
      console.log("\n📋 Test 2: Check existing auctions...");
      for (let i = 0; i < Math.min(count, 3); i++) {
        const info = await auction.getAuctionInfo(i);
        console.log(`Auction #${i}: ${info[1]} (Active: ${info[3]}, Bids: ${info[4]})`);
      }
    }
    
    console.log("\n🎉 Basic contract tests passed!");
    console.log("\n💡 To interact with the contract:");
    console.log("1. Open frontend/index.html");
    console.log("2. Connect MetaMask to Sepolia");
    console.log("3. Try creating an auction");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("- Make sure you're connected to Sepolia network");
    console.log("- Check if contract is deployed at the address");
    console.log("- Verify you have Sepolia ETH for gas");
  }
}

main();