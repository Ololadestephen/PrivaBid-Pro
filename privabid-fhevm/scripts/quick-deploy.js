const { ethers } = require("hardhat");

async function main() {
  console.log("Quick deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy();
  
  await auction.waitForDeployment();
  const address = await auction.getAddress();
  
  console.log("\n✅ Contract deployed:", address);
  console.log("\nTo test:");
  console.log(`pnpm hardhat run scripts/simple-withdrawal-test.js --network sepolia`);
  
  // Save address
  const fs = require('fs');
  fs.writeFileSync('new-contract-address.txt', address);
  console.log("\n📝 Address saved to: new-contract-address.txt");
}

main().catch(console.error);
