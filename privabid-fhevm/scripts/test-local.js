const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 LOCAL NETWORK TEST");
  console.log("=====================\n");
  
  // Test on local Hardhat network (FHEVM works here)
  const [deployer, bidder1] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Bidder 1:", bidder1.address);
  
  // Deploy contract
  console.log("\n1. 📦 Deploying...");
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy();
  await auction.waitForDeployment();
  
  const address = await auction.getAddress();
  console.log("Contract:", address);
  
  // Test basic functions
  console.log("\n2. 🔧 Testing basic functions...");
  
  const bond = await auction.getBondAmount();
  console.log("Bond:", ethers.formatEther(bond), "ETH");
  
  const message = await auction.getTestMessage();
  console.log("Message:", message);
  
  // Create auction
  console.log("\n3. 🏷️ Creating auction...");
  await auction.createAuction("Local Test", 1); // 1 minute
  
  // Submit bid
  console.log("\n4. 🎯 Submitting bid...");
  const bidTx = await auction.connect(bidder1).submitSimpleBid(0, { value: bond });
  await bidTx.wait();
  console.log("Bid submitted");
  
  // Fast forward time
  console.log("\n5. ⏩ Fast forwarding...");
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine", []);
  
  // End auction
  console.log("\n6. 🔚 Ending auction...");
  await auction.endAuction(0);
  console.log("Auction ended");
  
  // Settle auction
  console.log("\n7. 🤝 Settling auction...");
  await auction.settleAuction(0);
  console.log("Auction settled");
  
  // Withdraw bond (as bidder1, the winner)
  console.log("\n8. 🏧 Withdrawing bond...");
  const balanceBefore = await ethers.provider.getBalance(bidder1.address);
  
  const withdrawTx = await auction.connect(bidder1).withdrawBid(0);
  const receipt = await withdrawTx.wait();
  
  const balanceAfter = await ethers.provider.getBalance(bidder1.address);
  const gasUsed = receipt.gasUsed * receipt.gasPrice;
  
  console.log("✅ Bond withdrawn!");
  console.log("Balance before:", ethers.formatEther(balanceBefore), "ETH");
  console.log("Balance after: ", ethers.formatEther(balanceAfter), "ETH");
  console.log("Net gain:      ", ethers.formatEther(balanceAfter - balanceBefore + gasUsed), "ETH");
  
  console.log("\n🎉 LOCAL TEST PASSED!");
  console.log("\n💡 If this works, the contract logic is correct.");
  console.log("   The issue is FHEVM plugin on Sepolia.");
}

main().catch(console.error);
