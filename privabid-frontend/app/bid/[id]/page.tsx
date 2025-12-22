
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FaClock, FaEthereum, FaUsers, FaLock, FaCheck, FaExclamationTriangle, FaSpinner, FaPlus, FaMoneyBillWave
} from 'react-icons/fa';
import { initializeFhevm, encryptBid, generateToken } from '../../../../lib/fhevm';


const CONTRACT_ABI = [
  'function getTestMessage() view returns (string)',
  'function BID_BOND() view returns (uint256)',
  'function nextAuctionId() view returns (uint256)',
  'function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)',
  'function submitSimpleBid(uint256 auctionId) payable',
  'function submitEncryptedBid(uint256 auctionId, bytes encryptedAmount, bytes inputProof) payable',
  'function createAuction(string description, uint256 durationMinutes) returns (uint256)',
  'function withdrawBid(uint256 auctionId)',
  'function canWithdrawAdvanced(uint256 auctionId, address bidder) view returns (bool)',
  'function isHighestBidder(uint256 auctionId, address bidder) view returns (bool)'
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

export default function BidPage() {
  const params = useParams();
  const auctionId = Number(params.id);

  const [auction, setAuction] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('0.02');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [bondAmount, setBondAmount] = useState('0.01');
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);
  const [hasAlreadyBid, setHasAlreadyBid] = useState<boolean>(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [newAuctionDesc, setNewAuctionDesc] = useState('');
  const [newAuctionDuration, setNewAuctionDuration] = useState('60');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (auctionId) initializeConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  async function initializeConnection() {
    try {
      if (!window.ethereum) throw new Error('Please install MetaMask');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      setContract(contractInstance);

      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setWalletConnected(true);
        await checkBidStatus(contractInstance, accounts[0]);
      }

      await fetchAuctionDetails(contractInstance);
    } catch (err) {
      console.error('Init error:', err);
      setError('Initialization failed. Refresh.');
    }
  }

  async function checkBidStatus(contractInstance: any, userAddress: string) {
    try {
      const bond = await contractInstance.BID_BOND();
      try {
        await contractInstance.submitSimpleBid.estimateGas(auctionId, { value: bond, from: userAddress });
        setHasAlreadyBid(false);
      } catch (estimateError: any) {
        const msg = (estimateError?.error?.message || estimateError?.message || '').toString();
        if (msg.includes('Already bid')) setHasAlreadyBid(true);
      }
    } catch (err) { console.warn('checkBidStatus failed', err); }
  }

  async function fetchAuctionDetails(contractInstance: any) {
    try {
      setLoading(true);
      const bond = await contractInstance.BID_BOND();
      setBondAmount(ethers.formatEther(bond));

      const info = await contractInstance.getAuctionInfo(auctionId);
      const [owner, description, endTime, isActive, bidCount, pendingWinner, hasBids, settled, contractBond] = info;
      const [title, ...descParts] = description.split(' | ');
      const cleanDescription = descParts.join(' | ') || 'Private auction';

      setAuction({
        id: auctionId,
        title: title || `Auction #${auctionId}`,
        description: cleanDescription,
        endTime: new Date(Number(endTime) * 1000),
        isActive: Boolean(isActive),
        bidCount: Number(bidCount),
        owner,
        pendingWinner,
        hasBids: Boolean(hasBids),
        settled: Boolean(settled),
        bondAmount: ethers.formatEther(contractBond)
      });
    } catch (err: any) {
      console.error('fetchAuctionDetails error', err);
      setAuction({ id: auctionId, title: `Auction #${auctionId}`, description: 'Private auction', endTime: new Date(Date.now() + 86400000), isActive: true, bidCount: 0, bondAmount: '0.01' });
    } finally { setLoading(false); }
  }

  function decodeRevertData(raw: any) {
    try {
      if (!raw) return null;
      const hex = (typeof raw === 'string' ? raw : (raw?.data ?? raw?.error?.data ?? null));
      if (!hex) return null;
      const h = hex.startsWith('0x') ? hex.slice(2) : hex;
      const selector = h.slice(0, 8);
      const payload = '0x' + h.slice(8);
      if (selector === '08c379a0') {
        const abiCoder = new (ethers as any).AbiCoder();
        const decoded = abiCoder.decode(['string'], payload);
        return decoded[0];
      }
      return null;
    } catch (e) { return null; }
  }

  function normalizeEncrypted(encrypted: any) {
    if (!encrypted) return null;
    if (typeof encrypted === 'object' && (encrypted.data || encrypted.ciphertext || encrypted.ct)) {
      const data = encrypted.data ?? encrypted.ciphertext ?? encrypted.ct;
      const proof = encrypted.proof ?? encrypted.inputProof ?? '0x';
      const dataHex = typeof data === 'string' ? (data.startsWith('0x') ? data : '0x' + data) : ethers.hexlify(data);
      const proofHex = typeof proof === 'string' ? (proof.startsWith('0x') ? proof : '0x' + proof) : ethers.hexlify(proof);
      let enc32 = dataHex;
      if (enc32.length < 66) enc32 = ethers.hexZeroPad(enc32, 32);
      return { enc32, proof: proofHex };
    }
    if (typeof encrypted === 'string' || encrypted instanceof Uint8Array) {
      const hex = typeof encrypted === 'string' ? (encrypted.startsWith('0x') ? encrypted : '0x' + encrypted) : ethers.hexlify(encrypted);
      let enc32 = hex;
      if (enc32.length < 66) enc32 = ethers.hexZeroPad(enc32, 32);
      return { enc32, proof: '0x' };
    }
    return null;
  }

  async function submitBid() {
    if (!walletConnected || !contract) { await initializeConnection(); return; }
    if (hasAlreadyBid) { setError('You already bid'); return; }

    setIsSubmitting(true); setStatus('Preparing bid...'); setError('');

    try {
      const amount = parseFloat(bidAmount);
      if (isNaN(amount) || amount <= 0) throw new Error('Invalid bid amount');
      if (!window.ethereum) throw new Error('Install MetaMask');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      const bondWei = ethers.parseEther(bondAmount);

      // Initialize FHE SDK (best-effort)
      setStatus('Initializing FHE...');
      try {
        await initializeFhevm(provider);
      } catch (initErr) {
        console.warn('FHE init failed, will fall back to simple bid:', initErr);
      }

      // Try encrypted path
      let enc32: string | null = null;
      let proofHex = '0x';
      try {
        setStatus('Encrypting bid...');
        // generate token (if SDK expects it) — non-fatal
        try { await generateToken(provider, account); } catch (tErr) { console.warn('token gen warning', tErr); }

        const encryptedOutput = await encryptBid(amount);
        const normalized = normalizeEncrypted(encryptedOutput);
        if (normalized && normalized.enc32) {
          enc32 = normalized.enc32; proofHex = normalized.proof ?? '0x';
        } else {
          console.warn('normalizeEncrypted returned null — falling back');
          enc32 = null;
        }
      } catch (encErr) {
        console.warn('Encryption failed; will fall back to simple bid', encErr);
        enc32 = null;
      }

      // If we have enc32 + proof -> try submitEncryptedBid
      if (enc32) {
        setStatus('Simulating encrypted tx...');
        const iface = new ethers.Interface(CONTRACT_ABI);
        const callData = iface.encodeFunctionData('submitEncryptedBid', [auctionId, enc32, proofHex]);
        try {
          await provider.call({ to: CONTRACT_ADDRESS, from: account, data: callData, value: bondWei });
        } catch (callErr: any) {
          const decoded = decodeRevertData(callErr?.data || callErr?.error?.data);
          const msg = decoded || callErr?.message || String(callErr);
          setError(`Preflight failed: ${msg}`); setStatus(''); setIsSubmitting(false); return;
        }

        setStatus('Estimating gas...');
        try {
          await contractWithSigner.estimateGas.submitEncryptedBid(auctionId, enc32, proofHex, { value: bondWei });
        } catch (gErr: any) {
          const decoded = decodeRevertData(gErr?.error?.data || gErr?.data);
          setError(`Gas estimate failed: ${decoded || gErr?.message || String(gErr)}`); setStatus(''); setIsSubmitting(false); return;
        }

        setStatus('Submitting encrypted bid...');
        const tx = await contractWithSigner.submitEncryptedBid(auctionId, enc32, proofHex, { value: bondWei, gasLimit: 700000 });
        setStatus('Waiting for confirmation...');
        const receipt = await tx.wait();
        if (receipt?.status === 1) {
          setStatus('✅ Encrypted bid submitted'); setHasAlreadyBid(true); await fetchAuctionDetails(contract); setTimeout(() => setStatus(''), 4000); return;
        } else {
          setError('Encrypted tx reverted'); setStatus(''); return;
        }
      }

      // Fallback: submitSimpleBid — some contracts expect msg.value == BID_BOND (not bid + bond)
      setStatus('Submitting simple bid (fallback)...');
      try {
        const tx = await contractWithSigner.submitSimpleBid(auctionId, { value: bondWei, gasLimit: 200000 });
        setStatus('Waiting for confirmation...');
        const receipt = await tx.wait();
        if (receipt?.status === 1) {
          setStatus('✅ Simple bid submitted'); setHasAlreadyBid(true); await fetchAuctionDetails(contract); setTimeout(() => setStatus(''), 3000); return;
        } else {
          throw new Error('Simple bid reverted');
        }
      } catch (fallbackErr: any) {
        const decoded = decodeRevertData(fallbackErr?.data || fallbackErr?.error?.data);
        setError(`Fallback failed: ${decoded || fallbackErr?.message || String(fallbackErr)}`); setStatus('');
      }

    } catch (outerErr: any) {
      console.error('submitBid outerErr', outerErr);
      setError(outerErr?.message || String(outerErr) || 'Unknown error'); setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function withdrawBond() {
    try {
      setWithdrawing(true); setStatus('Withdrawing...'); setError('');
      if (!window.ethereum) throw new Error('Install MetaMask');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractSigned = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contractSigned.withdrawBid(auctionId, { gasLimit: 150000 });
      const receipt = await tx.wait();
      if (receipt?.status === 1) { setStatus('✅ Bond withdrawn'); await fetchAuctionDetails(contract); }
      else throw new Error('Withdrawal reverted');
    } catch (err: any) { console.error('withdraw error', err); setError(err?.message || String(err)); setStatus(''); }
    finally { setWithdrawing(false); }
  }

  if (loading) return (<div className="container mx-auto px-4 py-16 text-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-purple mb-4 mx-auto"></div><p className="text-gray-400">Loading auction details...</p></div>);

  const timeRemaining = auction.endTime - new Date();
  const isEnded = timeRemaining <= 0;
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));
  const isOwner = account?.toLowerCase() === auction?.owner?.toLowerCase();
  const canWithdraw = isEnded && !auction.isActive && !isOwner && !hasAlreadyBid;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6"><a href="/auctions" className="text-electric-purple hover:underline">← Back to Auctions</a></div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/30 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{auction.title}</h1>
                <p className="text-gray-300">{auction.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-lg ${auction.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{auction.isActive ? 'Active' : 'Ended'}</div>
                <div className="px-3 py-1 bg-electric-purple/20 text-electric-purple rounded-lg">#{auction.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1"><FaClock className="mr-2" /><span className="text-sm">Time</span></div>
                <div className="text-xl font-bold">{isEnded ? 'Ended' : `${hoursRemaining}h ${minutesRemaining}m`}</div>
              </div>

              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1"><FaEthereum className="mr-2" /><span className="text-sm">Bids</span></div>
                <div className="text-xl font-bold">{auction.bidCount}</div>
              </div>

              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1"><FaLock className="mr-2" /><span className="text-sm">Bond</span></div>
                <div className="text-xl font-bold">{bondAmount} ETH</div>
              </div>

              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1"><FaUsers className="mr-2" /><span className="text-sm">Your Status</span></div>
                <div className={`text-xl font-bold ${hasAlreadyBid ? 'text-green-400' : 'text-yellow-400'}`}>{hasAlreadyBid ? 'Bid Placed' : 'Can Bid'}</div>
              </div>
            </div>

          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/30 p-6 sticky top-6">
            <h2 className="text-2xl font-bold mb-6">Place Bid</h2>

            <div className="space-y-4">

              <div className={`p-3 rounded-lg ${hasAlreadyBid ? 'bg-yellow-900/30 border border-yellow-500/30' : 'bg-green-900/30 border border-green-500/30'}`}>
                <div className="flex items-center gap-2">
                  {hasAlreadyBid ? (<><FaExclamationTriangle className="text-yellow-500" /><span className="text-yellow-400 font-medium">Already Bid</span></>) : (<><FaCheck className="text-green-500" /><span className="text-green-400 font-medium">Ready to Bid</span></>)}
                </div>
                <p className="text-sm mt-1">{hasAlreadyBid ? 'You can only bid once per auction.' : 'You can place a bid on this auction.'}</p>
              </div>

              <div className="bg-deep-violet/20 rounded-lg p-4">
                <div className="flex justify-between mb-2"><span className="text-gray-400">Required Bond</span><span className="font-medium">{bondAmount} ETH</span></div>
                <div className="border-t border-electric-purple/30 pt-2 mt-2"><div className="flex justify-between font-bold"><span>Total to Pay</span><span className="text-electric-purple">{bondAmount} ETH</span></div></div>
              </div>

              {status && (<div className="p-3 bg-electric-purple/10 border border-electric-purple/30 rounded-lg"><p className="text-electric-purple text-sm">{status}</p></div>)}
              {error && (<div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><p className="text-red-400 text-sm">{error}</p></div>)}

              <div>
                <label className="block text-sm font-medium mb-2">Your Bid Amount (ETH)</label>
                <input type="number" step="0.001" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white" disabled={isSubmitting || hasAlreadyBid || isEnded} />
              </div>

              <button onClick={submitBid} disabled={isSubmitting || isEnded || !auction.isActive || !walletConnected || hasAlreadyBid} className="w-full py-4 bg-electric-purple text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isSubmitting ? (<><FaSpinner className="animate-spin" /> Processing...</>) : hasAlreadyBid ? 'Already Bid' : 'Submit Encrypted Bid'}</button>

              <div className="flex flex-col gap-2">
                {hasAlreadyBid && (<button onClick={() => setShowCreateAuction(true)} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"><FaPlus /> Create New Auction</button>)}
                {!walletConnected && (<button onClick={initializeConnection} className="w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Connect Wallet to Bid</button>)}
              </div>

              {walletConnected && auction && (<div className="mt-4 p-4 bg-deep-violet/20 rounded-lg border border-electric-purple/20"><h3 className="font-bold mb-2 flex items-center gap-2"><FaMoneyBillWave className="text-green-400" /> Bond Management</h3>{canWithdraw && account && (<div className="space-y-3"><p className="text-sm text-gray-400">Auction has ended. You can withdraw your bond if you didn't win.</p><button onClick={withdrawBond} disabled={withdrawing} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2">{withdrawing ? (<><FaSpinner className="animate-spin" /> Withdrawing...</>) : (`Withdraw Bond (${bondAmount} ETH)`)} </button></div>)}{isOwner && isEnded && auction.hasBids && (<div className="mt-3 pt-3 border-t border-electric-purple/30"><p className="text-sm text-gray-400 mb-2">As auction owner, you can declare the winner</p><Link href={`/dashboard?auction=${auctionId}`} className="block w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm text-center">Manage Auction & Declare Winner</Link></div>)}</div>)}

              <div className="text-xs text-gray-500 pt-4 border-t border-electric-purple/20"><p className="mb-2"><strong>How it works:</strong></p><ul className="space-y-1"><li>• 1 bid per address per auction</li><li>• Bond required: {bondAmount} ETH</li><li>• Bond refunded if you don't win</li></ul></div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

