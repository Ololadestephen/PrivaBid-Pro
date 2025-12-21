'use client';

import { useEffect } from 'react';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

export default function NetworkChecker() {
  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return;
      
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (chainId !== SEPOLIA_CHAIN_ID) {
          console.log('Wrong network. Current:', chainId, 'Expected:', SEPOLIA_CHAIN_ID);
          
          // Try to switch automatically
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: SEPOLIA_CHAIN_ID }],
            });
            console.log('Switched to Sepolia successfully');
          } catch (switchError: any) {
            // If network not added, add it
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: SEPOLIA_CHAIN_ID,
                  chainName: 'Sepolia Test Network',
                  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://sepolia.infura.io/v3/'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
              });
            }
          }
        }
      } catch (error) {
        console.error('Network check failed:', error);
      }
    };

    checkNetwork();
    
    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return null; // This is an invisible component
}