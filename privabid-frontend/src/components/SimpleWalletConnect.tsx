// src/components/SimpleWalletConnect.tsx - WITH NEON PRIVACY THEME
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ABI = [
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)",
  "function nextAuctionId() view returns (uint256)",
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  "function submitSimpleBid(uint256 auctionId) payable",
  "function withdrawBid(uint256 auctionId)",
  "function endAuction(uint256 auctionId)",
  "function canWithdraw(uint256 auctionId, address bidder) view returns (bool)",
];

const CONTRACT_ADDRESS = "0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3";

export default function SimpleWalletConnect() {
  const [address, setAddress] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [auctions, setAuctions] = useState<any[]>([]);
  
  const [newAuctionDesc, setNewAuctionDesc] = useState('');
  const [newAuctionDuration, setNewAuctionDuration] = useState('60');
  const [bidAuctionId, setBidAuctionId] = useState('0');
  const [bidAmount, setBidAmount] = useState('100');

  useEffect(() => {
    if (connected && contract) {
      loadAuctions();
    }
  }, [connected, contract]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
        }
      }
      
      setAddress(accounts[0]);
      setConnected(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const ethersContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(ethersContract);
      
    } catch (error: any) {
      console.error('Connection failed:', error);
      alert(error.code === 4001 ? 'Connection rejected' : 'Connection failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAuctions = async () => {
    if (!contract) return;
    
    try {
      const count = await contract.nextAuctionId();
      const auctionArray = [];
      
      for (let i = 0; i < Number(count); i++) {
        try {
          const info = await contract.getAuctionInfo(i);
          auctionArray.push({
            id: i,
            description: info[1],
            endTime: Number(info[2]) * 1000,
            active: info[3],
            bidCount: Number(info[4]),
            pendingWinner: info[5],
            bondAmount: ethers.formatEther(info[8]),
          });
        } catch (e) {}
      }
      
      setAuctions(auctionArray);
    } catch (error) {
      console.error('Failed to load auctions:', error);
    }
  };

  const createAuction = async () => {
    if (!contract) {
      alert('Please connect wallet first');
      return;
    }
    
    if (!newAuctionDesc.trim()) {
      alert('Enter auction description');
      return;
    }
    
    try {
      setLoading(true);
      const tx = await contract.createAuction(newAuctionDesc, newAuctionDuration);
      alert(`✅ Auction creation submitted!\nTX Hash: ${tx.hash}`);
      await tx.wait();
      alert('🎉 Auction created successfully!');
      setNewAuctionDesc('');
      await loadAuctions();
    } catch (error: any) {
      alert(`❌ Failed: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitSimpleBid = async () => {
    if (!contract) {
      alert('Please connect wallet first');
      return;
    }
    
    try {
      setLoading(true);
      const bondAmount = await contract.BID_BOND();
      const tx = await contract.submitSimpleBid(bidAuctionId, { value: bondAmount });
      alert(`✅ Bid submitted!\nBond: ${ethers.formatEther(bondAmount)} ETH\nTX: ${tx.hash}`);
      await tx.wait();
      alert('🎉 Bid confirmed!');
      await loadAuctions();
    } catch (error: any) {
      alert(`❌ Failed: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0114] via-[#1A0B2E] to-[#0B0114] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="card-glass p-8 text-center neon-glow">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">🔐 PrivaBid</span> <span className="text-white">Pro</span>
          </h1>
          <p className="text-xl text-gray-300">
            Fully Homomorphic Encrypted Auctions • <span className="text-[#22D3EE]">Sepolia</span>
          </p>
          <div className="mt-6 flex justify-center">
            {!connected ? (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="btn-primary px-8 py-3 rounded-xl text-lg font-medium"
              >
                {loading ? 'Connecting...' : '🔗 Connect Wallet'}
              </button>
            ) : (
              <div className="bg-gradient-to-r from-[#581C87]/30 to-[#A855F7]/30 p-4 rounded-xl border border-[#A855F7]/30">
                <p className="font-medium text-[#F472B6]">🔓 Connected</p>
                <p className="text-sm text-gray-300 mt-1">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Auction */}
          <div className={`card-glass p-6 ${!connected ? 'opacity-80' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">🆕 Create Auction</h2>
              {!connected && (
                <span className="px-3 py-1 bg-[#581C87]/30 text-[#F472B6] rounded-full text-sm border border-[#A855F7]/30">
                  Connect to enable
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <input
                  type="text"
                  value={newAuctionDesc}
                  onChange={(e) => setNewAuctionDesc(e.target.value)}
                  placeholder="e.g., Rare NFT Auction"
                  disabled={!connected || loading}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={newAuctionDuration}
                  onChange={(e) => setNewAuctionDuration(e.target.value)}
                  min="1"
                  disabled={!connected || loading}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50"
                />
              </div>
              
              <button
                onClick={createAuction}
                disabled={!connected || loading || !newAuctionDesc.trim()}
                className={`w-full py-3 rounded-lg font-medium ${
                  connected 
                    ? 'btn-primary' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {!connected ? 'Connect Wallet to Create' : 
                 loading ? 'Creating Auction...' : 
                 '🚀 Create Auction'}
              </button>
            </div>
          </div>

          {/* Place Bid */}
          <div className={`card-glass p-6 ${!connected ? 'opacity-80' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">💰 Place Bid</h2>
              {!connected && (
                <span className="px-3 py-1 bg-[#581C87]/30 text-[#F472B6] rounded-full text-sm border border-[#A855F7]/30">
                  Connect to enable
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Auction ID</label>
                <input
                  type="number"
                  value={bidAuctionId}
                  onChange={(e) => setBidAuctionId(e.target.value)}
                  placeholder="0"
                  disabled={!connected || loading}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bid Amount (Encrypted)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={!connected || loading}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50"
                />
                <p className="text-sm text-gray-400 mt-1">
                  🔒 Encrypted with FHE before submission
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-[#581C87]/20 to-[#A855F7]/20 p-4 rounded-lg border border-[#A855F7]/30">
                <p className="font-medium text-[#F472B6]">⚠️ Required Bond: 0.01 ETH</p>
                <p className="text-sm text-gray-300 mt-1">
                  Non-winners can withdraw this bond after auction ends
                </p>
              </div>
              
              <button
                onClick={submitSimpleBid}
                disabled={!connected || loading || !bidAuctionId}
                className={`w-full py-3 rounded-lg font-medium ${
                  connected 
                    ? 'btn-primary' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {!connected ? 'Connect Wallet to Bid' : 
                 loading ? 'Submitting Bid...' : 
                 '🔐 Submit Encrypted Bid'}
              </button>
            </div>
          </div>
        </div>

        {/* Auctions List */}
        {connected && (
          <div className="card-glass p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">🏷️ Active Auctions</h2>
              <button
                onClick={loadAuctions}
                disabled={loading}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                {loading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>
            
            {auctions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-4">🏷️</div>
                <p className="text-lg">No auctions yet</p>
                <p className="text-sm mt-2">Create your first auction above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {auctions.map((auction) => (
                  <div key={auction.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#A855F7]/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-white">
                          #{auction.id}: {auction.description}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            auction.active 
                              ? 'bg-green-900/30 text-green-300 border border-green-700/30' 
                              : 'bg-red-900/30 text-red-300 border border-red-700/30'
                          }`}>
                            {auction.active ? '🟢 Active' : '🔴 Ended'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/30 text-sm">
                            {auction.bidCount} {auction.bidCount === 1 ? 'Bid' : 'Bids'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-300 border border-purple-700/30 text-sm">
                            Bond: {auction.bondAmount} ETH
                          </span>
                          <span className="px-3 py-1 rounded-full bg-gray-800/50 text-gray-300 border border-gray-700/30 text-sm">
                            Ends: {new Date(auction.endTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setBidAuctionId(auction.id.toString());
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="btn-primary px-4 py-2 rounded-lg text-sm"
                      >
                        Bid Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="card-glass p-8 border-l-4 border-[#A855F7]">
          <h3 className="text-2xl font-bold mb-6 gradient-text">🔐 About PrivaBid Pro</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-[#581C87]/20 to-transparent p-5 rounded-xl border border-[#A855F7]/20">
              <div className="text-3xl mb-3">🔏</div>
              <h4 className="font-bold text-white mb-2">FHE Encryption</h4>
              <p className="text-sm text-gray-300">Bid amounts remain encrypted, never revealed on-chain</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#A855F7]/20 to-transparent p-5 rounded-xl border border-[#F472B6]/20">
              <div className="text-3xl mb-3">💰</div>
              <h4 className="font-bold text-white mb-2">Bid Bonds</h4>
              <p className="text-sm text-gray-300">0.01 ETH bond prevents spam, non-winners get it back</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#F472B6]/20 to-transparent p-5 rounded-xl border border-[#22D3EE]/20">
              <div className="text-3xl mb-3">🏆</div>
              <h4 className="font-bold text-white mb-2">Privacy First</h4>
              <p className="text-sm text-gray-300">Only winning amount revealed, others stay private forever</p>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-6">
            <p className="text-gray-300 mb-3">
              <span className="font-medium text-[#F472B6]">Contract Address:</span>{' '}
              <code className="bg-black/30 px-3 py-1 rounded border border-white/10 font-mono">
                {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
              </code>
            </p>
            <a 
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              className="inline-flex items-center text-[#22D3EE] hover:text-[#F472B6] transition-colors"
            >
              🔗 View on Etherscan
              <span className="ml-2">→</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm pt-8 border-t border-white/10">
          <p>🔐 PrivaBid Pro • Private auctions with Fully Homomorphic Encryption</p>
          <p className="mt-2 text-xs">Built with ❤️ for the future of private, trustless commerce</p>
        </div>
      </div>
    </div>
  );
}