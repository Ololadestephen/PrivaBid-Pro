import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying PrivaBidAuction to Sepolia...");
  
  // Check if we have a provider
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "ETH");
  
  // Deploy contract
  console.log("\n📦 Deploying contract...");
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const auction = await PrivaBidAuction.deploy();
  
  await auction.waitForDeployment();
  const address = await auction.getAddress();
  
  console.log("✅ PrivaBidAuction deployed to:", address);
  console.log("\n📋 Contract features:");
  console.log("   • Encrypted bid storage (euint32)");
  console.log("   • FHE comparison operations");
  console.log("   • Private auction management");
  console.log("\n🔍 View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${address}`);
  
  return address;
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error.message);
  console.log("\n💡 Troubleshooting:");
  console.log("   1. Check .env file has correct RPC URL and PRIVATE_KEY");
  console.log("   2. Ensure you have Sepolia ETH for gas");
  console.log("   3. Verify RPC endpoint is accessible");
  process.exitCode = 1;
});
