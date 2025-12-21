// app/auctions/create/page.tsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { FaPlus, FaArrowLeft, FaSpinner, FaCheck, FaExclamationTriangle, FaClock, FaFileAlt, FaTag } from 'react-icons/fa';

const CONTRACT_ADDRESS = '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

const CONTRACT_ABI = [
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)",
  "function nextAuctionId() view returns (uint256)"
];

export default function CreateAuctionPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationDays: '1',
    durationHours: '0',
    durationMinutes: '0'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdAuctionId, setCreatedAuctionId] = useState<number | null>(null);
  const [bondAmount, setBondAmount] = useState('0.01');

  // Load bond amount on mount
  useState(() => {
    async function loadBond() {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
          const bond = await contract.BID_BOND();
          setBondAmount(ethers.formatEther(bond));
        }
      } catch (e) {
        console.log('Could not load bond amount:', e);
      }
    }
    loadBond();
  });

  const calculateTotalMinutes = () => {
    const days = parseInt(formData.durationDays) || 0;
    const hours = parseInt(formData.durationHours) || 0;
    const minutes = parseInt(formData.durationMinutes) || 0;
    return (days * 24 * 60) + (hours * 60) + minutes;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      // Validate
      if (!formData.title.trim()) {
        throw new Error('Please enter an auction title');
      }
      
      if (formData.title.length > 50) {
        throw new Error('Title must be 50 characters or less');
      }
      
      if (formData.description.length > 200) {
        throw new Error('Description must be 200 characters or less');
      }
      
      const totalMinutes = calculateTotalMinutes();
      if (totalMinutes < 5) {
        throw new Error('Duration must be at least 5 minutes');
      }
      if (totalMinutes > 10080) { // 1 week
        throw new Error('Duration cannot exceed 1 week (10080 minutes)');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Test connection
      await contract.getTestMessage();
      
      // Format description
      const fullDescription = `${formData.title} | ${formData.description || 'Private auction with encrypted bids'}`;
      
      setSuccess('Creating auction on blockchain...');
      
      const tx = await contract.createAuction(
        fullDescription,
        totalMinutes,
        { gasLimit: 300000 }
      );
      
      setSuccess('Transaction submitted. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        // Get the new auction ID
        const nextId = await contract.nextAuctionId();
        const newAuctionId = Number(nextId) - 1;
        
        setCreatedAuctionId(newAuctionId);
        setSuccess(`✅ Auction #${newAuctionId} created successfully!`);
        
        // Auto-redirect after delay
        setTimeout(() => {
          router.push(`/bid/${newAuctionId}`);
        }, 3000);
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error: any) {
      console.error('Create auction error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const totalMinutes = calculateTotalMinutes();
  const durationText = totalMinutes >= 1440 
    ? `${Math.floor(totalMinutes / 1440)} days ${Math.floor((totalMinutes % 1440) / 60)} hours`
    : totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)} hours ${totalMinutes % 60} minutes`
    : `${totalMinutes} minutes`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/auctions')}
          className="flex items-center gap-2 text-electric-purple hover:underline mb-6"
        >
          <FaArrowLeft /> Back to Auctions
        </button>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-electric-purple to-deep-violet rounded-xl flex items-center justify-center">
            <FaPlus className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Create New Auction</h1>
            <p className="text-gray-400">Set up a private auction with encrypted bids</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <FaTag className="text-gray-400" />
            Auction Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white focus:border-electric-purple focus:outline-none"
            placeholder="e.g., Rare NFT Collection #1"
            disabled={loading}
            required
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.title.length}/50 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <FaFileAlt className="text-gray-400" />
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white focus:border-electric-purple focus:outline-none h-32"
            placeholder="Describe the item being auctioned... (Optional)"
            disabled={loading}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/200 characters
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <FaClock className="text-gray-400" />
            Auction Duration
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({...formData, durationDays: e.target.value})}
                  className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white focus:border-electric-purple focus:outline-none"
                  min="0"
                  max="7"
                  disabled={loading}
                />
                <span className="absolute right-3 top-3 text-gray-400">days</span>
              </div>
            </div>
            <div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.durationHours}
                  onChange={(e) => setFormData({...formData, durationHours: e.target.value})}
                  className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white focus:border-electric-purple focus:outline-none"
                  min="0"
                  max="23"
                  disabled={loading}
                />
                <span className="absolute right-3 top-3 text-gray-400">hours</span>
              </div>
            </div>
            <div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})}
                  className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white focus:border-electric-purple focus:outline-none"
                  min="0"
                  max="59"
                  disabled={loading}
                />
                <span className="absolute right-3 top-3 text-gray-400">min</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Total duration: <span className="text-electric-purple font-medium">{durationText}</span>
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-blue-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-white mb-2">How PrivaBid Pro Works</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-electric-purple rounded-full mt-2"></div>
                  <span><strong>Bid Bond:</strong> Each bid requires a <span className="text-electric-purple">{bondAmount} ETH</span> bond (fully refundable for non-winners)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-electric-purple rounded-full mt-2"></div>
                  <span><strong>Encrypted Bids:</strong> All bid amounts are encrypted using Fully Homomorphic Encryption</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-electric-purple rounded-full mt-2"></div>
                  <span><strong>Privacy:</strong> No one can see bid amounts until auction ends (including the owner)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-electric-purple rounded-full mt-2"></div>
                  <span><strong>Winner:</strong> Highest bidder wins and gets their bond back plus the item</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className={`p-4 rounded-lg border ${
            success.includes('✅') 
              ? 'bg-gradient-to-r from-green-900/30 to-green-800/20 border-green-500/50 text-green-400' 
              : 'bg-gradient-to-r from-blue-900/30 to-purple-900/20 border-blue-500/50 text-blue-400'
          }`}>
            <div className="flex items-center gap-3">
              {success.includes('✅') ? (
                <FaCheck className="text-green-500 text-xl" />
              ) : (
                <FaSpinner className="animate-spin text-blue-500 text-xl" />
              )}
              <div>
                <p className="font-medium">{success}</p>
                {createdAuctionId && (
                  <p className="text-sm mt-1 opacity-90">
                    You will be redirected to auction #{createdAuctionId} in 3 seconds...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-red-500 text-xl" />
              <div>
                <p className="font-medium text-red-400">Error Creating Auction</p>
                <p className="text-sm mt-1 opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/auctions')}
            className="flex-1 py-4 bg-obsidian border border-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.title.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-electric-purple to-deep-violet text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Creating Auction...</span>
              </>
            ) : (
              <>
                <FaPlus />
                <span className="font-bold">Create Auction</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer Note */}
      <div className="mt-8 pt-6 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-500">
          Auction creation requires a blockchain transaction. You'll need to confirm it in MetaMask.
        </p>
      </div>
    </div>
  );
}