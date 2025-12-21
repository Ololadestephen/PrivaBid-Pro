// app/dashboard/page.tsx - UPDATED (with inline ABI)
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { 
  FaWallet, 
  FaEthereum, 
  FaClock, 
  FaUsers, 
  FaTrophy,
  FaMoneyBillWave,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaEye,
  FaEyeSlash,
  FaHistory,
  FaGavel
} from 'react-icons/fa';

// Inline ABI to avoid import issues
const CONTRACT_ABI = [
  "function nextAuctionId() view returns (uint256)",
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function getEnhancedAuctionInfo(uint256 auctionId) view returns (address, uint256, bool, uint256, address, bool, bool, uint256)",
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  "function submitSimpleBid(uint256 auctionId) payable",
  "function submitEncryptedBid(uint256 auctionId, bytes encryptedAmount, bytes inputProof) payable",
  "function submitBidWithIncrement(uint256 auctionId, bytes encryptedAmount, bytes inputProof) payable",
  "function commitBid(uint256 auctionId, bytes32 commitment) payable",
  "function revealBid(uint256 auctionId, bytes encryptedAmount, bytes inputProof, uint256 salt)",
  "function withdrawBid(uint256 auctionId)",
  "function withdrawBidAdvanced(uint256 auctionId)",
  "function canWithdrawAdvanced(uint256 auctionId, address bidder) view returns (bool)",
  "function endAuction(uint256 auctionId)",
  "function settleAuction(uint256 auctionId)",
  "function declareWinner(uint256 auctionId, address winner, uint256 winningAmount)",
  "function isHighestBidder(uint256 auctionId, address bidder) view returns (bool)",
  "function isMinimumIncrementSet(uint256 auctionId) view returns (bool)",
  "function viewMyEncryptedBid(uint256 auctionId, bytes32 key) view returns (bool, uint256, bool, bool)",
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)"
];

const CONTRACT_ADDRESS = '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

interface AuctionInfo {
  id: number;
  title: string;
  description: string;
  endTime: Date;
  isActive: boolean;
  bidCount: number;
  owner: string;
  pendingWinner: string;
  settled: boolean;
  bondAmount: string;
  hasBids: boolean;
}

interface UserBid {
  auctionId: number;
  title: string;
  isWinner: boolean;
  isHighestBidder: boolean;
  canWithdraw: boolean;
  hasWithdrawn: boolean;
  isOwner: boolean;
  endTime: Date;
  isActive: boolean;
  settled: boolean;
  bondAmount: string;
  bidCount: number;
}

interface OwnerAuction {
  auctionId: number;
  title: string;
  isActive: boolean;
  endTime: Date;
  bidCount: number;
  pendingWinner: string;
  settled: boolean;
  canEnd: boolean;
  canSettle: boolean;
  canDeclareWinner: boolean;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [userBids, setUserBids] = useState<UserBid[]>([]);
  const [ownerAuctions, setOwnerAuctions] = useState<OwnerAuction[]>([]);
  const [allAuctions, setAllAuctions] = useState<AuctionInfo[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'bids' | 'auctions' | 'manage'>('bids');
  const [withdrawing, setWithdrawing] = useState<number | null>(null);
  const [declaringWinner, setDeclaringWinner] = useState<number | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      setAccount(userAddress);
      
      // Get balance
      const balanceWei = await provider.getBalance(userAddress);
      setBalance(ethers.formatEther(balanceWei));
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Get total auctions
      const nextId = await contract.nextAuctionId();
      const totalAuctions = Number(nextId);
      
      // Load all auctions
      const auctions: AuctionInfo[] = [];
      for (let i = 0; i < totalAuctions; i++) {
        try {
          const auctionInfo = await contract.getAuctionInfo(i);
          const [title, ...descParts] = auctionInfo[1].split(' | ');
          
          auctions.push({
            id: i,
            title: title || `Auction #${i}`,
            description: descParts.join(' | ') || '',
            endTime: new Date(Number(auctionInfo[2]) * 1000),
            isActive: Boolean(auctionInfo[3]),
            bidCount: Number(auctionInfo[4]),
            owner: auctionInfo[0],
            pendingWinner: auctionInfo[5],
            hasBids: Boolean(auctionInfo[6]),
            settled: Boolean(auctionInfo[7]),
            bondAmount: ethers.formatEther(auctionInfo[8])
          });
        } catch (e) {
          // Skip auctions that fail to load
        }
      }
      
      setAllAuctions(auctions);
      
      // Find user's bids
      const userBidsList: UserBid[] = [];
      const ownerAuctionsList: OwnerAuction[] = [];
      
      for (const auction of auctions) {
        // Check if user is owner
        const isOwner = auction.owner.toLowerCase() === userAddress.toLowerCase();
        
        // Check if user is pending winner
        const isWinner = auction.pendingWinner.toLowerCase() === userAddress.toLowerCase();
        const isHighestBidder = isWinner; // Simplified
        
        if (isOwner) {
          ownerAuctionsList.push({
            auctionId: auction.id,
            title: auction.title,
            isActive: auction.isActive,
            endTime: auction.endTime,
            bidCount: auction.bidCount,
            pendingWinner: auction.pendingWinner,
            settled: auction.settled,
            canEnd: auction.isActive && auction.endTime < new Date(),
            canSettle: !auction.isActive && !auction.settled,
            canDeclareWinner: !auction.isActive && auction.hasBids && !auction.settled
          });
        }
        
        // Simplified: User has bid if they're the winner or if auction has bids
        // In production, you'd need to check a mapping in the contract
        const userHasBid = isWinner || (auction.bidCount > 0); // This is just for demo
        
        if (userHasBid) {
          const canWithdraw = !auction.isActive && !isWinner && auction.bidCount > 0;
          
          userBidsList.push({
            auctionId: auction.id,
            title: auction.title,
            isWinner,
            isHighestBidder,
            canWithdraw,
            hasWithdrawn: false, // You'd need to track this in your contract
            isOwner,
            endTime: auction.endTime,
            isActive: auction.isActive,
            settled: auction.settled,
            bondAmount: auction.bondAmount,
            bidCount: auction.bidCount
          });
        }
      }
      
      setUserBids(userBidsList);
      setOwnerAuctions(ownerAuctionsList);
      
    } catch (error: any) {
      console.error('Dashboard error:', error);
      setError(`Failed to load dashboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function withdrawBid(auctionId: number) {
    try {
      setWithdrawing(auctionId);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setSuccess(`Withdrawing bond from auction #${auctionId}...`);
      
      const tx = await contract.withdrawBid(auctionId, {
        gasLimit: 150000
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Bond withdrawn successfully! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard(); // Refresh data
      } else {
        throw new Error('Withdrawal failed');
      }
      
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setError(`Withdrawal failed: ${error.message}`);
    } finally {
      setWithdrawing(null);
    }
  }

  async function declareWinner(auctionId: number, winnerAddress: string, winningAmount: string) {
    try {
      setDeclaringWinner(auctionId);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const amountWei = ethers.parseEther(winningAmount);
      
      setSuccess(`Declaring winner for auction #${auctionId}...`);
      
      const tx = await contract.declareWinner(auctionId, winnerAddress, amountWei, {
        gasLimit: 200000
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Winner declared! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard(); // Refresh data
      } else {
        throw new Error('Declaration failed');
      }
      
    } catch (error: any) {
      console.error('Declare winner error:', error);
      setError(`Failed to declare winner: ${error.message}`);
    } finally {
      setDeclaringWinner(null);
    }
  }

  async function endAuction(auctionId: number) {
    try {
      setError('');
      setSuccess('');
      
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setSuccess(`Ending auction #${auctionId}...`);
      
      const tx = await contract.endAuction(auctionId, {
        gasLimit: 150000
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Auction ended! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard();
      }
      
    } catch (error: any) {
      setError(`Failed to end auction: ${error.message}`);
    }
  }

  async function settleAuction(auctionId: number) {
    try {
      setError('');
      setSuccess('');
      
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setSuccess(`Settling auction #${auctionId}...`);
      
      const tx = await contract.settleAuction(auctionId, {
        gasLimit: 150000
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Auction settled! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard();
      }
      
    } catch (error: any) {
      setError(`Failed to settle auction: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-purple mb-4 mx-auto">
          <FaSpinner className="h-12 w-12" />
        </div>
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400 mb-6">Please connect your wallet to view your dashboard</p>
        <button
          onClick={loadDashboard}
          className="px-6 py-3 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-2 mx-auto"
        >
          <FaWallet /> Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
        <p className="text-gray-400">
          Manage your bids, auctions, and withdrawals
        </p>
      </div>

      {/* Wallet Info */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-obsidian/60 p-6 rounded-xl border border-electric-purple/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-electric-purple to-deep-violet rounded-lg flex items-center justify-center">
              <FaWallet className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold">Wallet</h3>
              <p className="text-sm text-gray-400">{account.slice(0, 8)}...{account.slice(-6)}</p>
            </div>
          </div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <FaEthereum className="text-electric-purple" />
            {parseFloat(balance).toFixed(4)} ETH
          </div>
        </div>
        
        <div className="bg-obsidian/60 p-6 rounded-xl border border-electric-purple/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center">
              <FaTrophy className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold">Active Bids</h3>
              <p className="text-sm text-gray-400">Placed by you</p>
            </div>
          </div>
          <div className="text-2xl font-bold">
            {userBids.filter(bid => bid.isActive).length}
          </div>
        </div>
        
        <div className="bg-obsidian/60 p-6 rounded-xl border border-electric-purple/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-700 rounded-lg flex items-center justify-center">
              <FaGavel className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold">Your Auctions</h3>
              <p className="text-sm text-gray-400">Created by you</p>
            </div>
          </div>
          <div className="text-2xl font-bold">
            {ownerAuctions.length}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
          <div className="flex items-center gap-2 text-green-400">
            <FaCheck />
            <span>{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <FaExclamationTriangle />
            <span>Error: {error}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-800">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('bids')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'bids'
                ? 'bg-obsidian border-t border-l border-r border-electric-purple/30 text-electric-purple'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaMoneyBillWave />
              Your Bids & Withdrawals
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('auctions')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'auctions'
                ? 'bg-obsidian border-t border-l border-r border-electric-purple/30 text-electric-purple'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaGavel />
              Your Auctions ({ownerAuctions.length})
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'manage'
                ? 'bg-obsidian border-t border-l border-r border-electric-purple/30 text-electric-purple'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaHistory />
              All Auctions ({allAuctions.length})
            </div>
          </button>
        </div>
      </div>

      {/* Bids & Withdrawals Tab */}
      {activeTab === 'bids' && (
        <div className="space-y-4">
          {userBids.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💸</div>
              <h3 className="text-xl font-bold mb-2">No Bids Found</h3>
              <p className="text-gray-400 mb-4">You haven't placed any bids yet</p>
              <Link
                href="/auctions"
                className="px-6 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 inline-block"
              >
                Browse Auctions
              </Link>
            </div>
          ) : (
            <>
              {/* Withdrawable Bids */}
              {userBids.filter(bid => bid.canWithdraw && !bid.hasWithdrawn).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-400">
                    <FaMoneyBillWave />
                    Available for Withdrawal
                  </h3>
                  <div className="space-y-3">
                    {userBids
                      .filter(bid => bid.canWithdraw && !bid.hasWithdrawn)
                      .map(bid => (
                        <div key={bid.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-green-500/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold">{bid.title}</h4>
                              <p className="text-sm text-gray-400">
                                Auction #{bid.auctionId} • Bond: {bid.bondAmount} ETH
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/bid/${bid.auctionId}`}
                                className="px-3 py-1 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 flex items-center gap-1"
                              >
                                <FaExternalLinkAlt className="text-xs" /> View
                              </Link>
                              <button
                                onClick={() => withdrawBid(bid.auctionId)}
                                disabled={withdrawing === bid.auctionId}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                {withdrawing === bid.auctionId ? (
                                  <>
                                    <FaSpinner className="animate-spin" />
                                    Withdrawing...
                                  </>
                                ) : (
                                  <>
                                    <FaMoneyBillWave />
                                    Withdraw Bond
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Active Bids */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FaClock />
                  Active Bids
                </h3>
                <div className="space-y-3">
                  {userBids
                    .filter(bid => bid.isActive && !bid.canWithdraw)
                    .map(bid => (
                      <div key={bid.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-electric-purple/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold">{bid.title}</h4>
                              {bid.isWinner && (
                                <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full">
                                  Leading
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              Auction #{bid.auctionId} • {bid.bidCount} bids • Ends {bid.endTime.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/bid/${bid.auctionId}`}
                              className="px-4 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                            >
                              <FaEye /> View
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Ended Bids */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FaHistory />
                  Ended Bids
                </h3>
                <div className="space-y-3">
                  {userBids
                    .filter(bid => !bid.isActive)
                    .map(bid => (
                      <div key={bid.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold">{bid.title}</h4>
                              {bid.isWinner ? (
                                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                                  Winner
                                </span>
                              ) : bid.canWithdraw ? (
                                <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full">
                                  Can Withdraw
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                                  Ended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              Auction #{bid.auctionId} • {bid.bidCount} bids • Ended {bid.endTime.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/bid/${bid.auctionId}`}
                              className="px-3 py-1 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
                            >
                              View
                            </Link>
                            {bid.canWithdraw && !bid.hasWithdrawn && (
                              <button
                                onClick={() => withdrawBid(bid.auctionId)}
                                disabled={withdrawing === bid.auctionId}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {withdrawing === bid.auctionId ? 'Withdrawing...' : 'Withdraw'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Your Auctions Tab */}
      {activeTab === 'auctions' && (
        <div className="space-y-4">
          {ownerAuctions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏷️</div>
              <h3 className="text-xl font-bold mb-2">No Auctions Created</h3>
              <p className="text-gray-400 mb-4">You haven't created any auctions yet</p>
              <Link
                href="/auctions/create"
                className="px-6 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 inline-block"
              >
                Create Auction
              </Link>
            </div>
          ) : (
            <>
              {/* Auctions Needing Action */}
              {ownerAuctions.filter(auction => auction.canEnd || auction.canSettle || auction.canDeclareWinner).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-yellow-400">
                    <FaExclamationTriangle />
                    Auctions Needing Action
                  </h3>
                  <div className="space-y-3">
                    {ownerAuctions
                      .filter(auction => auction.canEnd || auction.canSettle || auction.canDeclareWinner)
                      .map(auction => (
                        <div key={auction.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-yellow-500/30">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold">{auction.title}</h4>
                              <p className="text-sm text-gray-400">
                                Auction #{auction.auctionId} • {auction.bidCount} bids
                              </p>
                            </div>
                            <Link
                              href={`/bid/${auction.auctionId}`}
                              className="px-3 py-1 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
                            >
                              View
                            </Link>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {auction.canEnd && (
                              <button
                                onClick={() => endAuction(auction.auctionId)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                              >
                                End Auction
                              </button>
                            )}
                            
                            {auction.canSettle && (
                              <button
                                onClick={() => settleAuction(auction.auctionId)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                Settle Auction
                              </button>
                            )}
                            
                            {auction.canDeclareWinner && (
                              <WinnerDeclarationForm
                                auctionId={auction.auctionId}
                                auctionTitle={auction.title}
                                pendingWinner={auction.pendingWinner}
                                onDeclareWinner={declareWinner}
                                isDeclaring={declaringWinner === auction.auctionId}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* All Your Auctions */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FaGavel />
                  All Your Auctions
                </h3>
                <div className="space-y-3">
                  {ownerAuctions.map(auction => (
                    <div key={auction.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-electric-purple/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold">{auction.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              auction.isActive
                                ? 'bg-green-900/30 text-green-400'
                                : auction.settled
                                ? 'bg-blue-900/30 text-blue-400'
                                : 'bg-gray-700 text-gray-400'
                            }`}>
                              {auction.isActive ? 'Active' : auction.settled ? 'Settled' : 'Ended'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            Auction #{auction.auctionId} • {auction.bidCount} bids • 
                            {auction.isActive ? ` Ends ${auction.endTime.toLocaleDateString()}` : ' Ended'}
                          </p>
                          {auction.pendingWinner && auction.pendingWinner !== ethers.ZeroAddress && (
                            <p className="text-sm text-gray-400 mt-1">
                              Winner: {auction.pendingWinner.slice(0, 8)}...{auction.pendingWinner.slice(-6)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/bid/${auction.auctionId}`}
                            className="px-4 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 text-sm"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* All Auctions Tab */}
      {activeTab === 'manage' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-bold">All Auctions ({allAuctions.length})</h3>
            <button
              onClick={loadDashboard}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2"
            >
              <FaSpinner className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          
          {allAuctions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏷️</div>
              <h3 className="text-xl font-bold mb-2">No Auctions Found</h3>
              <p className="text-gray-400">No auctions have been created yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAuctions.map(auction => {
                const isOwner = auction.owner.toLowerCase() === account.toLowerCase();
                const isWinner = auction.pendingWinner.toLowerCase() === account.toLowerCase();
                const timeRemaining = auction.endTime.getTime() - Date.now();
                const isEnded = timeRemaining <= 0;
                const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
                
                return (
                  <div key={auction.id} className="bg-obsidian/60 p-4 rounded-lg border border-electric-purple/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold line-clamp-1">{auction.title}</h4>
                        <p className="text-sm text-gray-400">#{auction.id}</p>
                      </div>
                      {isOwner && (
                        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                          Owner
                        </span>
                      )}
                      {isWinner && !isOwner && (
                        <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full">
                          Leading
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-deep-violet/30 rounded">
                        <div className="text-xs text-gray-400">Bids</div>
                        <div className="font-bold">{auction.bidCount}</div>
                      </div>
                      <div className="text-center p-2 bg-deep-violet/30 rounded">
                        <div className="text-xs text-gray-400">Status</div>
                        <div className={`font-bold ${auction.isActive && !isEnded ? 'text-green-400' : 'text-gray-400'}`}>
                          {auction.isActive && !isEnded ? `${hoursRemaining}h` : 'Ended'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {auction.owner.slice(0, 6)}...{auction.owner.slice(-4)}
                      </div>
                      <Link
                        href={`/bid/${auction.id}`}
                        className="px-3 py-1 bg-electric-purple text-white rounded-lg text-sm hover:opacity-90"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Winner Declaration Form Component
function WinnerDeclarationForm({ 
  auctionId, 
  auctionTitle, 
  pendingWinner,
  onDeclareWinner,
  isDeclaring 
}: { 
  auctionId: number;
  auctionTitle: string;
  pendingWinner: string;
  onDeclareWinner: (auctionId: number, winner: string, amount: string) => Promise<void>;
  isDeclaring: boolean;
}) {
  const [winnerAddress, setWinnerAddress] = useState(pendingWinner);
  const [winningAmount, setWinningAmount] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (winnerAddress && winningAmount) {
      onDeclareWinner(auctionId, winnerAddress, winningAmount);
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
      >
        Declare Winner
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-obsidian rounded-xl border border-electric-purple/50 w-full max-w-md">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2">Declare Winner</h3>
          <p className="text-gray-400 mb-4">
            Auction: {auctionTitle} (#{auctionId})
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Winner's Address
              </label>
              <input
                type="text"
                value={winnerAddress}
                onChange={(e) => setWinnerAddress(e.target.value)}
                className="w-full px-4 py-2 bg-deep-violet/30 border border-electric-purple/30 rounded-lg text-white"
                placeholder="0x..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Winning Amount (ETH)
              </label>
              <input
                type="number"
                value={winningAmount}
                onChange={(e) => setWinningAmount(e.target.value)}
                className="w-full px-4 py-2 bg-deep-violet/30 border border-electric-purple/30 rounded-lg text-white"
                placeholder="0.5"
                step="0.001"
                min="0"
                required
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                disabled={isDeclaring}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeclaring || !winnerAddress || !winningAmount}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeclaring ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Declaring...
                  </>
                ) : (
                  'Declare Winner'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}