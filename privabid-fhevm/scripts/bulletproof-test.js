const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Bulletproof Withdrawal Test");
  console.log("==============================\n");
  
  try {
    // SAFE: Get only the first signer
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    
    console.log("✅ Using account:", deployer.address);
    
    // 1. Deploy contract
    console.log("\n1. 📦 Deploying contract...");
    const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
    const auction = await PrivaBidAuction.deploy();
    await auction.waitForDeployment();
    
    const contractAddress = await auction.getAddress();
    console.log("   Contract:", contractAddress);
    
    // 2. Check bond
    console.log("\n2. 💰 Checking bond...");
    const bond = await auction.getBondAmount();
    console.log("   Bond amount:", ethers.formatEther(bond), "ETH");
    
    // 3. Create auction
    console.log("\n3. 🏷️ Creating auction...");
    const createTx = await auction.createAuction("Test Auction", 1); // 1 minute
    await createTx.wait();
    console.log("   Auction created (ID: 0)");
    
    // 4. Submit bid (deployer bids on own auction)
    console.log("\n4. 🎯 Submitting bid...");
    const bidTx = await auction.submitSimpleBid(0, {
      value: bond
    });
    await bidTx.wait();
    console.log("   Bid submitted +0.01 ETH bond");
    
    // 5. Check contract balance
    const contractBalance = await auction.getContractBalance();
    console.log("   Contract holds:", ethers.formatEther(contractBalance), "ETH");
    
    // 6. Check bidder info
    console.log("\n5. 📋 Checking bidder info...");
    const bidderInfo = await auction.getBidderInfo(0, deployer.address);
    console.log("   Has bid:", bidderInfo[0]);
    console.log("   Is winner:", bidderInfo[3]);
    console.log("   Withdrawn:", bidderInfo[2]);
    
    // 7. Fast forward time
    console.log("\n6. ⏩ Fast forwarding 61 seconds...");
    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);
    
    // 8. End auction
    console.log("\n7. 🔚 Ending auction...");
    const endTx = await auction.endAuction(0);
    await endTx.wait();
    console.log("   Auction ended");
    
    // 9. Check withdrawal eligibility
    console.log("\n8. 🔍 Checking withdrawal eligibility...");
    const canWithdraw = await auction.canWithdraw(0, deployer.address);
    console.log("   Can withdraw:", canWithdraw);
    
    if (!canWithdraw) {
      console.log("   ℹ️  Cannot withdraw yet (winner needs settlement)");
    }
    
    // 10. Settle auction
    console.log("\n9. 🤝 Settling auction...");
    const settleTx = await auction.settleAuction(0);
    await settleTx.wait();
    console.log("   Auction settled");
    
    // 11. Check again
    const canWithdrawNow = await auction.canWithdraw(0, deployer.address);
    console.log("   Can withdraw after settlement:", canWithdrawNow);
    
    if (canWithdrawNow) {
      console.log("\n10. 🏧 Withdrawing bond...");
      const balanceBefore = await ethers.provider.getBalance(deployer.address);
      
      const withdrawTx = await auction.withdrawBid(0);
      const receipt = await withdrawTx.wait();
      
      const balanceAfter = await ethers.provider.getBalance(deployer.address);
      
      console.log("   ✅ Bond withdrawn!");
      console.log("   Balance before:", ethers.formatEther(balanceBefore), "ETH");
      console.log("   Balance after: ", ethers.formatEther(balanceAfter), "ETH");
      console.log("   Winner keeps the 0.01 ETH bond as prize!");
    }
    
    // 12. Final check
    console.log("\n11. 📊 Final status...");
    const finalInfo = await auction.getAuctionInfo(0);
    console.log("   Auction settled:", finalInfo[7]);
    console.log("   Contract balance:", ethers.formatEther(await auction.getContractBalance()), "ETH");
    
    console.log("\n🎉 TEST COMPLETED SUCCESSFULLY!");
    console.log("\n📝 Contract Address:", contractAddress);
    console.log("📋 Update your frontend with this address");
    
    // Save address
    const fs = require('fs');
    fs.writeFileSync('latest-contract.txt', contractAddress);
    console.log("\n💾 Saved to: latest-contract.txt");
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    process.exitCode = 1;
  }
}

main();
