const hre = require("hardhat");

async function main() {
  console.log("Testing PrivaBid Auction...");
  
  // Deploy contract
  const PrivaBidAuction = await hre.ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy();
  await auction.waitForDeployment();
  
  console.log("Contract deployed to:", await auction.getAddress());
  
  // Test creating an auction
  const tx = await auction.createAuction("Test Item", 60); // 60 minutes
  await tx.wait();
  console.log("✅ Auction created");
  
  // Get auction info
  const info = await auction.getAuctionInfo(0);
  console.log("Auction Owner:", info[0]);
  console.log("Description:", info[1]);
  console.log("Active:", info[3]);
  console.log("Total Bids:", info[4]);
  
  console.log("\n✅ Basic auction functions work!");
  console.log("Next: Integrate with @fhevm/sdk for encrypted bid tests");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
