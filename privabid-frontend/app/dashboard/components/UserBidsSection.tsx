'use client';

import { FaMoneyBillWave, FaClock, FaHistory, FaSpinner, FaExternalLinkAlt, FaEye, FaInfoCircle, FaRobot } from 'react-icons/fa';
import Link from 'next/link';

interface UserBidsSectionProps {
  userBids: any[];
  withdrawing: number | null;
  withdrawBid: (bid: any) => Promise<void>;
  loadDashboard: () => Promise<void>;
  loading: boolean;
}

export default function UserBidsSection({ userBids, withdrawing, withdrawBid, loadDashboard, loading }: UserBidsSectionProps) {
  const getWithdrawalButtonText = (bid: any) => {
    if (bid.isWinner) {
      return bid.settled ? "Withdraw as Winner" : "Wait for Settlement";
    }
    return "Withdraw Bond";
  };

  const getWithdrawalButtonColor = (bid: any) => {
    if (!bid.canWithdraw) {
      return "bg-gray-600 hover:bg-gray-600 cursor-not-allowed";
    }
    if (bid.isWinner) {
      return "bg-yellow-600 hover:bg-yellow-700";
    }
    return "bg-green-600 hover:bg-green-700";
  };

  const WithdrawTooltip = ({ bid }: { bid: any }) => {
    if (!bid.canWithdraw) {
      return (
        <div className="mt-2 text-sm">
          <div className="flex items-center gap-1 text-yellow-400">
            <FaInfoCircle />
            <span>
              {bid.isWinner 
                ? "Winners can only withdraw after auction settlement" 
                : "Can only withdraw when auction has ended"}
            </span>
          </div>
          {bid.isWinner && !bid.settled && (
            <div className="mt-1">
              <p className="text-xs text-gray-400">
                This auction will be auto-settled 24 hours after ending.
              </p>
              <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                <FaRobot className="text-xs" />
                Owner has auto-settle enabled
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Filter for bids that are waiting for auto-settlement
  const getAutoSettleWaitingBids = () => {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return userBids.filter(bid => 
      bid.isWinner && 
      !bid.settled && 
      !bid.isActive && 
      bid.endTime.getTime() + twentyFourHours < Date.now()
    );
  };

  const autoSettleWaitingBids = getAutoSettleWaitingBids();

  if (userBids.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💸</div>
        <h3 className="text-xl font-bold mb-2">No Bids Found</h3>
        <p className="text-gray-400 mb-4">You haven't placed any bids yet</p>
        <Link
          href="/auctions"
          className="px-6 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 inline-block"
        >
          Browse Auctions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auto-Settle Waiting Section */}
      {autoSettleWaitingBids.length > 0 && (
        <div className="mb-6">
          <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/50 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-purple-300 mb-2">
              <FaRobot />
              <h3 className="font-bold">Auto-Settle in Progress</h3>
            </div>
            <p className="text-sm text-purple-300/80">
              These auctions will be automatically settled soon, allowing winners to withdraw bonds.
              Owners have 24 hours to manually settle before auto-settlement triggers.
            </p>
          </div>
        </div>
      )}

      {/* Withdrawable Bids */}
      {userBids.filter(bid => bid.canWithdraw && !bid.hasWithdrawn).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-400">
            <FaMoneyBillWave />
            Available for Withdrawal ({userBids.filter(bid => bid.canWithdraw && !bid.hasWithdrawn).length})
          </h3>
          <div className="space-y-3">
            {userBids
              .filter(bid => bid.canWithdraw && !bid.hasWithdrawn)
              .map(bid => (
                <div key={bid.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold">{bid.title}</h4>
                      <p className="text-sm text-gray-400">
                        Auction #{bid.auctionId} • Bond: {bid.bondAmount} ETH
                        {bid.isWinner && " • You are the winner"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/bid/${bid.auctionId}`}
                        className="px-3 py-1 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 flex items-center gap-1"
                      >
                        <FaExternalLinkAlt className="text-xs" /> View
                      </Link>
                      <button
                        onClick={() => withdrawBid(bid)}
                        disabled={withdrawing === bid.auctionId || !bid.canWithdraw}
                        className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                          getWithdrawalButtonColor(bid)
                        } ${withdrawing === bid.auctionId || !bid.canWithdraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {withdrawing === bid.auctionId ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Withdrawing...
                          </>
                        ) : (
                          <>
                            <FaMoneyBillWave />
                            {getWithdrawalButtonText(bid)}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <WithdrawTooltip bid={bid} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Active Bids */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <FaClock />
          Active Bids ({userBids.filter(bid => bid.isActive && !bid.canWithdraw).length})
        </h3>
        <div className="space-y-3">
          {userBids
            .filter(bid => bid.isActive && !bid.canWithdraw)
            .map(bid => (
              <div key={bid.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-electric-purple/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold">{bid.title}</h4>
                      {bid.isWinner && (
                        <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full">
                          Leading
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Auction #{bid.auctionId} • {bid.bidCount} bids • Ends {bid.endTime.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/bid/${bid.auctionId}`}
                      className="px-4 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                    >
                      <FaEye /> View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Ended Bids */}
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <FaHistory />
          Ended Bids ({userBids.filter(bid => !bid.isActive).length})
        </h3>
        <div className="space-y-3">
          {userBids
            .filter(bid => !bid.isActive)
            .map(bid => (
              <div key={bid.auctionId} className="bg-obsidian/60 p-4 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold">{bid.title}</h4>
                      {bid.isWinner ? (
                        <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                          Winner
                        </span>
                      ) : bid.canWithdraw ? (
                        <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full">
                          Can Withdraw
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                          Ended
                        </span>
                      )}
                      {bid.isWinner && !bid.settled && (
                        <span className="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded-full flex items-center gap-1">
                          <FaRobot className="text-xs" />
                          Auto-Settle Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Auction #{bid.auctionId} • {bid.bidCount} bids • Ended {bid.endTime.toLocaleDateString()}
                      {bid.isWinner && !bid.settled && " • Waiting for settlement"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/bid/${bid.auctionId}`}
                      className="px-3 py-1 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
                    >
                      View
                    </Link>
                    {bid.canWithdraw && !bid.hasWithdrawn && (
                      <button
                        onClick={() => withdrawBid(bid)}
                        disabled={withdrawing === bid.auctionId}
                        className={`px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${
                          bid.isWinner ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {withdrawing === bid.auctionId ? 'Withdrawing...' : getWithdrawalButtonText(bid)}
                      </button>
                    )}
                  </div>
                </div>
                <WithdrawTooltip bid={bid} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}