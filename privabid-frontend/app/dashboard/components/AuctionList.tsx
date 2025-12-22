
'use client';

import { FaSpinner } from 'react-icons/fa';
import Link from 'next/link';

interface AuctionListProps {
  allAuctions: any[];
  account: string;
  loadDashboard: () => Promise<void>;
  loading: boolean;
}

export default function AuctionList({ allAuctions, account, loadDashboard, loading }: AuctionListProps) {
  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-bold">All Auctions ({allAuctions.length})</h3>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2"
        >
          <FaSpinner className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      
      {allAuctions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏷️</div>
          <h3 className="text-xl font-bold mb-2">No Auctions Found</h3>
          <p className="text-gray-400">No auctions have been created yet</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAuctions.map(auction => {
            const isOwner = auction.owner.toLowerCase() === account.toLowerCase();
            const isWinner = auction.pendingWinner.toLowerCase() === account.toLowerCase();
            const timeRemaining = auction.endTime.getTime() - Date.now();
            const isEnded = timeRemaining <= 0;
            const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
            
            return (
              <div key={auction.id} className="bg-obsidian/60 p-4 rounded-lg border border-electric-purple/30">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold line-clamp-1">{auction.title}</h4>
                    <p className="text-sm text-gray-400">#{auction.id}</p>
                  </div>
                  {isOwner && (
                    <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                      Owner
                    </span>
                  )}
                  {isWinner && !isOwner && (
                    <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full">
                      Leading
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center p-2 bg-deep-violet/30 rounded">
                    <div className="text-xs text-gray-400">Bids</div>
                    <div className="font-bold">{auction.bidCount}</div>
                  </div>
                  <div className="text-center p-2 bg-deep-violet/30 rounded">
                    <div className="text-xs text-gray-400">Status</div>
                    <div className={`font-bold ${auction.isActive && !isEnded ? 'text-green-400' : 'text-gray-400'}`}>
                      {auction.isActive && !isEnded ? `${hoursRemaining}h` : 'Ended'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {auction.owner.slice(0, 6)}...{auction.owner.slice(-4)}
                  </div>
                  <Link
                    href={`/bid/${auction.id}`}
                    className="px-3 py-1 bg-electric-purple text-white rounded-lg text-sm hover:opacity-90"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}