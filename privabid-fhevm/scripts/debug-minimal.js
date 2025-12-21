const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging FHEVM on Sepolia");
  console.log("=============================\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  // OPTION 1: Try original contract (without bonds)
  console.log("\n1. Testing ORIGINAL contract (no bonds)...");
  
  // First, let's check if we can deploy the original
  const OriginalAuction = await ethers.getContractFactory("PrivaBidAuction");
  
  try {
    console.log("   Deploying original...");
    const original = await OriginalAuction.deploy();
    await original.waitForDeployment();
    const origAddress = await original.getAddress();
    console.log("   ✅ Original deployed:", origAddress);
    
    // Test a simple view function
    const message = await original.getTestMessage();
    console.log("   Message:", message);
    
  } catch (error) {
    console.log("   ❌ Original deploy failed:", error.message);
  }
  
  // OPTION 2: Check network connection
  console.log("\n2. Checking network connection...");
  try {
    const block = await ethers.provider.getBlock("latest");
    console.log("   Block number:", block.number);
    console.log("   Network:", (await ethers.provider.getNetwork()).name);
    console.log("   ✅ Network connected");
  } catch (error) {
    console.log("   ❌ Network error:", error.message);
  }
  
  // OPTION 3: Try with different gas settings
  console.log("\n3. Testing with manual gas...");
  const EnhancedAuction = await ethers.getContractFactory("PrivaBidAuction");
  
  try {
    console.log("   Deploying with fixed gas...");
    const enhanced = await EnhancedAuction.deploy({
      gasLimit: 5000000  // Higher gas limit
    });
    await enhanced.waitForDeployment();
    const enhAddress = await enhanced.getAddress();
    console.log("   ✅ Enhanced deployed:", enhAddress);
    
    // Try view function
    const bond = await enhanced.getBondAmount();
    console.log("   Bond:", ethers.formatEther(bond), "ETH");
    
  } catch (error) {
    console.log("   ❌ Enhanced deploy failed:", error.message);
    console.log("   Error details:", error);
  }
  
  // OPTION 4: Check if it's a constructor issue
  console.log("\n4. Testing constructor issue...");
  
  // Create a version without constructor FHE operations
  const fs = require('fs');
  const contractCode = fs.readFileSync('contracts/PrivaBidAuction.sol', 'utf8');
  
  if (contractCode.includes('FHE.asEuint32(0)')) {
    console.log("   ⚠️ Contract uses FHE.asEuint32() - might be issue");
  }
  
  console.log("\n🎯 Debug complete!");
}

main().catch(console.error);
