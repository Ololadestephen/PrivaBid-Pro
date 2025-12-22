'use client';

export default function NetworkGuard({ 
  currentNetwork, 
  targetNetworkId, 
  networkNames 
}: { 
  currentNetwork: string;
  targetNetworkId: string;
  networkNames: Record<string, string>;
}) {
  const currentNetworkName = networkNames[currentNetwork] || `Chain ID: ${currentNetwork}`;
  const targetNetworkName = networkNames[targetNetworkId] || `Chain ID: ${targetNetworkId}`;

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">🌐</div>
      <h2 className="text-2xl font-bold mb-2">Wrong Network</h2>
      <p className="text-gray-400 mb-2">
        Current: <strong>{currentNetworkName}</strong>
      </p>
      <p className="text-gray-400 mb-4">
        Please switch to <strong>{targetNetworkName}</strong>
      </p>
      <button
        onClick={async () => {
          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetNetworkId }],
          });
        }}
        className="px-6 py-3 bg-electric-purple text-white rounded-lg hover:opacity-90"
      >
        Switch Network
      </button>
    </div>
  );
}