// Create: privabid-frontend/app/test/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function TestPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const testContract = async () => {
      addLog('=== STARTING CONTRACT TEST ===');
      
      // 1. Check environment variable
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      addLog(`Env var: ${contractAddress}`);
      addLog(`Full env: ${JSON.stringify(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS)}`);
      
      if (!window.ethereum) {
        addLog('ERROR: No MetaMask installed');
        return;
      }

      // 2. Connect to provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      addLog(`Network: ${network.name} (${network.chainId})`);
      
      // 3. Check if contract exists
      const code = await provider.getCode(contractAddress!);
      addLog(`Contract code: ${code === '0x' ? 'NOT FOUND' : `Exists (${code.length} bytes)`}`);
      
      if (code === '0x') {
        addLog('ERROR: No contract at this address on current network');
        return;
      }

      // 4. Try minimal contract call with correct ABI
      const testABI = ['function getTestMessage() view returns (string)'];
      const contract = new ethers.Contract(contractAddress!, testABI, provider);
      
      try {
        const message = await contract.getTestMessage();
        addLog(`SUCCESS: getTestMessage = "${message}"`);
      } catch (error: any) {
        addLog(`FAILED: getTestMessage error: ${error.message}`);
        
        // Try alternative - maybe function has different name
        const altABI = ['function testMessage() view returns (string)'];
        const altContract = new ethers.Contract(contractAddress!, altABI, provider);
        try {
          const altMessage = await altContract.testMessage();
          addLog(`SUCCESS with alt name: testMessage = "${altMessage}"`);
        } catch (altError: any) {
          addLog(`Also failed: ${altError.message}`);
        }
      }
      
      addLog('=== TEST COMPLETE ===');
    };

    testContract();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Contract Debug Test</h1>
      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-auto">
        {logs.map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-electric-purple text-white rounded"
      >
        Run Test Again
      </button>
    </div>
  );
}