// app/auctions/create/page.tsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { FaPlus, FaArrowLeft, FaSpinner, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const CONTRACT_ADDRESS = '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

const CONTRACT_ABI = [
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)"
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
      
      const totalMinutes = calculateTotalMinutes();
      if (totalMinutes < 1) {
        throw new Error('Duration must be at least 1 minute');
      }
      if (totalMinutes > 10080) { // 1 week
        throw new Error('Duration cannot exceed 1 week');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Test connection
      await contract.getTestMessage();
      
      // Format description
      const fullDescription = `${formData.title} | ${formData.description || 'Private auction'}`;
      
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
          className="flex items-center gap-2 text-electric-purple hover:underline mb-4"
        >
          <FaArrowLeft /> Back to Auctions
        </button>
        
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <FaPlus className="text-electric-purple" />
          Create New Auction
        </h1>
        <p className="text-gray-400">
          Set up a private auction with encrypted bids
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Auction Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white"
            placeholder="e.g., Rare NFT Collection #1"
            disabled={loading}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white h-32"
            placeholder="Describe the item being auctioned..."
            disabled={loading}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Auction Duration
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({...formData, durationDays: e.target.value})}
                  className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white"
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
                  className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white"
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
                  className="w-full px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white"
                  min="0"
                  max="59"
                  disabled={loading}
                />
                <span className="absolute right-3 top-3 text-gray-400">min</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Total duration: <span className="text-electric-purple">{durationText}</span>
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-blue-400 mt-1" />
            <div>
              <h3 className="font-bold text-white mb-1">Important Information</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Each bid requires a 0.01 ETH bond (refundable)</li>
                <li>• Auction end time is based on blockchain timestamp</li>
                <li>• Only auction owner can settle the auction</li>
                <li>• Bids are encrypted for privacy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className={`p-4 rounded-lg border ${
            success.includes('✅') 
              ? 'bg-green-900/30 border-green-500/50 text-green-400' 
              : 'bg-blue-900/30 border-blue-500/50 text-blue-400'
          }`}>
            <div className="flex items-center gap-2">
              {success.includes('✅') ? <FaCheck /> : <FaSpinner className="animate-spin" />}
              <span>{success}</span>
            </div>
            {createdAuctionId && (
              <p className="mt-2 text-sm">
                Redirecting to auction #{createdAuctionId} in 3 seconds...
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle />
              <span className="font-bold">Error:</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/auctions')}
            className="flex-1 py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.title.trim()}
            className="flex-1 py-4 bg-electric-purple text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FaPlus />
                Create Auction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}