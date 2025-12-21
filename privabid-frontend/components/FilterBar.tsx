'use client';

import { FaFilter, FaSearch, FaSort } from 'react-icons/fa';
import { useState } from 'react';

export default function FilterBar() {
  const [search, setSearch] = useState('');
  
  return (
    <div className="bg-obsidian/60 backdrop-blur-sm rounded-2xl border border-electric-purple/20 p-4 mb-8">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="flex-1 w-full">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search auctions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-purple"
            />
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          <select className="px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white focus:outline-none focus:border-electric-purple">
            <option value="">All Categories</option>
            <option value="NFT">NFT</option>
            <option value="Art">Art</option>
            <option value="Tokens">Tokens</option>
            <option value="Collectibles">Collectibles</option>
          </select>
          
          <select className="px-4 py-3 bg-obsidian border border-electric-purple/30 rounded-lg text-white focus:outline-none focus:border-electric-purple">
            <option value="">Sort By</option>
            <option value="ending">Ending Soon</option>
            <option value="new">Newest</option>
            <option value="bids">Most Bids</option>
          </select>
          
          <button className="px-4 py-3 bg-electric-purple/20 border border-electric-purple/30 rounded-lg text-electric-purple hover:bg-electric-purple/30 transition-colors">
            <FaFilter />
          </button>
        </div>
      </div>
    </div>
  );
}