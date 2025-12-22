'use client';

import { FaWallet, FaEthereum, FaTrophy, FaGavel } from 'react-icons/fa';

interface WalletInfoProps {
  account: string;
  balance: string;
  userBids: any[];
  ownerAuctions: any[];
}

export default function WalletInfo({ account, balance, userBids, ownerAuctions }: WalletInfoProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <div className="bg-obsidian/60 p-6 rounded-xl border border-electric-purple/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-electric-purple to-deep-violet rounded-lg flex items-center justify-center">
            <FaWallet className="text-xl" />
          </div>
          <div>
            <h3 className="font-bold">Wallet</h3>
            <p className="text-sm text-gray-400">{account.slice(0, 8)}...{account.slice(-6)}</p>
          </div>
        </div>
        <div className="text-2xl font-bold flex items-center gap-2">
          <FaEthereum className="text-electric-purple" />
          {parseFloat(balance).toFixed(4)} ETH
        </div>
      </div>
      
      <div className="bg-obsidian/60 p-6 rounded-xl border border-electric-purple/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center">
            <FaTrophy className="text-xl" />
          </div>
          <div>
            <h3 className="font-bold">Active Bids</h3>
            <p className="text-sm text-gray-400">Placed by you</p>
          </div>
        </div>
        <div className="text-2xl font-bold">
          {userBids.filter(bid => bid.isActive).length}
        </div>
      </div>
      
      <div className="bg-obsidian/60 p-6 rounded-xl border border-electric-purple/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-700 rounded-lg flex items-center justify-center">
            <FaGavel className="text-xl" />
          </div>
          <div>
            <h3 className="font-bold">Your Auctions</h3>
            <p className="text-sm text-gray-400">Created by you</p>
          </div>
        </div>
        <div className="text-2xl font-bold">
          {ownerAuctions.length}
        </div>
      </div>
    </div>
  );
}