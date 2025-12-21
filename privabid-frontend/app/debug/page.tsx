// app/debug/page.tsx - DIRECT CONTRACT DEBUGGER
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { FaTerminal, FaBug, FaSearch, FaCopy, FaCheck } from 'react-icons/fa';

const CONTRACT_ADDRESS = '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

// Minimal ABI for testing
const CONTRACT_ABI = [
  "function nextAuctionId() view returns (uint256)",
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function submitSimpleBid(uint256 auctionId) payable",
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)"
];

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [auctionId, setAuctionId] = useState('0');
  const [bondAmount, setBondAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${msg}`;
    console.log(logEntry);
    setLogs(prev => [logEntry, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  async function testContract() {
    try {
      addLog('🚀 Starting contract test...');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Test 1: Basic contract info
      addLog('Testing getTestMessage()...');
      const testMessage = await contract.getTestMessage();
      addLog(`✅ getTestMessage: "${testMessage}"`);
      
      // Test 2: Get bond amount
      addLog('Getting BID_BOND()...');
      const bond = await contract.BID_BOND();
      const bondEth = ethers.formatEther(bond);
      setBondAmount(bondEth);
      addLog(`✅ BID_BOND: ${bondEth} ETH (${bond.toString()} wei)`);
      
      // Test 3: Get next auction ID
      addLog('Getting nextAuctionId()...');
      const nextId = await contract.nextAuctionId();
      addLog(`✅ nextAuctionId: ${nextId.toString()}`);
      
      // Test 4: Try to fetch auction 0
      addLog(`Fetching auction ${auctionId}...`);
      try {
        const auctionInfo = await contract.getAuctionInfo(auctionId);
        addLog(`✅ Auction ${auctionId} found!`);
        addLog(`  Owner: ${auctionInfo[0]}`);
        addLog(`  Description: ${auctionInfo[1]}`);
        addLog(`  End Time: ${new Date(Number(auctionInfo[2]) * 1000).toLocaleString()}`);
        addLog(`  Active: ${auctionInfo[3]}`);
        addLog(`  Bid Count: ${auctionInfo[4]}`);
        addLog(`  Pending Winner: ${auctionInfo[5]}`);
        addLog(`  Has Bids: ${auctionInfo[6]}`);
        addLog(`  Settled: ${auctionInfo[7]}`);
        addLog(`  Bond: ${ethers.formatEther(auctionInfo[8])} ETH`);
      } catch (auctionError: any) {
        addLog(`❌ Auction ${auctionId} error: ${auctionError.message}`);
      }
      
      addLog('✅ Contract connection successful!');
      
    } catch (error: any) {
      addLog(`❌ Contract test failed: ${error.message}`);
    }
  }

  async function testBid() {
    try {
      addLog('\n🎯 Testing bid submission...');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const id = parseInt(auctionId);
      const bond = await contract.BID_BOND();
      
      addLog(`Submitting bid to auction ${id} with ${ethers.formatEther(bond)} ETH bond...`);
      
      // Try to estimate gas first
      try {
        const gasEstimate = await contract.submitSimpleBid.estimateGas(id, {
          value: bond
        });
        addLog(`✓ Gas estimate: ${gasEstimate.toString()}`);
      } catch (gasError: any) {
        addLog(`✗ Gas estimate failed: ${gasError.message}`);
        throw gasError;
      }
      
      // Submit the bid
      const tx = await contract.submitSimpleBid(id, {
        value: bond,
        gasLimit: 200000
      });
      
      addLog(`✓ Transaction sent: ${tx.hash}`);
      addLog('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        addLog(`✅ Bid successful! Block: ${receipt.blockNumber}`);
      } else {
        addLog('❌ Bid transaction failed');
      }
      
    } catch (error: any) {
      addLog(`❌ Bid test failed: ${error.message}`);
      
      // Detailed error analysis
      if (error.message.includes('Already bid')) {
        addLog('⚠️ You have already bid on this auction');
      } else if (error.message.includes('Auction not active')) {
        addLog('⚠️ Auction is not active');
      } else if (error.message.includes('Incorrect bid bond')) {
        addLog(`⚠️ Wrong bond amount. Should be ${bondAmount} ETH`);
      }
    }
  }

  async function createAuction() {
    try {
      addLog('\n🏗️ Creating new auction...');
      
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const description = `Debug Auction ${Date.now()} | Created via debug tool`;
      const duration = 60; // 1 hour
      
      addLog(`Creating: "${description}" for ${duration} minutes`);
      
      const tx = await contract.createAuction(description, duration, {
        gasLimit: 300000
      });
      
      addLog(`✓ Creation tx: ${tx.hash}`);
      addLog('⏳ Waiting...');
      
      const receipt = await tx.wait();
      
      if (receipt?.status === 1) {
        // Get the new auction ID
        const nextId = await contract.nextAuctionId();
        const newId = Number(nextId) - 1;
        addLog(`✅ Auction #${newId} created successfully!`);
        setAuctionId(newId.toString());
      }
      
    } catch (error: any) {
      addLog(`❌ Auction creation failed: ${error.message}`);
    }
  }

  function copyLogs() {
    const logText = logs.join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function clearLogs() {
    setLogs([]);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <FaTerminal className="text-electric-purple" />
        Contract Debug Tool
      </h1>
      <p className="text-gray-400 mb-6">
        Direct interface to debug the auction contract
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaBug className="text-yellow-500" />
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Auction ID to Test
                </label>
                <input
                  type="number"
                  value={auctionId}
                  onChange={(e) => setAuctionId(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg"
                  min="0"
                />
              </div>
              
              <button
                onClick={testContract}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Test Contract Connection
              </button>
              
              <button
                onClick={testBid}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Test Bid Submission
              </button>
              
              <button
                onClick={createAuction}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create New Auction
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="flex gap-2">
                <button
                  onClick={copyLogs}
                  className="flex-1 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                  {copied ? 'Copied!' : 'Copy Logs'}
                </button>
                <button
                  onClick={clearLogs}
                  className="flex-1 py-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50"
                >
                  Clear Logs
                </button>
              </div>
            </div>
          </div>
          
          {/* Contract Info */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="font-bold mb-3">Contract Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Address:</span>
                <span className="font-mono">{CONTRACT_ADDRESS.slice(0, 10)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bond Amount:</span>
                <span>{bondAmount || '?'} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network:</span>
                <span>Sepolia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Panel */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl border border-gray-800 h-full flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaSearch />
                Debug Logs
              </h2>
              <div className="text-sm text-gray-500">
                {logs.length} log entries
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-600 text-center py-8">
                  Click "Test Contract Connection" to start debugging
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div 
                      key={index}
                      className={`p-2 rounded ${log.includes('✅') ? 'bg-green-900/20 text-green-400' : log.includes('❌') ? 'bg-red-900/20 text-red-400' : log.includes('⚠️') ? 'bg-yellow-900/20 text-yellow-400' : 'bg-gray-900/50 text-gray-300'}`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}