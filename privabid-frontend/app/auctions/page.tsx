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
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // Sepolia Hex ID

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
  
  // ✅ Network State
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean | null>(null);

  useEffect(() => {
    checkNetworkAndFetch();
    
    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  async function checkNetworkAndFetch() {
    if (window.ethereum) {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isSepolia = chainId === SEPOLIA_CHAIN_ID;
      setIsCorrectNetwork(isSepolia);
      
      if (isSepolia) {
        fetchAllAuctions();
      } else {
        setLoading(false);
      }
    } else {
      setError('Please install MetaMask to view auctions.');
      setLoading(false);
    }
  }

  async function handleSwitchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (err) {
      console.error("Failed to switch network", err);
    }
  }

  async function fetchAllAuctions() {
    try {
      setLoading(true);
      setError('');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const testMessage = await contract.getTestMessage();
      const nextId = await contract.nextAuctionId();
      const total = Number(nextId);
      setTotalAuctions(total);
      
      const auctionPromises = [];
      for (let i = 0; i < total; i++) {
        auctionPromises.push(fetchAuctionInfo(contract, i));
      }
      
      const results = await Promise.allSettled(auctionPromises);
      const validAuctions: AuctionCard[] = [];
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          validAuctions.push(result.value);
        }
      });
      
      validAuctions.sort((a, b) => b.id - a.id);
      setAuctions(validAuctions);
      
      setDebugInfo({
        contractAddress: CONTRACT_ADDRESS,
        testMessage,
        totalAuctions: total,
        fetchedAuctions: validAuctions.length,
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
      const [owner, description, endTime, isActive, bidCount, pendingWinner, , settled, bondAmount] = auctionInfo;
      
      const [title, ...descParts] = description.split(' | ');
      
      return {
        id: auctionId,
        title: title || `Auction #${auctionId}`,
        description: descParts.join(' | ') || 'No description provided',
        endTime: new Date(Number(endTime) * 1000),
        isActive: Boolean(isActive),
        bidCount: Number(bidCount),
        owner,
        pendingWinner,
        settled: Boolean(settled),
        bondAmount: ethers.formatEther(bondAmount)
      };
    } catch (error) {
      return null;
    }
  }

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-electric-purple mb-4 mx-auto"></div>
        <p className="text-gray-400">Syncing with Sepolia...</p>
      </div>
    );
  }

  // ✅ NETWORK GUARD UI
  if (isCorrectNetwork === false) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="text-7xl mb-6">🌐</div>
        <h2 className="text-3xl font-bold mb-4">Network Mismatch</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          PrivaBid Pro operates on the <strong>Sepolia Testnet</strong>. Please switch your wallet to continue.
        </p>
        <button
          onClick={handleSwitchNetwork}
          className="px-8 py-4 bg-gradient-to-r from-electric-purple to-deep-violet text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/20"
        >
          Switch to Sepolia
        </button>
      </div>
    );
  }

  // ✅ MAIN UI
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent inline-block">
            Private Auctions
          </h1>
          <p className="text-gray-400">
            {auctions.length} active auctions • {totalAuctions} total created
          </p>
        </div>
        
        <Link
          href="/auctions/create"
          className="px-6 py-3 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-3 group transition-all"
        >
          <FaPlus className="group-hover:rotate-90 transition-transform" />
          Create New Auction
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <StatCard icon={<FaEthereum />} label="Total Created" value={totalAuctions} />
        <StatCard icon={<FaClock />} label="Active" value={auctions.filter(a => a.isActive && a.endTime > new Date()).length} />
        <StatCard icon={<FaUsers />} label="Total Bids" value={auctions.reduce((sum, a) => sum + a.bidCount, 0)} />
        <StatCard icon={<FaEthereum />} label="Entry Bond" value={`${auctions[0]?.bondAmount || '0.01'} ETH`} />
      </div>

      {/* Auctions Grid */}
      {auctions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-12">
          <AuctionSection title="Active Auctions" filter={(a) => a.isActive && a.endTime > new Date()} auctions={auctions} />
          <AuctionSection title="Past Auctions" filter={(a) => !a.isActive || a.endTime <= new Date()} auctions={auctions} />
        </div>
      )}

      {/* Footer / Debug Section */}
      <div className="mt-20 pt-10 border-t border-white/10 text-center">
         <button onClick={() => setShowDebug(!showDebug)} className="text-xs text-gray-500 hover:text-white transition-colors mb-4">
            {showDebug ? '[-] Hide System Diagnostics' : '[+] Show System Diagnostics'}
         </button>
         {showDebug && debugInfo && (
           <pre className="text-[10px] text-yellow-500/70 bg-black/40 p-4 rounded-lg inline-block text-left">
             {JSON.stringify(debugInfo, null, 2)}
           </pre>
         )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ icon, label, value }: { icon: any, label: string, value: any }) {
  return (
    <div className="bg-obsidian/40 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-electric-purple/40 transition-colors">
      <div className="flex items-center text-gray-400 mb-2 gap-2 text-sm uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function AuctionSection({ title, filter, auctions }: { title: string, filter: (a: AuctionCard) => boolean, auctions: AuctionCard[] }) {
  const filtered = auctions.filter(filter);
  if (filtered.length === 0) return null;
  
  return (
    <section>
      <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${title.includes('Active') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`}></span>
        {title}
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(a => <AuctionCardComponent key={a.id} auction={a} />)}
      </div>
    </section>
  );
}

function AuctionCardComponent({ auction }: { auction: AuctionCard }) {
  const isEnded = auction.endTime.getTime() <= Date.now();
  return (
    <Link href={`/bid/${auction.id}`} className="group">
      <div className="bg-obsidian/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 h-full hover:border-electric-purple/50 transition-all hover:-translate-y-1 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold group-hover:text-electric-purple transition-colors truncate pr-4">{auction.title}</h3>
          <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">#{auction.id}</span>
        </div>
        <p className="text-gray-400 text-sm line-clamp-2 mb-6 h-10">{auction.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 p-3 rounded-xl text-center">
            <p className="text-[10px] text-gray-500 uppercase">Bids</p>
            <p className="font-bold">{auction.bidCount}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl text-center">
            <p className="text-[10px] text-gray-500 uppercase">Bond</p>
            <p className="font-bold">{auction.bondAmount} ETH</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-500">
           <span>{isEnded ? 'Ended' : 'Active'}</span>
           <span className="flex items-center gap-1 group-hover:text-electric-purple transition-colors">
             Bid Now <FaExternalLinkAlt size={10} />
           </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-obsidian/20 rounded-3xl border border-dashed border-white/10">
      <div className="text-5xl mb-4">🏷️</div>
      <h2 className="text-2xl font-bold mb-2 text-white">No Auctions Yet</h2>
      <p className="text-gray-400 mb-8">Be the first to create a secure, encrypted auction.</p>
      <Link href="/auctions/create" className="px-8 py-3 bg-electric-purple rounded-lg font-bold">Create Auction</Link>
    </div>
  );
}