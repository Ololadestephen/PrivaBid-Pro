export default function EnhancedBidForm() {
  // Debug helper — paste inside the BidPage component (above return)
async function runBidDiagnostics() {
  console.log('=== Bid diagnostics start ===');
  try {
    if (!window.ethereum) {
      console.error('No window.ethereum (MetaMask) found');
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const user = account || (await provider.send('eth_requestAccounts', [])).at(0);
    console.log('account:', user);
    console.log('auctionId:', auctionId);

    if (!contract) {
      console.warn('contract is null (not initialized) — initializing now');
      const inst = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      console.log('created contract instance');
      // setContract not called here to avoid hook issues; continue with local instance
      // but continue using inst for views
      // Use inst for following calls
      await Promise.resolve(); // noop
    }

    const c = contract || new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    // 1) View data
    try {
      const bond = await c.BID_BOND();
      console.log('BID_BOND (wei):', bond.toString(), 'BID_BOND (ETH):', ethers.formatEther(bond));
    } catch (e) { console.warn('BID_BOND failed', e); }

    try {
      const info = await c.getAuctionInfo(auctionId);
      console.log('getAuctionInfo:', info);
      // print selected fields clearly
      try {
        const [owner, description, endTime, isActive, bidCount, pendingWinner, hasBids, settled, contractBond] = info;
        console.log({ owner, description, endTime: Number(endTime), isActive, bidCount: Number(bidCount), pendingWinner, hasBids, settled, contractBond: ethers.formatEther(contractBond) });
      } catch {}
    } catch (e) { console.warn('getAuctionInfo failed', e); }

    // 2) Output from encryptBid
    try {
      console.log('Calling encryptBid(0.123) -- adjust if you want another amount');
      const sample = await encryptBid(0.123);
      console.log('encryptBid result:', sample);
      if (sample) {
        // normalized lengths
        const dataHex = typeof sample.data === 'string' ? sample.data : ethers.hexlify(sample.data);
        const proofHex = typeof sample.proof === 'string' ? sample.proof : ethers.hexlify(sample.proof);
        console.log('encrypted.data (hex length):', dataHex.length, dataHex);
        console.log('encrypted.proof (hex length):', proofHex.length, proofHex);
      }
    } catch (e) { console.warn('encryptBid failed', e); }

    // 3) Simulate provider.call to capture revert reason (preflight)
    try {
      console.log('Preparing simulation...');
      const encrypted = await encryptBid(parseFloat(bidAmount));
      const dataHex = typeof encrypted.data === 'string' ? encrypted.data : ethers.hexlify(encrypted.data);
      const proofHex = typeof encrypted.proof === 'string' ? encrypted.proof : ethers.hexlify(encrypted.proof);

      // If contract expects (bytes32, bytes) we pass them; else adjust accordingly
      const iface = new ethers.Interface(CONTRACT_ABI);
      const calldata = iface.encodeFunctionData('submitEncryptedBid', [auctionId, dataHex, proofHex]);

      const bondWei = ethers.parseEther(bondAmount);
      console.log('Simulating provider.call with value (wei):', bondWei.toString());

      try {
        const res = await provider.call({
          to: CONTRACT_ADDRESS,
          from: user,
          data: calldata,
          value: bondWei
        });
        console.log('provider.call simulation returned (no revert):', res);
      } catch (callErr: any) {
        console.error('provider.call simulation threw. callErr:', callErr);
        const raw =
          callErr?.data ||
          callErr?.error?.data ||
          callErr?.reason ||
          callErr?.message ||
          null;
        console.log('call error raw:', raw);
        // Try decode common Error(string)
        if (raw && typeof raw === 'string' && raw.startsWith('0x')) {
          try {
            const selector = raw.slice(2, 10);
            const payload = '0x' + raw.slice(10);
            console.log('selector:', selector);
            if (selector === '08c379a0') {
              const abiCoder = new (ethers as any).AbiCoder();
              const decoded = abiCoder.decode(['string'], payload);
              console.log('Decoded revert reason:', decoded[0]);
            } else {
              console.log('Non-standard revert payload (first bytes):', selector);
            }
          } catch (dd) {
            console.warn('Failed to decode revert payload', dd);
          }
        }
      }
    } catch (e) {
      console.error('Simulation step failed:', e);
    }

    // 4) Try a basic submitSimpleBid simulation to confirm bond works
    try {
      const bond = await c.BID_BOND();
      console.log('Attempting simulate submitSimpleBid via provider.call...');
      const iface2 = new ethers.Interface(CONTRACT_ABI);
      const calldata2 = iface2.encodeFunctionData('submitSimpleBid', [auctionId]);
      try {
        await provider.call({ to: CONTRACT_ADDRESS, from: user, data: calldata2, value: bond });
        console.log('submitSimpleBid simulation OK (no revert).');
      } catch (simErr: any) {
        console.error('submitSimpleBid simulation revert:', simErr);
        const raw = simErr?.data || simErr?.error?.data || simErr?.message || null;
        console.log('submitSimpleBid raw:', raw);
      }
    } catch (e) { console.warn('submitSimpleBid simulation failed', e); }

    console.log('=== Bid diagnostics end ===');
  } catch (outer) {
    console.error('runBidDiagnostics outer error:', outer);
  }
}

  return (
    <div className="p-4">
      <h3>Enhanced Bid Form</h3>
      <p>Coming soon...</p>
    </div>
  );
}