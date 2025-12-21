const { ethers } = require("hardhat");

async function main() {
  console.log("🏁 Completing Auction Flow (Fixed)");
  console.log("==================================\n");
  
  const contractAddress = "0x086f045A732159d30BCd3C34b9508d0F525d6B7e";
  const auctionId = 0;
  
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  // IMPORTANT: Use getContractFactory, not attach()
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.attach(contractAddress);
  
  // Check if we can interact
  console.log("\n1. 🔍 Testing connection...");
  try {
    const bond = await auction.getBondAmount();
    console.log("   ✅ Connected! Bond amount:", ethers.formatEther(bond), "ETH");
  } catch (error) {
    console.log("   ❌ Connection failed:", error.message);
    return;
  }
  
  // 1. Check current status
  console.log("\n2. 📊 Checking current status...");
  const info = await auction.getAuctionInfo(auctionId);
  console.log("   Active:", info[3]);
  console.log("   Settled:", info[7]);
  console.log("   End time:", new Date(Number(info[2]) * 1000));
  console.log("   Current time:", new Date());
  
  // Check if auction has ended
  const currentTime = Math.floor(Date.now() / 1000);
  const endTime = Number(info[2]);
  
  if (currentTime < endTime) {
    console.log("\n⏰ Auction not ended yet!");
    console.log("   Time remaining:", endTime - currentTime, "seconds");
    console.log("   Will end at:", new Date(endTime * 1000));
    console.log("\n💡 Wait for auction to end naturally, or create new test auction.");
    return;
  }
  
  // 2. End auction if still active
  if (info[3]) {
    console.log("\n3. 🔚 Ending auction...");
    try {
      // Try with higher gas limit
      const endTx = await auction.endAuction(auctionId, {
        gasLimit: 300000
      });
      await endTx.wait();
      console.log("   ✅ Auction ended");
    } catch (error) {
      console.log("   ❌ Failed to end:", error.reason || error.message);
      console.log("   💡 Trying alternative approach...");
      
      // Try using callStatic first to check
      try {
        await auction.callStatic.endAuction(auctionId);
        console.log("   Call static works, trying with more gas...");
      } catch (staticError) {
        console.log("   Call static also fails:", staticError.message);
      }
    }
  } else {
    console.log("\n3. ℹ️ Auction already ended");
  }
  
  // 3. Settle auction (owner only)
  console.log("\n4. 🤝 Settling auction...");
  try {
    // Check if we're the owner
    const auctionOwner = info[0];
    if (auctionOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("   ⚠️  You're not the auction owner!");
      console.log("   Owner:", auctionOwner);
      console.log("   You:  ", deployer.address);
      console.log("   💡 Only owner can settle auction");
    } else {
      const settleTx = await auction.settleAuction(auctionId, {
        gasLimit: 300000
      });
      await settleTx.wait();
      console.log("   ✅ Auction settled");
    }
  } catch (error) {
    console.log("   ❌ Failed to settle:", error.reason || error.message);
  }
  
  // 4. Check withdrawal eligibility
  console.log("\n5. 🔍 Checking withdrawal eligibility...");
  try {
    const canWithdraw = await auction.canWithdraw(auctionId, deployer.address);
    console.log("   Can withdraw:", canWithdraw);
    
    if (canWithdraw) {
      console.log("\n6. 🏧 Withdrawing bond...");
      const balanceBefore = await ethers.provider.getBalance(deployer.address);
      
      const withdrawTx = await auction.withdrawBid(auctionId, {
        gasLimit: 300000
      });
      const receipt = await withdrawTx.wait();
      
      const balanceAfter = await ethers.provider.getBalance(deployer.address);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      console.log("   ✅ Bond withdrawn!");
      console.log("   Balance before:", ethers.formatEther(balanceBefore), "ETH");
      console.log("   Balance after: ", ethers.formatEther(balanceAfter), "ETH");
      console.log("   Gas used:      ", ethers.formatEther(gasUsed), "ETH");
      console.log("   💡 Winner keeps the 0.01 ETH bond as prize!");
    } else {
      console.log("\n6. ⏳ Cannot withdraw yet");
      console.log("   Check requirements:");
      console.log("   - Auction must be ended");
      console.log("   - Auction must be settled (for winner)");
      console.log("   - Bid must not already be withdrawn");
    }
    
  } catch (error) {
    console.log("   ❌ Check failed:", error.message);
  }
  
  // Final status
  console.log("\n📈 Final status...");
  const finalInfo = await auction.getAuctionInfo(auctionId);
  console.log("   Active:", finalInfo[3]);
  console.log("   Settled:", finalInfo[7]);
  console.log("   Contract balance:", ethers.formatEther(await auction.getContractBalance()), "ETH");
  
  console.log("\n🎉 Process completed!");
  console.log("\n🔗 Contract:", contractAddress);
}

main().catch(console.error);
