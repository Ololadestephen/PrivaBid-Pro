'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { FaLock, FaShieldAlt, FaRocket, FaChartLine, FaArrowRight, FaEthereum, FaUsers, FaGavel } from 'react-icons/fa';

const CONTRACT_ABI = [
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)",
  "function nextAuctionId() view returns (uint256)",
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function getContractBalance() view returns (uint256)"
];

const CONTRACT_ADDRESS = '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

export default function Home() {
  const [stats, setStats] = useState({
    activeAuctions: 0,
    totalVolume: '0',
    encryptedBids: 0,
    activeBidders: 0,
    contractBalance: '0'
  });
  const [loading, setLoading] = useState(true);
  const [contractStatus, setContractStatus] = useState('');

  useEffect(() => {
    fetchContractData();
  }, []);

  async function fetchContractData() {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        setContractStatus('Install MetaMask to see live data');
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Test connection
      const testMessage = await contract.getTestMessage();
      setContractStatus(`Connected: "${testMessage}"`);

      // Get auction count
      const nextId = await contract.nextAuctionId();
      const totalAuctions = Math.max(0, Number(nextId) - 1);

      // Get contract balance
      const balance = await contract.getContractBalance();
      const contractBalance = ethers.formatEther(balance);

      // Calculate active auctions and total bids
      let activeCount = 0;
      let totalBids = 0;
      
      for (let i = 1; i <= totalAuctions; i++) {
        try {
          const auction = await contract.getAuctionInfo(i);
          if (auction[3]) { // isActive
            activeCount++;
          }
          totalBids += Number(auction[4]); // bidCount
        } catch (err) {
          console.log(`Error fetching auction ${i}:`, err.message);
        }
      }

      // Estimate unique bidders (simplified - count auctions with bids)
      const estimatedBidders = Math.min(totalBids, activeCount * 3);

      setStats({
        activeAuctions: activeCount,
        totalVolume: parseFloat(contractBalance).toFixed(2),
        encryptedBids: totalBids,
        activeBidders: estimatedBidders,
        contractBalance: contractBalance
      });

    } catch (error: any) {
      console.error('Error fetching contract data:', error);
      setContractStatus('Using demo data - Connect wallet for real stats');
      
      // Fallback demo data
      setStats({
        activeAuctions: 3,
        totalVolume: '42.5',
        encryptedBids: 24,
        activeBidders: 18,
        contractBalance: '0.5'
      });
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: <FaLock className="text-3xl" />,
      title: 'Fully Encrypted Bids',
      description: 'Your bid amounts are encrypted using FHE technology before submission',
      color: 'from-electric-purple to-deep-violet',
    },
    {
      icon: <FaShieldAlt className="text-3xl" />,
      title: 'Zero-Knowledge Proofs',
      description: 'Verify auction integrity without revealing any bid information',
      color: 'from-hot-pink to-purple-600',
    },
    {
      icon: <FaRocket className="text-3xl" />,
      title: 'Instant Settlement',
      description: 'Automated winner selection and instant fund distribution',
      color: 'from-neon-cyan to-blue-500',
    },
    {
      icon: <FaChartLine className="text-3xl" />,
      title: 'Real-time Analytics',
      description: 'Track auction performance with encrypted data insights',
      color: 'from-green-400 to-emerald-600',
    },
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-electric-purple/20 text-electric-purple rounded-full text-sm border border-electric-purple/30">
            <div className={`w-2 h-2 rounded-full ${contractStatus.includes('Connected') ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            {contractStatus || 'Connecting to contract...'}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Private Auctions with{' '}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Fully Homomorphic Encryption
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
            Bid privately on Ethereum. Your bids remain encrypted until the auction ends, 
            ensuring complete confidentiality with cutting-edge FHE technology.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auctions"
              className="px-8 py-3 bg-gradient-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
            >
              <span>Explore Auctions</span>
              <FaArrowRight />
            </Link>
            <button
              onClick={fetchContractData}
              className="px-8 py-3 bg-obsidian border border-electric-purple/30 text-white font-bold rounded-lg hover:bg-electric-purple/10 transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-electric-purple"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <FaGavel />
                  <span>Refresh Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-obsidian/50 p-4 md:p-6 rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-electric-purple/20 text-electric-purple flex items-center justify-center">
                  <FaGavel />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-white">
                    {loading ? '...' : stats.activeAuctions}
                  </div>
                  <div className="text-xs md:text-sm text-gray-400">Active Auctions</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Live from contract
              </div>
            </div>
            
            <div className="bg-obsidian/50 p-4 md:p-6 rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center">
                  <FaEthereum />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-white">
                    {loading ? '...' : stats.totalVolume}
                  </div>
                  <div className="text-xs md:text-sm text-gray-400">ETH in Contract</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Total locked value
              </div>
            </div>
            
            <div className="bg-obsidian/50 p-4 md:p-6 rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-hot-pink/20 text-hot-pink flex items-center justify-center">
                  <FaLock />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-white">
                    {loading ? '...' : stats.encryptedBids}
                  </div>
                  <div className="text-xs md:text-sm text-gray-400">Encrypted Bids</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Total bids placed
              </div>
            </div>
            
            <div className="bg-obsidian/50 p-4 md:p-6 rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 text-neon-cyan flex items-center justify-center">
                  <FaUsers />
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-white">
                    {loading ? '...' : stats.activeBidders}
                  </div>
                  <div className="text-xs md:text-sm text-gray-400">Active Bidders</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Estimated unique bidders
              </div>
            </div>

            <div className="bg-obsidian/50 p-4 md:p-6 rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  🔗
                </div>
                <div>
                  <div className="text-lg md:text-xl font-bold text-white font-mono truncate">
                    0xd2db...2a4a3
                  </div>
                  <div className="text-xs md:text-sm text-gray-400">Contract Address</div>
                </div>
              </div>
              <a 
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                className="text-xs text-electric-purple hover:underline block mt-1"
              >
                View on Etherscan
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Auctions Preview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Recent{' '}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Auctions
                </span>
              </h2>
              <p className="text-gray-300">
                {stats.activeAuctions > 0 
                  ? `${stats.activeAuctions} live auctions with encrypted bidding` 
                  : 'No active auctions yet'}
              </p>
            </div>
            <Link
              href="/auctions"
              className="px-6 py-2 bg-electric-purple/20 text-electric-purple rounded-lg border border-electric-purple/30 hover:bg-electric-purple/30 transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {loading ? (
              // Loading skeletons
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-obsidian/60 p-6 rounded-2xl border border-electric-purple/20 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                </div>
              ))
            ) : stats.activeAuctions > 0 ? (
              // Real auction previews (limited to 3)
              Array(Math.min(3, stats.activeAuctions)).fill(0).map((_, i) => (
                <div key={i} className="bg-obsidian/60 p-6 rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Auction #{i + 1}</h3>
                      <p className="text-sm text-gray-400">Active • FHE Encrypted</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      Live
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Private auction with encrypted bids. Bid amounts remain confidential.
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <div className="text-gray-400">Bond</div>
                      <div className="font-bold text-neon-cyan">0.01 ETH</div>
                    </div>
                    <Link 
                      href={`/bid/${i + 1}`}
                      className="px-4 py-2 bg-electric-purple/20 text-electric-purple rounded-lg border border-electric-purple/30 hover:bg-electric-purple/30 text-sm"
                    >
                      View Auction
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              // No auctions message
              <div className="col-span-3 text-center py-12">
                <div className="text-6xl mb-4">🏷️</div>
                <h3 className="text-2xl font-bold mb-3">No Active Auctions</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Be the first to create an auction! Connect your wallet and create a private auction.
                </p>
                <Link
                  href="/create"
                  className="inline-block px-6 py-3 bg-gradient-primary text-white rounded-lg hover:opacity-90"
                >
                  Create First Auction
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose{' '}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                PrivaBid Pro
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the future of private auctions with our cutting-edge technology stack
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-obsidian/60 backdrop-blur-sm p-6 rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 transition-all duration-300 group hover:scale-105"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 text-white group-hover:animate-float`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-deep-violet/50 to-obsidian/50 rounded-3xl p-8 md:p-12 border border-electric-purple/30">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Bid{' '}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Privately?
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join the future of private auctions. Connect your wallet and start bidding with complete confidentiality.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auctions"
                  className="px-8 py-3 bg-gradient-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Browse Auctions
                </Link>
                <Link
                  href="/create"
                  className="px-8 py-3 bg-obsidian border border-electric-purple/30 text-white font-bold rounded-lg hover:bg-electric-purple/10 transition-colors"
                >
                  Create Auction
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}