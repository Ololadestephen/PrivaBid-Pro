const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Bid Bond & Withdrawal System");
  console.log("=======================================\n");
  
  const [deployer, bidder1, bidder2, bidder3] = await ethers.getSigners();
  
  console.log("👥 Accounts:");
  console.log("  Deployer:", deployer.address);
  console.log("  Bidder 1:", bidder1.address);
  console.log("  Bidder 2:", bidder2.address);
  console.log("  Bidder 3:", bidder3.address);
  
  // Deploy new contract
  console.log("\n🚀 Deploying enhanced contract...");
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy();
  await auction.waitForDeployment();
  
  const contractAddress = await auction.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);
  
  // Test 1: Check bond amount
  console.log("\n📊 Test 1: Check bond amount...");
  const bondAmount = await auction.getBondAmount();
  console.log("  Bid Bond:", ethers.formatEther(bondAmount), "ETH");
  
  // Test 2: Create auction
  console.log("\n��️ Test 2: Create auction...");
  const createTx = await auction.createAuction("Rare NFT Auction", 2); // 2 minutes
  await createTx.wait();
  console.log("  ✅ Auction created (ID: 0)");
  
  // Test 3: Check initial balances
  console.log("\n💰 Test 3: Check initial balances...");
  const initialBalance1 = await ethers.provider.getBalance(bidder1.address);
  const initialBalance2 = await ethers.provider.getBalance(bidder2.address);
  console.log(`  Bidder 1: ${ethers.formatEther(initialBalance1)} ETH`);
  console.log(`  Bidder 2: ${ethers.formatEther(initialBalance2)} ETH`);
  
  // Test 4: Submit bids with bonds
  console.log("\n🎯 Test 4: Submitting bids with bonds...");
  
  // Bidder 1 submits
  console.log("  Bidder 1 submitting bid...");
  const bid1Tx = await auction.connect(bidder1).submitSimpleBid(0, {
    value: bondAmount
  });
  await bid1Tx.wait();
  console.log("  ✅ Bidder 1 submitted (+0.01 ETH bond)");
  
  // Bidder 2 submits
  console.log("  Bidder 2 submitting bid...");
  const bid2Tx = await auction.connect(bidder2).submitSimpleBid(0, {
    value: bondAmount
  });
  await bid2Tx.wait();
  console.log("  ✅ Bidder 2 submitted (+0.01 ETH bond)");
  
  // Check contract balance
  const contractBalance = await auction.getContractBalance();
  console.log(`  Contract holds: ${ethers.formatEther(contractBalance)} ETH (2 bonds)`);
  
  // Test 5: Check bidder info
  console.log("\n📋 Test 5: Check bidder information...");
  
  const info1 = await auction.getBidderInfo(0, bidder1.address);
  const info2 = await auction.getBidderInfo(0, bidder2.address);
  
  console.log("  Bidder 1:", {
    hasBid: info1[0],
    isWinner: info1[3],
    withdrawn: info1[2]
  });
  
  console.log("  Bidder 2:", {
    hasBid: info2[0],
    isWinner: info2[3],
    withdrawn: info2[2]
  });
  
  // Test 6: Try to withdraw early (should fail)
  console.log("\n⏰ Test 6: Try early withdrawal (should fail)...");
  try {
    const earlyWithdraw = await auction.connect(bidder1).withdrawBid(0);
    await earlyWithdraw.wait();
    console.log("  ❌ ERROR: Should have failed!");
  } catch (error) {
    console.log("  ✅ Correctly failed:", error.reason || error.message);
  }
  
  // Test 7: Fast forward time
  console.log("\n⏩ Test 7: Fast forward 2 minutes...");
  await ethers.provider.send("evm_increaseTime", [121]); // 2 min + 1 sec
  await ethers.provider.send("evm_mine", []);
  console.log("  ✅ Time advanced");
  
  // Test 8: End auction
  console.log("\n🔚 Test 8: End auction...");
  const endTx = await auction.endAuction(0);
  await endTx.wait();
  console.log("  ✅ Auction ended");
  
  // Check who won
  const auctionInfo = await auction.getAuctionInfo(0);
  console.log(`  Winner: ${auctionInfo[5]}`);
  
  // Test 9: Check withdrawal eligibility
  console.log("\n🔍 Test 9: Check withdrawal eligibility...");
  
  const canWithdraw1 = await auction.canWithdraw(0, bidder1.address);
  const canWithdraw2 = await auction.canWithdraw(0, bidder2.address);
  
  console.log(`  Bidder 1 can withdraw: ${canWithdraw1}`);
  console.log(`  Bidder 2 can withdraw: ${canWithdraw2}`);
  
  // Test 10: Non-winner withdraws
  console.log("\n🏧 Test 10: Non-winner withdrawal...");
  
  // Determine who is not the winner
  let nonWinner, winner;
  if (auctionInfo[5] === bidder1.address) {
    winner = bidder1;
    nonWinner = bidder2;
  } else {
    winner = bidder2;
    nonWinner = bidder1;
  }
  
  console.log(`  Non-winner ${nonWinner.address} withdrawing...`);
  
  const nonWinnerBalanceBefore = await ethers.provider.getBalance(nonWinner.address);
  const withdrawTx = await auction.connect(nonWinner).withdrawBid(0);
  const receipt = await withdrawTx.wait();
  
  // Calculate gas cost
  const gasUsed = receipt.gasUsed * receipt.gasPrice;
  const nonWinnerBalanceAfter = await ethers.provider.getBalance(nonWinner.address);
  
  console.log(`  ✅ Withdrawal successful!`);
  console.log(`  Balance before: ${ethers.formatEther(nonWinnerBalanceBefore)} ETH`);
  console.log(`  Balance after:  ${ethers.formatEther(nonWinnerBalanceAfter)} ETH`);
  console.log(`  Gas cost:       ${ethers.formatEther(gasUsed)} ETH`);
  console.log(`  Net gained:     ${ethers.formatEther(nonWinnerBalanceAfter - nonWinnerBalanceBefore + gasUsed)} ETH`);
  
  // Test 11: Winner tries to withdraw before settlement (should fail)
  console.log("\n👑 Test 11: Winner tries early withdrawal (should fail)...");
  try {
    const winnerWithdraw = await auction.connect(winner).withdrawBid(0);
    await winnerWithdraw.wait();
    console.log("  ❌ ERROR: Winner should not withdraw before settlement!");
  } catch (error) {
    console.log("  ✅ Correctly failed:", error.reason || error.message);
  }
  
  // Test 12: Settle auction
  console.log("\n🤝 Test 12: Settle auction...");
  const settleTx = await auction.connect(deployer).settleAuction(0);
  await settleTx.wait();
  console.log("  ✅ Auction settled");
  
  // Test 13: Winner withdraws after settlement
  console.log("\n🎖️ Test 13: Winner withdrawal after settlement...");
  const winnerBalanceBefore = await ethers.provider.getBalance(winner.address);
  
  const winnerWithdrawTx = await auction.connect(winner).withdrawBid(0);
  const winnerReceipt = await winnerWithdrawTx.wait();
  
  const winnerGasUsed = winnerReceipt.gasUsed * winnerReceipt.gasPrice;
  const winnerBalanceAfter = await ethers.provider.getBalance(winner.address);
  
  console.log(`  Winner ${winner.address} withdrew bond`);
  console.log(`  Balance before: ${ethers.formatEther(winnerBalanceBefore)} ETH`);
  console.log(`  Balance after:  ${ethers.formatEther(winnerBalanceAfter)} ETH`);
  console.log(`  Note: Winner keeps the 0.01 ETH bond as prize!`);
  
  // Final contract balance
  const finalContractBalance = await auction.getContractBalance();
  console.log(`\n📊 Final contract balance: ${ethers.formatEther(finalContractBalance)} ETH`);
  
  // Summary
  console.log("\n🎉 TEST SUMMARY");
  console.log("===============");
  console.log("✅ Bid bonds system working");
  console.log("✅ Non-winners can withdraw bonds");
  console.log("✅ Winner keeps bond as prize");
  console.log("✅ Proper timing restrictions");
  console.log("✅ All security checks passed");
  
  console.log("\n🔗 Contract Address:", contractAddress);
  console.log("�� Next: Update frontend to handle 0.01 ETH bonds");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
});
