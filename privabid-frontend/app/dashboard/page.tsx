// app/dashboard/page.tsx - FIXED VERSION WITH AUTO-SETTLE
'use client';

import { useState, useEffect, useCallback } from 'react';
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
  FaHistory,
  FaGavel,
  FaRobot
} from 'react-icons/fa';

// Environment variables for flexibility
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';
const TARGET_NETWORK_ID = process.env.NEXT_PUBLIC_TARGET_NETWORK_ID || '0xaa36a7'; // Sepolia default
const NETWORK_NAMES: Record<string, string> = {
  '0x1': 'Ethereum Mainnet',
  '0xaa36a7': 'Sepolia Testnet',
  '0x5': 'Goerli Testnet',
  '0x89': 'Polygon Mainnet'
};

// Auto-settle configuration
const AUTO_SETTLE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SETTLE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Inline ABI (enhanced with hasBid function)
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
  "function BID_BOND() view returns (uint256)",
  "function hasBid(uint256 auctionId, address bidder) view returns (bool)" // Added for accurate bid detection
];

// Interfaces
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
  canAutoSettle: boolean;
}

// Subcomponents
import WalletInfo from './components/WalletInfo';
import AuctionList from './components/AuctionList';
import UserBidsSection from './components/UserBidsSection';
import OwnerAuctionsSection from './components/OwnerAuctionsSection';
import StatusMessage from './components/StatusMessage';
import NetworkGuard from './components/NetworkGuard';

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
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string>('');
  const [autoSettling, setAutoSettling] = useState<number | null>(null);
  const [autoSettleEnabled, setAutoSettleEnabled] = useState(true);

  // Check network and set up event listeners
  useEffect(() => {
    const checkNetwork = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        setIsCorrectNetwork(false);
        return;
      }
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setCurrentNetwork(chainId);
        setIsCorrectNetwork(chainId === TARGET_NETWORK_ID);
      } catch (e) {
        console.error('Network check error:', e);
        setIsCorrectNetwork(false);
      }
    };

    // Set up event listeners for network/account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount('');
        setUserBids([]);
        setOwnerAuctions([]);
      } else {
        loadDashboard();
      }
    };

    const handleChainChanged = () => {
      window.location.reload(); // Simplest approach
    };

    checkNetwork();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Only load dashboard after network is confirmed correct
  useEffect(() => {
    if (isCorrectNetwork) {
      loadDashboard();
    }
  }, [isCorrectNetwork]);

  // Auto-settle check interval
  useEffect(() => {
    if (!autoSettleEnabled || !isCorrectNetwork || ownerAuctions.length === 0) return;

    const checkAutoSettle = async () => {
      const auctionsToSettle = ownerAuctions.filter(auction => 
        auction.canAutoSettle && 
        autoSettling !== auction.auctionId
      );

      for (const auction of auctionsToSettle) {
        await handleAutoSettle(auction.auctionId, true); // true = auto-triggered
        // Wait 10 seconds between auto-settles to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    };

    const interval = setInterval(checkAutoSettle, AUTO_SETTLE_CHECK_INTERVAL_MS);
    
    // Initial check after 30 seconds
    const initialTimer = setTimeout(checkAutoSettle, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [isCorrectNetwork, ownerAuctions, autoSettleEnabled, autoSettling]);

  const loadDashboard = useCallback(async () => {
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
      
      // Load all auctions in parallel using Promise.all
      const auctionPromises = Array.from({ length: totalAuctions }, (_, i) =>
        contract.getAuctionInfo(i).catch(() => null)
      );
      
      const auctionResults = await Promise.all(auctionPromises);
      
      // Process auction results
      const auctions: AuctionInfo[] = [];
      for (let i = 0; i < auctionResults.length; i++) {
        const auctionInfo = auctionResults[i];
        if (!auctionInfo) continue;
        
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
      }
      
      setAllAuctions(auctions);
      
      // Check user's bids and ownership in parallel
      const userBidsList: UserBid[] = [];
      const ownerAuctionsList: OwnerAuction[] = [];
      
      const userCheckPromises = auctions.map(async (auction) => {
        // Check if user is owner
        const isOwner = auction.owner.toLowerCase() === userAddress.toLowerCase();
        
        // Check if user is pending winner
        const isWinner = auction.pendingWinner.toLowerCase() === userAddress.toLowerCase();
        
        // ACCURATE: Check if user has actually bid using contract function
        let userHasBid = false;
        try {
          userHasBid = await contract.hasBid(auction.id, userAddress);
        } catch (e) {
          console.warn('hasBid function not available, falling back to winner check');
          userHasBid = isWinner; // Fallback
        }
        
        const isHighestBidder = isWinner;
        
        if (isOwner) {
          // Calculate if auction can be auto-settled (ended > 24 hours ago)
          const canAutoSettle = !auction.isActive && 
                               !auction.settled && 
                               auction.endTime.getTime() + AUTO_SETTLE_GRACE_PERIOD_MS < Date.now();
          
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
            canDeclareWinner: !auction.isActive && auction.hasBids && !auction.settled,
            canAutoSettle
          });
        }
        
        if (userHasBid) {
          // FIXED WITHDRAWAL LOGIC BASED ON CONTRACT ERROR
          // Winners can only withdraw AFTER settlement
          // Non-winners can withdraw after auction ends
          let canWithdraw = false;
          try {
            canWithdraw = await contract.canWithdrawAdvanced(auction.id, userAddress);
          } catch (e) {
            // CORRECTED FALLBACK LOGIC:
            // For winners: only if auction is settled
            // For non-winners: if auction is not active
            if (isWinner) {
              canWithdraw = auction.settled && !auction.isActive;
            } else {
              canWithdraw = !auction.isActive && auction.bidCount > 0;
            }
          }
          
          // Additional safety check to prevent showing withdrawal for winners before settlement
          if (isWinner && !auction.settled) {
            canWithdraw = false;
          }
          
          userBidsList.push({
            auctionId: auction.id,
            title: auction.title,
            isWinner,
            isHighestBidder,
            canWithdraw,
            hasWithdrawn: false,
            isOwner,
            endTime: auction.endTime,
            isActive: auction.isActive,
            settled: auction.settled,
            bondAmount: auction.bondAmount,
            bidCount: auction.bidCount
          });
        }
      });
      
      await Promise.all(userCheckPromises);
      
      setUserBids(userBidsList);
      setOwnerAuctions(ownerAuctionsList);
      
    } catch (error: any) {
      console.error('Dashboard error:', error);
      setError(`Failed to load dashboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const withdrawBid = async (bid: UserBid) => {
    try {
      setWithdrawing(bid.auctionId);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setSuccess(`Withdrawing bond from auction #${bid.auctionId}...`);
      
      // Dynamic gas estimation based on user status
      let gasEstimate;
      let tx;
      
      if (bid.isWinner) {
        // Winners must use withdrawBidAdvanced (based on contract logic)
        gasEstimate = await contract.withdrawBidAdvanced.estimateGas(bid.auctionId);
        const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
        tx = await contract.withdrawBidAdvanced(bid.auctionId, {
          gasLimit
        });
      } else {
        // Non-winners use regular withdrawBid
        gasEstimate = await contract.withdrawBid.estimateGas(bid.auctionId);
        const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
        tx = await contract.withdrawBid(bid.auctionId, {
          gasLimit
        });
      }
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Bond withdrawn successfully! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard();
      } else {
        throw new Error('Withdrawal failed');
      }
      
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setError(`Withdrawal failed: ${error.message}`);
    } finally {
      setWithdrawing(null);
    }
  };

  const handleAutoSettle = async (auctionId: number, isAutoTriggered = false) => {
    try {
      if (!isAutoTriggered) {
        setAutoSettling(auctionId);
      }
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const message = isAutoTriggered 
        ? `Auto-settling auction #${auctionId}...`
        : `Settling auction #${auctionId}...`;
      setSuccess(message);
      
      // Dynamic gas estimation
      const gasEstimate = await contract.settleAuction.estimateGas(auctionId);
      const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
      
      const tx = await contract.settleAuction(auctionId, {
        gasLimit
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        const successMessage = isAutoTriggered
          ? `✅ Auction #${auctionId} auto-settled! Transaction: ${receipt.hash.slice(0, 10)}...`
          : `✅ Auction settled! Transaction: ${receipt.hash.slice(0, 10)}...`;
        setSuccess(successMessage);
        await loadDashboard();
      } else {
        throw new Error('Settlement failed');
      }
      
    } catch (error: any) {
      console.error('Settlement error:', error);
      if (!isAutoTriggered) {
        setError(`Failed to settle auction: ${error.message}`);
      }
    } finally {
      if (!isAutoTriggered) {
        setAutoSettling(null);
      }
    }
  };

  const declareWinner = async (auctionId: number, winnerAddress: string, winningAmount: string) => {
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
      
      // Dynamic gas estimation
      const gasEstimate = await contract.declareWinner.estimateGas(auctionId, winnerAddress, amountWei);
      const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
      
      const tx = await contract.declareWinner(auctionId, winnerAddress, amountWei, {
        gasLimit
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Winner declared! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard();
      } else {
        throw new Error('Declaration failed');
      }
      
    } catch (error: any) {
      console.error('Declare winner error:', error);
      setError(`Failed to declare winner: ${error.message}`);
    } finally {
      setDeclaringWinner(null);
    }
  };

  const endAuction = async (auctionId: number) => {
    try {
      setError('');
      setSuccess('');
      
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setSuccess(`Ending auction #${auctionId}...`);
      
      // Dynamic gas estimation
      const gasEstimate = await contract.endAuction.estimateGas(auctionId);
      const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
      
      const tx = await contract.endAuction(auctionId, {
        gasLimit
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Auction ended! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard();
      }
      
    } catch (error: any) {
      setError(`Failed to end auction: ${error.message}`);
    }
  };

  const settleAuction = async (auctionId: number) => {
    try {
      setError('');
      setSuccess('');
      
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setSuccess(`Settling auction #${auctionId}...`);
      
      // Dynamic gas estimation
      const gasEstimate = await contract.settleAuction.estimateGas(auctionId);
      const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
      
      const tx = await contract.settleAuction(auctionId, {
        gasLimit
      });
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        setSuccess(`✅ Auction settled! Transaction: ${receipt.hash.slice(0, 10)}...`);
        await loadDashboard();
      }
      
    } catch (error: any) {
      setError(`Failed to settle auction: ${error.message}`);
    }
  };

  // Network guard
  if (isCorrectNetwork === false) {
    return (
      <NetworkGuard 
        currentNetwork={currentNetwork}
        targetNetworkId={TARGET_NETWORK_ID}
        networkNames={NETWORK_NAMES}
      />
    );
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
            <p className="text-gray-400">
              Manage your bids, auctions, and withdrawals
            </p>
          </div>
          {ownerAuctions.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSettleEnabled}
                  onChange={(e) => setAutoSettleEnabled(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-electric-purple rounded"
                />
                <span className="text-sm text-gray-400">
                  <FaRobot className="inline mr-1" />
                  Auto-Settle
                </span>
              </label>
              <div className="relative group">
                <span className="text-xs text-gray-500">ⓘ</span>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-xs text-gray-300 rounded-lg shadow-lg z-10">
                  Automatically settles auctions 24 hours after they end
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Info */}
      <WalletInfo account={account} balance={balance} userBids={userBids} ownerAuctions={ownerAuctions} />

      {/* Status Messages */}
      <StatusMessage type="success" message={success} />
      <StatusMessage type="error" message={error} />

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
              Your Bids & Withdrawals ({userBids.length})
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

      {/* Content based on active tab */}
      {activeTab === 'bids' && (
        <UserBidsSection 
          userBids={userBids}
          withdrawing={withdrawing}
          withdrawBid={withdrawBid}
          loadDashboard={loadDashboard}
          loading={loading}
        />
      )}

      {activeTab === 'auctions' && (
        <OwnerAuctionsSection 
          ownerAuctions={ownerAuctions}
          declaringWinner={declaringWinner}
          endAuction={endAuction}
          settleAuction={settleAuction}
          declareWinner={declareWinner}
          onAutoSettle={handleAutoSettle}
          isAutoSettling={autoSettling}
          loadDashboard={loadDashboard}
          autoSettleEnabled={autoSettleEnabled}
        />
      )}

      {activeTab === 'manage' && (
        <AuctionList 
          allAuctions={allAuctions}
          account={account}
          loadDashboard={loadDashboard}
          loading={loading}
        />
      )}
    </div>
  );
}