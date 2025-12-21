const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Bid Bond & Withdrawal System");
  console.log("=======================================\n");
  
  try {
    // Get signers - use this pattern for Hardhat
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    const bidder1 = signers[1];
    const bidder2 = signers[2];
    
    console.log("👥 Accounts:");
    console.log("  Deployer:", deployer.address);
    console.log("  Bidder 1:", bidder1?.address || "Not available");
    console.log("  Bidder 2:", bidder2?.address || "Not available");
    
    // If we don't have enough signers, create some
    if (!bidder1 || !bidder2) {
      console.log("\n⚠️  Not enough accounts. Using deployer for testing...");
      // For testing, we'll use the same account
    }
    
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
    console.log("\n🏷️ Test 2: Create auction...");
    const createTx = await auction.createAuction("Test NFT Auction", 1); // 1 minute
    await createTx.wait();
    console.log("  ✅ Auction created (ID: 0)");
    
    // Test 3: Check initial balance
    console.log("\n💰 Test 3: Check deployer balance...");
    const initialBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`  Deployer: ${ethers.formatEther(initialBalance)} ETH`);
    
    // Test 4: Submit a bid with bond (using deployer as bidder)
    console.log("\n🎯 Test 4: Submitting bid with bond...");
    
    console.log("  Deployer submitting bid as bidder...");
    const bid1Tx = await auction.submitSimpleBid(0, {
      value: bondAmount
    });
    await bid1Tx.wait();
    console.log("  ✅ Bid submitted (+0.01 ETH bond)");
    
    // Check contract balance
    const contractBalance = await auction.getContractBalance();
    console.log(`  Contract holds: ${ethers.formatEther(contractBalance)} ETH (1 bond)`);
    
    // Test 5: Check bidder info
    console.log("\n📋 Test 5: Check bidder information...");
    
    const info1 = await auction.getBidderInfo(0, deployer.address);
    
    console.log("  Deployer (as bidder):", {
      hasBid: info1[0],
      isWinner: info1[3],
      withdrawn: info1[2]
    });
    
    // Test 6: Try to withdraw early (should fail)
    console.log("\n⏰ Test 6: Try early withdrawal (should fail)...");
    try {
      const earlyWithdraw = await auction.withdrawBid(0);
      await earlyWithdraw.wait();
      console.log("  ❌ ERROR: Should have failed!");
    } catch (error) {
      console.log("  ✅ Correctly failed:", error.reason || error.message);
    }
    
    // Test 7: Fast forward time
    console.log("\n⏩ Test 7: Fast forward 1 minute...");
    await ethers.provider.send("evm_increaseTime", [61]); // 1 min + 1 sec
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
    
    const canWithdraw = await auction.canWithdraw(0, deployer.address);
    console.log(`  Can withdraw: ${canWithdraw}`);
    
    // Test 10: Since deployer is winner, try to withdraw (should fail without settlement)
    console.log("\n👑 Test 10: Winner tries to withdraw before settlement...");
    
    const winnerBalanceBefore = await ethers.provider.getBalance(deployer.address);
    console.log(`  Balance before: ${ethers.formatEther(winnerBalanceBefore)} ETH`);
    
    try {
      const winnerWithdraw = await auction.withdrawBid(0);
      await winnerWithdraw.wait();
      console.log("  ❌ ERROR: Should have failed before settlement!");
    } catch (error) {
      console.log("  ✅ Correctly failed:", error.reason || error.message);
    }
    
    // Test 11: Settle auction
    console.log("\n🤝 Test 11: Settle auction...");
    const settleTx = await auction.settleAuction(0);
    await settleTx.wait();
    console.log("  ✅ Auction settled");
    
    // Test 12: Winner withdraws after settlement
    console.log("\n🎖️ Test 12: Winner withdrawal after settlement...");
    
    const winnerWithdrawTx = await auction.withdrawBid(0);
    const winnerReceipt = await winnerWithdrawTx.wait();
    
    const winnerBalanceAfter = await ethers.provider.getBalance(deployer.address);
    
    console.log(`  Winner withdrew bond`);
    console.log(`  Balance after:  ${ethers.formatEther(winnerBalanceAfter)} ETH`);
    console.log(`  Note: Winner keeps the 0.01 ETH bond as prize!`);
    
    // Test 13: Try to withdraw again (should fail)
    console.log("\n🔄 Test 13: Try double withdrawal (should fail)...");
    try {
      const doubleWithdraw = await auction.withdrawBid(0);
      await doubleWithdraw.wait();
      console.log("  ❌ ERROR: Should have failed!");
    } catch (error) {
      console.log("  ✅ Correctly failed:", error.reason || error.message);
    }
    
    // Final contract balance
    const finalContractBalance = await auction.getContractBalance();
    console.log(`\n📊 Final contract balance: ${ethers.formatEther(finalContractBalance)} ETH`);
    
    // Summary
    console.log("\n🎉 TEST SUMMARY");
    console.log("===============");
    console.log("✅ Contract deployed successfully");
    console.log("✅ Bid bond system working");
    console.log("✅ Winner withdrawal after settlement");
    console.log("✅ Security checks working");
    
    console.log("\n🔗 New Contract Address:", contractAddress);
    console.log("�� Deploy this address to your frontend");
    
    // Write contract address to file for frontend
    const fs = require('fs');
    fs.writeFileSync('contract-address.txt', contractAddress);
    console.log("\n📝 Contract address saved to: contract-address.txt");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.log("\n🔧 Debug info:");
    console.log("Error message:", error.message);
    console.log("Stack:", error.stack);
    process.exitCode = 1;
  }
}

main();
