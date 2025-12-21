const { ethers } = require("hardhat");

async function main() {
  console.log("🏁 Completing Auction Flow");
  console.log("=========================\n");
  
  const contractAddress = "0x086f045A732159d30BCd3C34b9508d0F525d6B7e";
  const auctionId = 0;
  
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = PrivaBidAuction.attach(contractAddress);
  
  // 1. Check current status
  console.log("\n1. 📊 Checking current status...");
  const info = await auction.getAuctionInfo(auctionId);
  console.log("   Active:", info[3]);
  console.log("   Settled:", info[7]);
  console.log("   End time:", new Date(Number(info[2]) * 1000));
  
  // 2. End auction if still active
  if (info[3]) {
    console.log("\n2. �� Ending auction...");
    try {
      const endTx = await auction.endAuction(auctionId);
      await endTx.wait();
      console.log("   ✅ Auction ended");
    } catch (error) {
      console.log("   ❌ Failed to end:", error.reason || error.message);
    }
  } else {
    console.log("\n2. ℹ️ Auction already ended");
  }
  
  // 3. Settle auction
  console.log("\n3. 🤝 Settling auction...");
  try {
    const settleTx = await auction.settleAuction(auctionId);
    await settleTx.wait();
    console.log("   ✅ Auction settled");
  } catch (error) {
    console.log("   ❌ Failed to settle:", error.reason || error.message);
  }
  
  // 4. Withdraw bond
  console.log("\n4. 🏧 Withdrawing bond...");
  try {
    const balanceBefore = await ethers.provider.getBalance(deployer.address);
    
    const withdrawTx = await auction.withdrawBid(auctionId);
    const receipt = await withdrawTx.wait();
    
    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    console.log("   ✅ Bond withdrawn!");
    console.log("   Balance before:", ethers.formatEther(balanceBefore), "ETH");
    console.log("   Balance after: ", ethers.formatEther(balanceAfter), "ETH");
    console.log("   Net gain:      ", ethers.formatEther(balanceAfter - balanceBefore + gasUsed), "ETH");
    console.log("   💡 Winner keeps the 0.01 ETH bond as prize!");
    
  } catch (error) {
    console.log("   ❌ Failed to withdraw:", error.reason || error.message);
  }
  
  // 5. Final status
  console.log("\n5. 📈 Final status...");
  const finalInfo = await auction.getAuctionInfo(auctionId);
  console.log("   Settled:", finalInfo[7]);
  console.log("   Contract balance:", ethers.formatEther(await auction.getContractBalance()), "ETH");
  
  console.log("\n🎉 Auction flow completed!");
}

main().catch(console.error);
