// app/bid/layout.tsx
'use client';

import { ReactNode } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

interface BidLayoutProps {
  children: ReactNode;
}

export default function BidLayout({ children }: BidLayoutProps) {
  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col">
      {/* Top Header */}
      <header className="bg-obsidian/80 border-b border-electric-purple/30 p-4 flex items-center justify-between">
        <Link href="/auctions" className="flex items-center gap-2 text-electric-purple hover:underline">
          <FaArrowLeft /> Back to Auctions
        </Link>
        <h1 className="text-xl font-bold"></h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-obsidian/80 border-t border-electric-purple/30 p-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} PrivaBid. All rights reserved.
      </footer>
    </div>
  );
}
