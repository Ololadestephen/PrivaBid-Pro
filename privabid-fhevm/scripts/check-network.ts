import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Sepolia connection...");
  
  try {
    const provider = ethers.provider;
    const network = await provider.getNetwork();
    console.log("✅ Connected to:", network.name);
    console.log("Chain ID:", network.chainId);
    
    const [signer] = await ethers.getSigners();
    console.log("Signer address:", signer.address);
    
    const balance = await provider.getBalance(signer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.log("⚠️  WARNING: Account has 0 ETH. Get Sepolia ETH from:");
      console.log("   https://sepoliafaucet.com/");
    }
    
  } catch (error: any) {
    console.error("❌ Connection failed:", error.message);
    console.log("\n💡 Check your .env file:");
    console.log("   SEPOLIA_RPC_URL should be a valid RPC endpoint");
    console.log("   PRIVATE_KEY should be your wallet's private key");
  }
}

main();
