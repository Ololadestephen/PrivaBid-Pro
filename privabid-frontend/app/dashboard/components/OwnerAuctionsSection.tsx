'use client';

import { FaExclamationTriangle, FaGavel, FaRobot, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';
import WinnerDeclarationForm from './WinnerDeclarationForm';

interface OwnerAuctionsSectionProps {
  ownerAuctions: Array<{
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
  }>;
  declaringWinner: number | null;
  endAuction: (auctionId: number) => Promise<void>;
  settleAuction: (auctionId: number) => Promise<void>;
  declareWinner: (auctionId: number, winner: string, amount: string) => Promise<void>;
  onAutoSettle: (auctionId: number, isAutoTriggered?: boolean) => Promise<void>;
  isAutoSettling: number | null;
  loadDashboard: () => Promise<void>;
  autoSettleEnabled: boolean;
}

export default function OwnerAuctionsSection({ 
  ownerAuctions, 
  declaringWinner, 
  endAuction, 
  settleAuction, 
  declareWinner,
  onAutoSettle,
  isAutoSettling,
  loadDashboard,
  autoSettleEnabled
}: OwnerAuctionsSectionProps) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const handleManualSettle = async (auctionId: number) => {
    if (confirm('Are you sure you want to settle this auction? This will allow winners to withdraw their bonds.')) {
      await settleAuction(auctionId);
    }
  };

  const handleAutoSettle = async (auctionId: number) => {
    if (confirm('Are you sure you want to auto-settle this auction? This will allow winners to withdraw their bonds immediately.')) {
      await onAutoSettle(auctionId, false);
    }
  };

  if (ownerAuctions.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Auctions Needing Action */}
      {ownerAuctions.filter(auction => auction.canEnd || auction.canSettle || auction.canDeclareWinner || auction.canAutoSettle).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-yellow-400">
            <FaExclamationTriangle />
            Auctions Needing Action ({ownerAuctions.filter(auction => auction.canEnd || auction.canSettle || auction.canDeclareWinner || auction.canAutoSettle).length})
          </h3>
          <div className="space-y-3">
            {ownerAuctions
              .filter(auction => auction.canEnd || auction.canSettle || auction.canDeclareWinner || auction.canAutoSettle)
              .map(auction => (
                <div key={auction.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-yellow-500/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold">{auction.title}</h4>
                      <p className="text-sm text-gray-400">
                        Auction #{auction.auctionId} • {auction.bidCount} bids • 
                        Ended {auction.endTime.toLocaleDateString()}
                      </p>
                      {auction.pendingWinner && auction.pendingWinner !== ZERO_ADDRESS && (
                        <p className="text-sm text-gray-400 mt-1">
                          Winner: {auction.pendingWinner.slice(0, 8)}...{auction.pendingWinner.slice(-6)}
                        </p>
                      )}
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
                    
                    {auction.canSettle && !auction.canAutoSettle && (
                      <button
                        onClick={() => handleManualSettle(auction.auctionId)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Settle Auction
                      </button>
                    )}
                    
                    {auction.canAutoSettle && (
                      <button
                        onClick={() => handleAutoSettle(auction.auctionId)}
                        disabled={isAutoSettling === auction.auctionId}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm flex items-center gap-2"
                      >
                        {isAutoSettling === auction.auctionId ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Auto-Settling...
                          </>
                        ) : (
                          <>
                            <FaRobot />
                            Auto-Settle Now
                          </>
                        )}
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

                  {auction.canAutoSettle && (
                    <div className="mt-3 p-2 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded">
                      <div className="flex items-center gap-2 text-purple-300">
                        <FaRobot />
                        <span className="text-sm">This auction is eligible for auto-settlement</span>
                      </div>
                      <p className="text-xs text-purple-300/70 mt-1">
                        {autoSettleEnabled 
                          ? "Will auto-settle within 5 minutes if Auto-Settle is enabled"
                          : "Enable Auto-Settle in the header to automatically settle this auction"}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All Your Auctions */}
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <FaGavel />
          All Your Auctions ({ownerAuctions.length})
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
                    {auction.canAutoSettle && (
                      <span className="px-2 py-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 text-purple-300 text-xs rounded-full flex items-center gap-1">
                        <FaRobot className="text-xs" />
                        Auto-Settle
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Auction #{auction.auctionId} • {auction.bidCount} bids • 
                    {auction.isActive ? ` Ends ${auction.endTime.toLocaleDateString()}` : ' Ended'}
                  </p>
                  {auction.pendingWinner && auction.pendingWinner !== ZERO_ADDRESS && (
                    <p className="text-sm text-gray-400 mt-1">
                      Winner: {auction.pendingWinner.slice(0, 8)}...{auction.pendingWinner.slice(-6)}
                    </p>
                  )}
                  {auction.canAutoSettle && (
                    <p className="text-xs text-purple-400 mt-1">
                      ⚡ Eligible for auto-settlement
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
    </div>
  );
}