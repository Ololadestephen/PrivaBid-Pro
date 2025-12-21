const { getInstance, getTokenSignature } = require('@fhevm/sdk');
const { ethers } = require('hardhat');

async function submitRealEncryptedBid() {
  const [signer] = await ethers.getSigners();
  const contractAddress = "YOUR_DEPLOYED_CONTRACT";
  
  // 1. Initialize FHEVM
  const instance = await getInstance();
  
  // 2. Encrypt bid amount
  const encryptedBid = instance.encrypt32(100); // 100 ETH equivalent
  
  // 3. Get token signature
  const signature = await getTokenSignature({
    verifyingContract: contractAddress,
    signer
  });
  
  // 4. Generate proof
  const token = instance.generateToken({
    publicKey: encryptedBid.publicKey,
    signature
  });
  
  console.log("Encrypted bid ready for contract submission");
  console.log("Use token.euint32 and token.proof in submitEncryptedBid()");
}
