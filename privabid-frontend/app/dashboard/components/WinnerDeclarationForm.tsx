'use client';

import { useState } from 'react';
import { FaSpinner } from 'react-icons/fa';

interface WinnerDeclarationFormProps {
  auctionId: number;
  auctionTitle: string;
  pendingWinner: string;
  onDeclareWinner: (auctionId: number, winner: string, amount: string) => Promise<void>;
  isDeclaring: boolean;
}

export default function WinnerDeclarationForm({ 
  auctionId, 
  auctionTitle, 
  pendingWinner,
  onDeclareWinner,
  isDeclaring 
}: WinnerDeclarationFormProps) {
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