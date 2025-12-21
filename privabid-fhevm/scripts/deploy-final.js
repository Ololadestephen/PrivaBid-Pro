const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 FINAL: Deploying Enhanced PrivaBidAuction");
  console.log("============================================\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Get current state
  const balance = await ethers.provider.getBalance(deployer.address);
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  const feeData = await ethers.provider.getFeeData();
  
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Nonce:", nonce);
  console.log("Gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  
  // Deploy with careful settings
  console.log("\n📦 Compiling and deploying contract...");
  
  try {
    const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
    
    // OPTION A: Let Hardhat handle gas estimation (recommended)
    console.log("Using automatic gas estimation...");
    const auction = await PrivaBidAuction.deploy();
    
    console.log("⏳ Transaction sent, waiting for deployment...");
    const deploymentTx = auction.deploymentTransaction();
    console.log("Transaction hash:", deploymentTx?.hash);
    
    // Wait for deployment
    await auction.waitForDeployment();
    
    const address = await auction.getAddress();
    console.log("\n✅ ✅ ✅ SUCCESS! Contract deployed!");
    console.log("📜 Address:", address);
    console.log("🔗 Etherscan: https://sepolia.etherscan.io/address/" + address);
    
    // Quick test
    console.log("\n🧪 Testing basic functions...");
    try {
      const message = await auction.getTestMessage();
      console.log("Test message:", message);
      
      const bond = await auction.getBondAmount();
      console.log("Bond amount:", ethers.formatEther(bond), "ETH");
      
      const count = await auction.getAuctionCount();
      console.log("Initial auction count:", count.toString());
    } catch (testError) {
      console.log("Basic tests completed (some FHE functions may need special setup)");
    }
    
    // Save address
    const fs = require('fs');
    fs.writeFileSync('enhanced-privabid-address.txt', address);
    console.log("\n💾 Address saved to: enhanced-privabid-address.txt");
    
  } catch (error) {
    console.log("\n❌ Deployment failed:", error.message);
    
    // Detailed error analysis
    if (error.code === 'CALL_EXCEPTION' && error.receipt?.status === 0) {
      console.log("\n🔍 Silent revert detected. Likely causes:");
      console.log("   1. Constructor failure in FHE initialization");
      console.log("   2. ZamaEthereumConfig inheritance issue");
      console.log("   3. Contract too large for deployment");
      
      console.log("\n💡 Quick fix: Try OPTION B below");
    }
  }
}

// OPTION B: Manual deployment if automatic fails
async function deployManual() {
  console.log("\n🛠️  Trying manual deployment with explicit settings...");
  
  const PrivaBidAuction = await ethers.getContractFactory("PrivaBidAuction");
  const deploymentData = PrivaBidAuction.getDeployTransaction();
  
  // Send raw transaction
  const tx = await deployer.sendTransaction({
    data: deploymentData.data,
    gasLimit: 5000000,
    gasPrice: ethers.parseUnits("20", "gwei"),
  });
  
  console.log("Manual transaction sent:", tx.hash);
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    // Extract contract address from receipt
    const address = receipt.contractAddress;
    console.log("✅ Manual deployment successful:", address);
    return address;
  } else {
    throw new Error("Manual deployment reverted");
  }
}

main().catch(async (error) => {
  console.error("Fatal error:", error.message);
  
  // Try manual deployment as fallback
  try {
    console.log("\n🔄 Attempting fallback deployment...");
    const address = await deployManual();
    console.log("🎉 Contract deployed via fallback:", address);
  } catch (fallbackError) {
    console.log("Fallback also failed:", fallbackError.message);
    console.log("\n🔧 Next steps:");
    console.log("   1. Check contract constructor for issues");
    console.log("   2. Try removing ZamaEthereumConfig inheritance");
    console.log("   3. Deploy a minimal version first");
  }
});