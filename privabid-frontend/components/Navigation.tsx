// components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaEthereum, FaWallet, FaBars, FaTimes, FaPlus } from 'react-icons/fa';
import { ethers } from 'ethers';

export default function Navbar() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);

      setAddress(address);
      setBalance(ethers.formatEther(balance));
      setIsConnected(true);
    } catch (error) {
      console.error('Connection error:', error);
    }
  }

  function disconnectWallet() {
    setAddress('');
    setBalance('');
    setIsConnected(false);
  }

  useEffect(() => {
    checkWalletConnection();
  }, []);

  async function checkWalletConnection() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const address = accounts[0];
          const balance = await provider.getBalance(address);
          
          setAddress(address);
          setBalance(ethers.formatEther(balance));
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-obsidian/80 backdrop-blur-md border-b border-electric-purple/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-electric-purple to-deep-violet rounded-xl flex items-center justify-center">
              <FaEthereum className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold">PrivaBid Pro</h1>
              <p className="text-xs text-gray-400">FHE Auctions</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/auctions" className="text-gray-300 hover:text-white transition-colors">
              Auctions
            </Link>
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link 
              href="/auctions/create" 
              className="px-4 py-2 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center gap-2"
            >
              <FaPlus /> Create Auction
            </Link>
            
            {/* Wallet Button */}
            {isConnected ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <div className="text-gray-400">Balance</div>
                  <div className="font-bold">{parseFloat(balance).toFixed(4)} ETH</div>
                </div>
                <div className="px-4 py-2 bg-electric-purple/20 text-electric-purple rounded-lg border border-electric-purple/30">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-obsidian border border-red-500/30 text-red-400 rounded-lg hover:bg-red-400/10"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-6 py-2 bg-gradient-to-r from-electric-purple to-deep-violet text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
              >
                <FaWallet />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 space-y-4 border-t border-electric-purple/30 pt-4">
            <Link 
              href="/" 
              className="block text-gray-300 hover:text-white py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/auctions" 
              className="block text-gray-300 hover:text-white py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Auctions
            </Link>
            <Link 
              href="/dashboard" 
              className="block text-gray-300 hover:text-white py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            
            <div className="pt-2 border-t border-electric-purple/30">
              <Link 
                href="/auctions/create" 
                className="block w-full py-3 bg-electric-purple text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaPlus /> Create Auction
              </Link>
            </div>
            
            {/* Wallet in mobile */}
            {isConnected ? (
              <div className="space-y-2 pt-4 border-t border-electric-purple/30">
                <div className="text-sm">
                  <div className="text-gray-400">Balance:</div>
                  <div className="font-bold">{parseFloat(balance).toFixed(4)} ETH</div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-400">Connected as:</div>
                  <div className="font-mono text-xs break-all">{address}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 bg-obsidian border border-red-500/30 text-red-400 rounded-lg hover:bg-red-400/10 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  connectWallet();
                  setIsMenuOpen(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-electric-purple to-deep-violet text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
              >
                <FaWallet />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}