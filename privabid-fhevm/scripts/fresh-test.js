const { ethers } = require("hardhat");

async function main() {
  console.log("🆕 Fresh Test Auction");
  console.log("====================\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  // 1. Deploy fresh contract (or use existing)
  console.log("\n1. 📦 Getting contract factory...");
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  
  // Option A: Deploy new
  console.log("   Deploying fresh contract...");
  const auction = await PrivaBidAuction.deploy();
  await auction.waitForDeployment();
  
  const address = await auction.getAddress();
  console.log("   New contract:", address);
  
  // 2. Create auction with VERY short time (already ended)
  console.log("\n2. 🏷️ Creating auction that already ended...");
  
  // Get current block time
  const block = await ethers.provider.getBlock("latest");
  const now = block.timestamp;
  
  // Create auction that ended 1 hour ago (by setting endTime in past)
  // We'll do this by creating with 0 duration
  const createTx = await auction.createAuction("Instant Test", 0);
  await createTx.wait();
  console.log("   Auction #0 created (0 minute duration)");
  
  // 3. Submit bid
  console.log("\n3. 🎯 Submitting bid...");
  const bond = await auction.getBondAmount();
  const bidTx = await auction.submitSimpleBid(0, { value: bond });
  await bidTx.wait();
  console.log("   Bid submitted +", ethers.formatEther(bond), "ETH bond");
  
  // 4. End auction (should work immediately since duration was 0)
  console.log("\n4. 🔚 Ending auction...");
  const endTx = await auction.endAuction(0);
  await endTx.wait();
  console.log("   ✅ Auction ended");
  
  // 5. Settle auction
  console.log("\n5. 🤝 Settling auction...");
  const settleTx = await auction.settleAuction(0);
  await settleTx.wait();
  console.log("   ✅ Auction settled");
  
  // 6. Check withdrawal eligibility
  console.log("\n6. 🔍 Checking withdrawal...");
  const canWithdraw = await auction.canWithdraw(0, deployer.address);
  console.log("   Can withdraw:", canWithdraw);
  
  if (canWithdraw) {
    console.log("\n7. 🏧 Withdrawing bond...");
    const balanceBefore = await ethers.provider.getBalance(deployer.address);
    
    const withdrawTx = await auction.withdrawBid(0);
    const receipt = await withdrawTx.wait();
    
    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    console.log("   ✅ Bond withdrawn!");
    console.log("   Balance change:", ethers.formatEther(balanceAfter - balanceBefore), "ETH");
    console.log("   Net gain:      ", ethers.formatEther(balanceAfter - balanceBefore + gasUsed), "ETH");
  }
  
  console.log("\n🎉 FRESH TEST COMPLETED!");
  console.log("\n📝 New Contract:", address);
  console.log("📋 Update frontend with this address");
  
  // Save address
  const fs = require('fs');
  fs.writeFileSync('fresh-contract.txt', address);
  console.log("💾 Saved to: fresh-contract.txt");
}

main().catch(console.error);
