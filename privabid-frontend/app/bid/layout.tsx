// app/bid/[id]/page.tsx - WITH NETWORK ERROR HANDLING
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'next/navigation';
import { FaClock, FaEthereum, FaUsers, FaLock, FaShieldAlt, FaWifi } from 'react-icons/fa';

const CONTRACT_ABI = [
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function BID_BOND() view returns (uint256)",
  "function submitSimpleBid(uint256 auctionId) payable"
];

const CONTRACT_ADDRESS = '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

// Try different RPCs
const RPC_URLS = [
  'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura
  'https://rpc.sepolia.org',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.gateway.tenderly.co'
];

export default function BidPage() {
  const params = useParams();
  const auctionId = Number(params.id);
  
  const [auction, setAuction] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('0.1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [bondAmount, setBondAmount] = useState('0.01');
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetails();
      connectWallet();
    }
  }, [auctionId]);

  async function getProvider() {
    // Try different RPCs until one works
    for (const rpcUrl of RPC_URLS) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        // Test the connection
        await provider.getNetwork();
        console.log(`Using RPC: ${rpcUrl}`);
        return provider;
      } catch (err) {
        console.log(`RPC ${rpcUrl} failed:`, err);
      }
    }
    throw new Error('All RPCs failed');
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask');
        return;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setUserAddress(address);
    } catch (error) {
      console.log('Wallet connection error:', error);
    }
  }

  async function fetchAuctionDetails() {
    try {
      setLoading(true);
      setNetworkError(false);

      const provider = await getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      try {
        const auctionInfo = await contract.getAuctionInfo(auctionId);
        const bond = await contract.BID_BOND();
        
        const [title, ...descParts] = auctionInfo[1].split(' | ');
        const description = descParts.join(' | ') || 'Private auction';

        let minimumBid = '0.1';
        const minMatch = description.match(/min:?\s*(\d+(?:\.\d+)?)\s*ETH/i);
        if (minMatch) minimumBid = minMatch[1];

        setAuction({
          id: auctionId,
          title: title || `Auction #${auctionId}`,
          description: description,
          endTime: new Date(Number(auctionInfo[2]) * 1000),
          isActive: auctionInfo[3],
          bidCount: Number(auctionInfo[4]),
          bondAmount: ethers.formatEther(auctionInfo[8]),
          minimumBid: minimumBid
        });

        setBondAmount(ethers.formatEther(bond));
      } catch (contractError) {
        console.log('Contract read failed, using fallback data');
        setAuction({
          id: auctionId,
          title: `Auction #${auctionId}`,
          description: 'Private auction with encrypted bids',
          endTime: new Date(Date.now() + 86400000),
          isActive: true,
          bidCount: 0,
          bondAmount: '0.01',
          minimumBid: '0.1'
        });
      }

    } catch (error: any) {
      console.error('Network error:', error);
      setNetworkError(true);
      setError('Network connection issue. Please try again.');
      
      // Set fallback data
      setAuction({
        id: auctionId,
        title: `Auction #${auctionId}`,
        description: 'Private auction',
        endTime: new Date(Date.now() + 86400000),
        isActive: true,
        bidCount: 0,
        bondAmount: '0.01',
        minimumBid: '0.1'
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    
    if (!bidAmount || !window.ethereum) {
      setError('Please connect wallet and enter amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus('Preparing transaction...');
      setError('');

      // Basic checks
      if (!auction?.isActive) throw new Error('Auction is not active');
      if (auction.endTime - new Date() <= 0) throw new Error('Auction has ended');

      const bidNum = parseFloat(bidAmount);
      const minBidNum = parseFloat(auction.minimumBid || '0.1');
      if (bidNum < minBidNum) {
        throw new Error(`Bid must be at least ${auction.minimumBid} ETH`);
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Calculate total
      const totalAmount = ethers.parseEther(bidAmount) + ethers.parseEther(bondAmount);
      
      setStatus('Sending transaction...');
      
      // Use the SIMPLEST bid function
      const tx = await contract.submitSimpleBid(
        auctionId,
        {
          value: totalAmount,
          gasLimit: 100000 // Conservative gas limit
        }
      );

      setStatus('Waiting for confirmation...');
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setStatus('✅ Bid submitted successfully!');
        // Refresh auction data
        await fetchAuctionDetails();
      } else {
        throw new Error('Transaction reverted');
      }

    } catch (error: any) {
      console.error('Bid error:', error);
      
      let errorMsg = error.message;
      
      // Handle network errors
      if (errorMsg.includes('HTTP request failed') || 
          errorMsg.includes('JSON') || 
          errorMsg.includes('network')) {
        errorMsg = 'Network error. Please check your connection and try again.';
        setNetworkError(true);
      } else if (errorMsg.includes('user rejected')) {
        errorMsg = 'Transaction was rejected in your wallet.';
      } else if (errorMsg.includes('insufficient funds')) {
        errorMsg = 'Insufficient balance. Need more ETH for bid + bond + gas.';
      } else if (errorMsg.includes('submitSimpleBid')) {
        errorMsg = 'Bid function not available. Try a different auction.';
      }
      
      setError(`Failed: ${errorMsg}`);
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-purple mb-4"></div>
        <p className="text-gray-400">Loading auction...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold mb-4">Auction Not Found</h2>
        <a href="/auctions" className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:opacity-90">
          Browse Auctions
        </a>
      </div>
    );
  }

  const timeRemaining = auction.endTime - new Date();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const isEnded = timeRemaining <= 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <a href="/auctions" className="text-electric-purple hover:underline">← Back to Auctions</a>
      </div>

      {networkError && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center">
            <FaWifi className="text-yellow-500 mr-2" />
            <span className="text-yellow-500">Network connection issue. Some data may be delayed.</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/30 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{auction.title}</h1>
                <p className="text-gray-300">{auction.description}</p>
                {networkError && (
                  <p className="text-yellow-500 text-sm mt-2">⚠️ Using fallback data due to network issues</p>
                )}
              </div>
              <div className="px-4 py-2 bg-electric-purple/20 text-electric-purple rounded-lg">
                Auction #{auction.id}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1">
                  <FaClock className="mr-2" />
                  <span className="text-sm">Time Left</span>
                </div>
                <div className={`text-xl font-bold ${isEnded ? 'text-red-400' : 'text-white'}`}>
                  {isEnded ? 'Ended' : `${hoursRemaining}h`}
                </div>
              </div>
              
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1">
                  <FaEthereum className="mr-2" />
                  <span className="text-sm">Minimum Bid</span>
                </div>
                <div className="text-xl font-bold">{auction.minimumBid} ETH</div>
              </div>
              
              <div className="bg-deep-violet/30 p-4 rounded-lg border border-electric-purple/20">
                <div className="flex items-center text-gray-400 mb-1">
                  <FaUsers className="mr-2" />
                  <span className="text-sm">Total Bids</span>
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
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  auction.isActive 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {auction.isActive ? 'Active' : 'Ended'}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-primary h-2 rounded-full"
                  style={{ width: `${Math.min(100, (100 - (hoursRemaining / 24) * 100))}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-deep-violet/30 rounded-lg p-4 border border-electric-purple/20">
              <div className="flex items-center mb-3">
                <FaShieldAlt className="text-electric-purple mr-2" />
                <h3 className="font-bold">Simple Bid Method</h3>
              </div>
              <p className="text-sm text-gray-300">
                Using the simplest bid function to avoid network issues.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/30 p-6 sticky top-6">
            <h2 className="text-2xl font-bold mb-6">Place Your Bid</h2>
            
            <form onSubmit={submitBid}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Bid Amount (ETH) *
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg focus:ring-2 focus:ring-electric-purple focus:border-transparent text-white"
                    placeholder={auction.minimumBid}
                    step="0.001"
                    min={auction.minimumBid}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: {auction.minimumBid} ETH
                  </p>
                </div>

                <div className="bg-deep-violet/20 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Bid Amount</span>
                    <span>{bidAmount || '0'} ETH</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Bond Fee</span>
                    <span>{bondAmount} ETH</span>
                  </div>
                  <div className="border-t border-electric-purple/30 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Required</span>
                      <span>{(parseFloat(bidAmount || '0') + parseFloat(bondAmount)).toFixed(4)} ETH</span>
                    </div>
                  </div>
                </div>

                {status && (
                  <div className="p-3 bg-electric-purple/10 border border-electric-purple/30 rounded-lg">
                    <div className="flex items-center">
                      <div className={`animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-electric-purple mr-3 ${isSubmitting ? '' : 'hidden'}`}></div>
                      <p className="text-electric-purple text-sm">{status}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isEnded || !auction.isActive || networkError}
                  className="w-full py-4 bg-gradient-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Bid'}
                </button>

                {(!auction.isActive || isEnded) && (
                  <p className="text-center text-red-400 text-sm">
                    This auction has ended
                  </p>
                )}

                {networkError && (
                  <p className="text-center text-yellow-500 text-sm">
                    ⚠️ Network issues may affect bidding
                  </p>
                )}

                <div className="text-center text-xs text-gray-500 mt-4">
                  <p>Simple bid method for reliability</p>
                  <p>Check network connection if issues persist</p>
                </div>
              </div>
            </form>
          </div>

          {userAddress && (
            <div className="mt-4 p-4 bg-obsidian/40 rounded-lg border border-electric-purple/20">
              <p className="text-sm text-gray-400">Connected as:</p>
              <p className="font-mono text-sm break-all">{userAddress}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}