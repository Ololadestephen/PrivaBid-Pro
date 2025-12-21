// app/auctions/page.tsx - FINAL VERSION
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { 
  FaPlus, 
  FaExclamationTriangle, 
  FaSpinner, 
  FaExternalLinkAlt,
  FaEthereum,
  FaUsers,
  FaClock,
  FaBug
} from 'react-icons/fa';

const CONTRACT_ADDRESS = '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

const CONTRACT_ABI = [
  "function nextAuctionId() view returns (uint256)",
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)"
];

interface AuctionCard {
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
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [totalAuctions, setTotalAuctions] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetchAllAuctions();
  }, []);

  async function fetchAllAuctions() {
    try {
      setLoading(true);
      setError('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Test connection first
      const testMessage = await contract.getTestMessage();
      
      // Get total number of auctions
      const nextId = await contract.nextAuctionId();
      const total = Number(nextId);
      setTotalAuctions(total);
      
      console.log(`Found ${total} total auctions`);
      
      // Fetch ALL auctions
      const auctionPromises = [];
      for (let i = 0; i < total; i++) {
        auctionPromises.push(fetchAuctionInfo(contract, i));
      }
      
      const results = await Promise.allSettled(auctionPromises);
      
      const validAuctions: AuctionCard[] = [];
      const errors: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validAuctions.push(result.value);
        } else {
          errors.push(`Auction ${index}: ${result.reason}`);
        }
      });
      
      // Sort by ID (newest first)
      validAuctions.sort((a, b) => b.id - a.id);
      
      setAuctions(validAuctions);
      
      setDebugInfo({
        contractAddress: CONTRACT_ADDRESS,
        testMessage,
        totalAuctions: total,
        fetchedAuctions: validAuctions.length,
        failedAuctions: errors.length,
      });
      
    } catch (error: any) {
      console.error('Error fetching auctions:', error);
      setError(`Failed to load auctions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuctionInfo(contract: ethers.Contract, auctionId: number): Promise<AuctionCard | null> {
    try {
      const auctionInfo = await contract.getAuctionInfo(auctionId);
      
      // Parse the auction data
      const [owner, description, endTime, isActive, bidCount, pendingWinner, hasBids, settled, bondAmount] = auctionInfo;
      
      // Extract title from description (format: "Title | Description")
      const [title, ...descParts] = description.split(' | ');
      const cleanDescription = descParts.join(' | ') || 'No description provided';
      
      return {
        id: auctionId,
        title: title || `Auction #${auctionId}`,
        description: cleanDescription,
        endTime: new Date(Number(endTime) * 1000),
        isActive: Boolean(isActive),
        bidCount: Number(bidCount),
        owner,
        pendingWinner,
        settled: Boolean(settled),
        bondAmount: ethers.formatEther(bondAmount)
      };
    } catch (error) {
      console.error(`Error fetching auction ${auctionId}:`, error);
      return null;
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-purple mb-4 mx-auto"></div>
        <p className="text-gray-400">Loading auctions...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Private Auctions</h1>
          <p className="text-gray-400">
            {auctions.length} active auctions • {totalAuctions} total created
          </p>
        </div>
        
        <Link
          href="/auctions/create"
          className="px-6 py-3 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-3 group"
        >
          <FaPlus className="group-hover:rotate-90 transition-transform" />
          Create New Auction
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-obsidian/60 p-4 rounded-xl border border-electric-purple/30">
          <div className="flex items-center text-gray-400 mb-1">
            <FaEthereum className="mr-2" />
            <span className="text-sm">Total Auctions</span>
          </div>
          <div className="text-2xl font-bold">{totalAuctions}</div>
        </div>
        
        <div className="bg-obsidian/60 p-4 rounded-xl border border-electric-purple/30">
          <div className="flex items-center text-gray-400 mb-1">
            <FaClock className="mr-2" />
            <span className="text-sm">Active Now</span>
          </div>
          <div className="text-2xl font-bold">
            {auctions.filter(a => a.isActive && a.endTime > new Date()).length}
          </div>
        </div>
        
        <div className="bg-obsidian/60 p-4 rounded-xl border border-electric-purple/30">
          <div className="flex items-center text-gray-400 mb-1">
            <FaUsers className="mr-2" />
            <span className="text-sm">Total Bids</span>
          </div>
          <div className="text-2xl font-bold">
            {auctions.reduce((sum, auction) => sum + auction.bidCount, 0)}
          </div>
        </div>
        
        <div className="bg-obsidian/60 p-4 rounded-xl border border-electric-purple/30">
          <div className="flex items-center text-gray-400 mb-1">
            <FaEthereum className="mr-2" />
            <span className="text-sm">Bond Amount</span>
          </div>
          <div className="text-2xl font-bold flex items-center gap-1">
            <FaEthereum className="text-electric-purple" />
            {auctions.length > 0 ? auctions[0].bondAmount : '0.01'} ETH
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <FaExclamationTriangle />
            <span className="font-bold">Error:</span>
          </div>
          <p className="mt-1">{error}</p>
          <button
            onClick={fetchAllAuctions}
            className="mt-3 px-4 py-2 bg-red-700 text-white rounded-lg text-sm hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Auctions Grid */}
      {auctions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏷️</div>
          <h2 className="text-2xl font-bold mb-2">No Auctions Found</h2>
          <p className="text-gray-400 mb-6">
            Create your first private auction to get started
          </p>
          <Link
            href="/auctions/create"
            className="px-8 py-3 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-2 mx-auto inline-block"
          >
            <FaPlus /> Create First Auction
          </Link>
        </div>
      ) : (
        <>
          {/* Active Auctions */}
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Active Auctions
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions
                .filter(auction => auction.isActive && auction.endTime > new Date())
                .map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
            </div>
          </div>

          {/* Ended Auctions */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              Ended Auctions
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions
                .filter(auction => !auction.isActive || auction.endTime <= new Date())
                .map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
            </div>
          </div>
        </>
      )}

      {/* Debug Info Section (at the bottom) */}
      <div className="mt-12 pt-8 border-t border-gray-800">
        {/* Debug Toggle Button */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mx-auto mb-6"
        >
          <FaBug />
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>

        {/* Debug Panel */}
        {showDebug && debugInfo && (
          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-yellow-500/30">
            <h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <FaExclamationTriangle /> Contract Debug Info
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><span className="text-gray-400">Contract Address:</span></p>
                <p className="font-mono text-xs break-all">{debugInfo.contractAddress}</p>
                <p><span className="text-gray-400">Status:</span> {debugInfo.testMessage || 'Unknown'}</p>
              </div>
              <div className="space-y-2">
                <p><span className="text-gray-400">Total Auctions:</span> {debugInfo.totalAuctions}</p>
                <p><span className="text-gray-400">Successfully Loaded:</span> {debugInfo.fetchedAuctions || 0}</p>
                <p><span className="text-gray-400">Failed to Load:</span> {debugInfo.failedAuctions || 0}</p>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={fetchAllAuctions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
              >
                <FaSpinner className={loading ? 'animate-spin' : ''} />
                Refresh Data
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                  alert('Debug info copied to clipboard!');
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
              >
                Copy Debug Info
              </button>
            </div>
          </div>
        )}

        {/* Contract Info Footer */}
        <div className="text-center">
          <div className="inline-flex items-center gap-4 text-sm text-gray-500 mb-2">
            <span>Contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</span>
            <span>•</span>
            <span>Network: Sepolia</span>
            <span>•</span>
            <span>Loaded: {auctions.length}/{totalAuctions} auctions</span>
          </div>
          <p className="text-xs text-gray-600">
            Some auctions may not display if they have invalid data or are inactive.
          </p>
        </div>
      </div>
    </div>
  );
}

// Auction Card Component
function AuctionCard({ auction }: { auction: AuctionCard }) {
  const timeRemaining = auction.endTime.getTime() - Date.now();
  const isEnded = timeRemaining <= 0;
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));
  
  const isActive = auction.isActive && !isEnded;
  
  return (
    <Link 
      href={`/bid/${auction.id}`} 
      className="group block"
    >
      <div className="bg-obsidian/60 backdrop-blur-sm rounded-xl border border-electric-purple/30 p-5 h-full hover:border-electric-purple/60 hover:bg-obsidian/80 transition-all hover:translate-y-[-2px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1 group-hover:text-electric-purple transition-colors line-clamp-1">
              {auction.title}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2">
              {auction.description}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-lg text-sm ${
            isActive 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-700 text-gray-400'
          }`}>
            #{auction.id}
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-900/30 text-green-400 border border-green-500/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {isActive ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Active • {hoursRemaining}h {minutesRemaining}m left
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                Ended
              </>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-deep-violet/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Bids</div>
            <div className="font-bold text-lg">{auction.bidCount}</div>
          </div>
          
          <div className="text-center p-2 bg-deep-violet/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Bond</div>
            <div className="font-bold text-lg flex items-center justify-center gap-1">
              <FaEthereum className="text-electric-purple text-sm" />
              {auction.bondAmount}
            </div>
          </div>
          
          <div className="text-center p-2 bg-deep-violet/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Status</div>
            <div className={`font-bold text-lg ${auction.settled ? 'text-green-400' : 'text-yellow-400'}`}>
              {auction.settled ? 'Settled' : 'Pending'}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-electric-purple/20">
          <div className="text-xs text-gray-500">
            {auction.owner.slice(0, 6)}...{auction.owner.slice(-4)}
          </div>
          <div className="flex items-center gap-2 text-electric-purple text-sm">
            <span>View Auction</span>
            <FaExternalLinkAlt className="text-xs group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}