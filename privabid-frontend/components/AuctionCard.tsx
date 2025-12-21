// components/AuctionCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaClock, FaGavel, FaLock, FaEthereum } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

interface AuctionCardProps {
  auction: {
    id: number | string;
    title: string;
    description: string;
    image: string;
    currentBids: number;
    endTime: string;
    startingBid: string;
    bond: string;
    category: string;
  };
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const timeRemaining = formatDistanceToNow(new Date(auction.endTime), { addSuffix: true });
  
  return (
    <div className="group bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/20 hover:border-electric-purple/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-electric-purple/10">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-deep-violet to-electric-purple">
        <Image
          src={auction.image}
          alt={auction.title}
          fill
          className="object-cover opacity-50 group-hover:opacity-70 transition-opacity"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-obsidian/80 text-xs rounded-full border border-electric-purple/30">
            {auction.category}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 bg-electric-purple/20 text-electric-purple text-xs rounded-full flex items-center">
            <FaLock className="mr-1" size={10} />
            Encrypted
          </span>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 group-hover:text-neon-cyan transition-colors">
          {auction.title}
        </h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {auction.description}
        </p>
        
        {/* Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-300">
              <FaGavel className="mr-2 text-electric-purple" />
              <span>{auction.currentBids} bids</span>
            </div>
            <div className="flex items-center text-gray-300">
              <FaClock className="mr-2 text-hot-pink" />
              <span>Ends {timeRemaining}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-electric-purple/20">
            <div>
              <div className="text-xs text-gray-500">Starting Bid</div>
              <div className="flex items-center font-bold">
                <FaEthereum className="mr-1" />
                {auction.startingBid} ETH
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Bid Bond</div>
              <div className="flex items-center font-bold text-neon-cyan">
                <FaEthereum className="mr-1" />
                {auction.bond} ETH
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Button */}
        <Link href={`/bid/${auction.id}`} className="block w-full mt-4">
          <button className="w-full py-2 bg-gradient-primary/10 text-electric-purple font-medium rounded-lg border border-electric-purple/30 hover:bg-gradient-primary hover:text-white transition-all duration-300">
            View Auction
          </button>
        </Link>
      </div>
    </div>
  );
}