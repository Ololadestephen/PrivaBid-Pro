// app/bid/[id]/page.tsx - FIXED VERSION
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FaClock, 
  FaEthereum, 
  FaUsers, 
  FaLock, 
  FaCheck, 
  FaExclamationTriangle, 
  FaSpinner, 
  FaPlus,
  FaMoneyBillWave
} from 'react-icons/fa';

// Updated ABI with bid status checking

const CONTRACT_ABI = [
  // Basic info
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)",
  "function nextAuctionId() view returns (uint256)",
  
  // Auction info
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  
  // Bid functions
  "function submitSimpleBid(uint256 auctionId) payable",
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  
  // Withdrawal functions
  "function withdrawBid(uint256 auctionId)",
  
  // Status checking
  "function canWithdrawAdvanced(uint256 auctionId, address bidder) view returns (bool)",
  "function isHighestBidder(uint256 auctionId, address bidder) view returns (bool)",
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
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [hasAlreadyBid, setHasAlreadyBid] = useState<boolean>(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [newAuctionDesc, setNewAuctionDesc] = useState('');
  const [newAuctionDuration, setNewAuctionDuration] = useState('60'); // minutes
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (auctionId) {
      initializeConnection();
    }
  }, [auctionId]);

  async function initializeConnection() {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      setContract(contractInstance);
      
      // Connect wallet
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setWalletConnected(true);
        
        // Check if user has already bid on this auction
        await checkBidStatus(contractInstance, accounts[0]);
      }
      
      await fetchAuctionDetails(contractInstance);
      
    } catch (error) {
      console.error('Initialization error:', error);
      setError('Failed to initialize. Please refresh.');
    }
  }

  async function checkBidStatus(contractInstance: ethers.Contract, userAddress: string) {
    try {
      // Check by trying to estimate gas (will fail if already bid)
      const bond = await contractInstance.BID_BOND();
      
      try {
        await contractInstance.submitSimpleBid.estimateGas(auctionId, {
          value: bond,
          from: userAddress
        });
        setHasAlreadyBid(false);
      } catch (estimateError: any) {
        if (estimateError.message.includes('Already bid')) {
          setHasAlreadyBid(true);
        }
      }
    } catch (error) {
      console.log('Could not check bid status:', error);
    }
  }

  async function fetchAuctionDetails(contractInstance: ethers.Contract) {
    try {
      setLoading(true);
      
      const bond = await contractInstance.BID_BOND();
      setBondAmount(ethers.formatEther(bond));

      const auctionInfo = await contractInstance.getAuctionInfo(auctionId);
      
      const [owner, description, endTime, isActive, bidCount, pendingWinner, hasBids, settled, contractBond] = auctionInfo;
      
      // Extract title from description (format: "Title | Description")
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

    } catch (error: any) {
      console.error('Error fetching auction:', error);
      
      setAuction({
        id: auctionId,
        title: `Auction #${auctionId}`,
        description: 'Private auction',
        endTime: new Date(Date.now() + 86400000),
        isActive: true,
        bidCount: 0,
        bondAmount: '0.01'
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitBid() {
    if (!walletConnected || !contract) {
      await initializeConnection();
      return;
    }

    if (hasAlreadyBid) {
      setError('You have already bid on this auction. Please create a new auction or use a different wallet.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus('Preparing transaction...');
      setError('');

      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const bondWei = ethers.parseEther(bondAmount);
      
      // Verify auction is still active
      if (!auction.isActive) {
        throw new Error('Auction is no longer active');
      }
      
      if (new Date() > auction.endTime) {
        throw new Error('Auction has ended');
      }
      
      setStatus('Submitting bid...');
      
      const tx = await contractWithSigner.submitSimpleBid(
        auctionId,
        {
          value: bondWei,
          gasLimit: 200000
        }
      );
      
      setStatus('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setStatus('✅ Bid submitted successfully!');
        setHasAlreadyBid(true); // Update status
        await fetchAuctionDetails(contract);
        setTimeout(() => setStatus(''), 3000);
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error: any) {
      console.error('Bid error:', error);
      
      let errorMsg = 'Transaction failed';
      
      if (error.message.includes('Already bid')) {
        errorMsg = 'You have already bid on this auction';
        setHasAlreadyBid(true);
      } else if (error.message.includes('Auction not active')) {
        errorMsg = 'Auction is not active';
      } else if (error.message.includes('Incorrect bid bond')) {
        errorMsg = `Incorrect bond. Send exactly ${bondAmount} ETH`;
      } else if (error.message.includes('Auction ended')) {
        errorMsg = 'Auction has ended';
      } else if (error.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMsg = `Insufficient ETH. Need ${bondAmount} ETH for bond`;
      }
      
      setError(errorMsg);
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function withdrawBond() {
    try {
      setWithdrawing(true);
      setStatus('Withdrawing bond...');
      setError('');

      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.withdrawBid(auctionId, { 
        gasLimit: 150000 
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setStatus('✅ Bond withdrawn successfully!');
        // Refresh auction data
        await fetchAuctionDetails(contract);
      } else {
        throw new Error('Withdrawal failed');
      }
      
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setError(`Withdrawal failed: ${error.message}`);
      setStatus('');
    } finally {
      setWithdrawing(false);
    }
  }

  async function createNewAuction() {
    try {
      if (!contract || !walletConnected) return;
      
      setIsSubmitting(true);
      setStatus('Creating new auction...');
      setError('');
      
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const durationMinutes = parseInt(newAuctionDuration);
      
      const tx = await contractWithSigner.createAuction(
        newAuctionDesc || `Test Auction ${new Date().toLocaleTimeString()}`,
        durationMinutes,
        {
          gasLimit: 300000
        }
      );
      
      setStatus('⏳ Creating auction...');
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        // Get the new auction ID from logs or by calling nextAuctionId
        const newContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const nextId = await newContract.nextAuctionId();
        const newAuctionId = Number(nextId) - 1;
        
        setStatus(`✅ Auction #${newAuctionId} created!`);
        setShowCreateAuction(false);
        
        // Redirect to new auction
        setTimeout(() => {
          window.location.href = `/bid/${newAuctionId}`;
        }, 2000);
      }
      
    } catch (error: any) {
      setError(`Failed to create auction: ${error.message}`);
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-purple mb-4 mx-auto"></div>
        <p className="text-gray-400">Loading auction details...</p>
      </div>
    );
  }

  const timeRemaining = auction.endTime - new Date();
  const isEnded = timeRemaining <= 0;
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

  // Check if user is auction owner
  const isOwner = account?.toLowerCase() === auction?.owner?.toLowerCase();
  
  // Check if user can withdraw
  const canWithdraw = isEnded && !auction.isActive && !isOwner && !hasAlreadyBid;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <a href="/auctions" className="text-electric-purple hover:underline">
          ← Back to Auctions
        </a>
      </div>

      {/* Status Banner */}
      {hasAlreadyBid && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-yellow-500 text-xl" />
            <div>
              <h3 className="font-bold text-yellow-400">Already Bid on This Auction</h3>
              <p className="text-yellow-300/80 text-sm">
                You can only bid once per auction. Create a new auction or switch wallets to bid again.
              </p>
            </div>
            <button
              onClick={() => setShowCreateAuction(true)}
              className="ml-auto px-4 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-2"
            >
              <FaPlus /> New Auction
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2">
          <div className="bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/30 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{auction.title}</h1>
                <p className="text-gray-300">{auction.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-lg ${auction.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {auction.isActive ? 'Active' : 'Ended'}
                </div>
                <div className="px-3 py-1 bg-electric-purple/20 text-electric-purple rounded-lg">
                  #{auction.id}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1">
                  <FaClock className="mr-2" />
                  <span className="text-sm">Time</span>
                </div>
                <div className="text-xl font-bold">
                  {isEnded ? 'Ended' : `${hoursRemaining}h ${minutesRemaining}m`}
                </div>
              </div>
              
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1">
                  <FaEthereum className="mr-2" />
                  <span className="text-sm">Bids</span>
                </div>
                <div className="text-xl font-bold">{auction.bidCount}</div>
              </div>
              
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1">
                  <FaLock className="mr-2" />
                  <span className="text-sm">Bond</span>
                </div>
                <div className="text-xl font-bold">{bondAmount} ETH</div>
              </div>
              
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1">
                  <FaUsers className="mr-2" />
                  <span className="text-sm">Your Status</span>
                </div>
                <div className={`text-xl font-bold ${hasAlreadyBid ? 'text-green-400' : 'text-yellow-400'}`}>
                  {hasAlreadyBid ? 'Bid Placed' : 'Can Bid'}
                </div>
              </div>
            </div>

            {/* Create Auction Form (shown when toggled) */}
            {showCreateAuction && (
              <div className="mt-6 p-4 bg-deep-violet/30 rounded-lg border border-electric-purple/30">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FaPlus /> Create New Auction
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <input
                      type="text"
                      value={newAuctionDesc}
                      onChange={(e) => setNewAuctionDesc(e.target.value)}
                      className="w-full px-4 py-2 bg-obsidian border border-electric-purple/30 rounded-lg"
                      placeholder="e.g., NFT Auction #1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={newAuctionDuration}
                      onChange={(e) => setNewAuctionDuration(e.target.value)}
                      className="w-full px-4 py-2 bg-obsidian border border-electric-purple/30 rounded-lg"
                      min="1"
                      max="10080" // 1 week
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={createNewAuction}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Auction'}
                    </button>
                    
                    <button
                      onClick={() => setShowCreateAuction(false)}
                      className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Bid Form */}
        <div className="lg:col-span-1">
          <div className="bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/30 p-6 sticky top-6">
            <h2 className="text-2xl font-bold mb-6">Place Bid</h2>
            
            <div className="space-y-4">
              {/* Bid Status */}
              <div className={`p-3 rounded-lg ${hasAlreadyBid ? 'bg-yellow-900/30 border border-yellow-500/30' : 'bg-green-900/30 border border-green-500/30'}`}>
                <div className="flex items-center gap-2">
                  {hasAlreadyBid ? (
                    <>
                      <FaExclamationTriangle className="text-yellow-500" />
                      <span className="text-yellow-400 font-medium">Already Bid</span>
                    </>
                  ) : (
                    <>
                      <FaCheck className="text-green-500" />
                      <span className="text-green-400 font-medium">Ready to Bid</span>
                    </>
                  )}
                </div>
                <p className="text-sm mt-1">
                  {hasAlreadyBid 
                    ? 'You can only bid once per auction.'
                    : 'You can place a bid on this auction.'}
                </p>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-deep-violet/20 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Required Bond</span>
                  <span className="font-medium">{bondAmount} ETH</span>
                </div>
                <div className="border-t border-electric-purple/30 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total to Pay</span>
                    <span className="text-electric-purple">{bondAmount} ETH</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Refundable if you don't win
                  </p>
                </div>
              </div>

              {/* Status Messages */}
              {status && (
                <div className="p-3 bg-electric-purple/10 border border-electric-purple/30 rounded-lg">
                  <p className="text-electric-purple text-sm">{status}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={submitBid}
                disabled={isSubmitting || isEnded || !auction.isActive || !walletConnected || hasAlreadyBid}
                className="w-full py-4 bg-electric-purple text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Processing...
                  </>
                ) : hasAlreadyBid ? (
                  'Already Bid'
                ) : 'Submit Bid'}
              </button>

              {/* Alternative Actions */}
              <div className="flex flex-col gap-2">
                {hasAlreadyBid && (
                  <button
                    onClick={() => setShowCreateAuction(true)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <FaPlus /> Create New Auction
                  </button>
                )}
                
                {!walletConnected && (
                  <button
                    onClick={initializeConnection}
                    className="w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    Connect Wallet to Bid
                  </button>
                )}
              </div>

              {/* Withdrawal Section (if applicable) */}
              {walletConnected && auction && (
                <div className="mt-4 p-4 bg-deep-violet/20 rounded-lg border border-electric-purple/20">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <FaMoneyBillWave className="text-green-400" />
                    Bond Management
                  </h3>
                  
                  {canWithdraw && account && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">
                        Auction has ended. You can withdraw your bond if you didn't win.
                      </p>
                      
                      <button
                        onClick={withdrawBond}
                        disabled={withdrawing}
                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                      >
                        {withdrawing ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Withdrawing...
                          </>
                        ) : (
                          `Withdraw Bond (${bondAmount} ETH)`
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* For auction owners - show winner declaration */}
                  {isOwner && isEnded && auction.hasBids && (
                    <div className="mt-3 pt-3 border-t border-electric-purple/30">
                      <p className="text-sm text-gray-400 mb-2">As auction owner, you can declare the winner</p>
                      <Link
                        href={`/dashboard?auction=${auctionId}`}
                        className="block w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm text-center"
                      >
                        Manage Auction & Declare Winner
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              <div className="text-xs text-gray-500 pt-4 border-t border-electric-purple/20">
                <p className="mb-2"><strong>How it works:</strong></p>
                <ul className="space-y-1">
                  <li>• 1 bid per address per auction</li>
                  <li>• Bond required: {bondAmount} ETH</li>
                  <li>• Bond refunded if you don't win</li>
                  <li>• Winner can withdraw after settlement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}