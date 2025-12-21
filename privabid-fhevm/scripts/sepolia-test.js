const { ethers } = require("hardhat");

async function main() {
  console.log("🌐 Sepolia Network Test");
  console.log("=====================\n");
  
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Account:", deployer.address);
    
    // 1. Deploy contract
    console.log("\n1. 📦 Deploying contract...");
    const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
    const auction = await PrivaBidAuction.deploy();
    await auction.waitForDeployment();
    
    const contractAddress = await auction.getAddress();
    console.log("   Contract:", contractAddress);
    console.log("   Etherscan: https://sepolia.etherscan.io/address/" + contractAddress);
    
    // 2. Check bond
    console.log("\n2. 💰 Checking bond...");
    const bond = await auction.getBondAmount();
    console.log("   Bond amount:", ethers.formatEther(bond), "ETH");
    
    // 3. Create LONG auction (1 hour for testing)
    console.log("\n3. 🏷️ Creating auction (1 hour)...");
    const createTx = await auction.createAuction("Sepolia Test Auction", 60); // 60 minutes
    await createTx.wait();
    console.log("   Auction created (ID: 0)");
    
    // 4. Submit bid
    console.log("\n4. 🎯 Submitting bid...");
    const bidTx = await auction.submitSimpleBid(0, {
      value: bond
    });
    await bidTx.wait();
    console.log("   ✅ Bid submitted +0.01 ETH bond");
    
    // 5. Check status
    console.log("\n5. 📊 Checking status...");
    const info = await auction.getAuctionInfo(0);
    console.log("   Description:", info[1]);
    console.log("   Active:", info[3]);
    console.log("   Bids:", info[4].toString());
    console.log("   Winner:", info[5]);
    console.log("   Bond amount:", ethers.formatEther(info[8]), "ETH");
    
    const bidderInfo = await auction.getBidderInfo(0, deployer.address);
    console.log("   Your bid status:");
    console.log("     - Has bid:", bidderInfo[0]);
    console.log("     - Is winner:", bidderInfo[3]);
    console.log("     - Can withdraw:", await auction.canWithdraw(0, deployer.address));
    
    // 6. Check contract balance
    const contractBalance = await auction.getContractBalance();
    console.log("   Contract holds:", ethers.formatEther(contractBalance), "ETH");
    
    console.log("\n📋 MANUAL TESTING INSTRUCTIONS:");
    console.log("================================");
    console.log("1. WAIT for auction to end (1 hour from now)");
    console.log("2. Then call: await auction.endAuction(0)");
    console.log("3. Then call: await auction.settleAuction(0)");
    console.log("4. Then call: await auction.withdrawBid(0)");
    console.log("\n⏰ Auction end time:", new Date(Number(info[2]) * 1000));
    
    // Save contract info
    const fs = require('fs');
    const contractInfo = {
      address: contractAddress,
      auctionId: 0,
      bond: ethers.formatEther(bond),
      endTime: Number(info[2]),
      endTimeReadable: new Date(Number(info[2]) * 1000).toISOString(),
      deployer: deployer.address
    };
    
    fs.writeFileSync('sepolia-contract.json', JSON.stringify(contractInfo, null, 2));
    console.log("\n💾 Contract info saved to: sepolia-contract.json");
    
    console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("\n🔗 Next steps:");
    console.log("   1. Update frontend with new contract address");
    console.log("   2. Wait for auction to end");
    console.log("   3. Complete the withdrawal flow");
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    process.exitCode = 1;
  }
}

main();
