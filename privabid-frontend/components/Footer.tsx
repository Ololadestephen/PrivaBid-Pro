// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-obsidian border-t border-electric-purple/30 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">PrivaBid Pro</h3>
            <p className="text-gray-400 text-sm">
              Private auctions with fully homomorphic encrypted bids.
              Secure, transparent, and decentralized.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/auctions" className="hover:text-white">Auctions</a></li>
              <li><a href="/dashboard" className="hover:text-white">Dashboard</a></li>
              <li><a href="/create" className="hover:text-white">Create Auction</a></li>
              <li><a href="/how-it-works" className="hover:text-white">How it Works</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/docs" className="hover:text-white">Documentation</a></li>
              <li><a href="/faq" className="hover:text-white">FAQ</a></li>
              <li><a href="/security" className="hover:text-white">Security</a></li>
              <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Contract</h4>
            <div className="text-sm text-gray-400">
              <p className="font-mono text-xs break-all mb-2">
                0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3
              </p>
              <a 
                href="https://sepolia.etherscan.io/address/0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3"
                target="_blank"
                className="text-electric-purple hover:underline"
              >
                View on Etherscan →
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-electric-purple/30 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} PrivaBid Pro. All rights reserved.</p>
          <p className="mt-2">Built with Next.js, Tailwind CSS, and FHE technology.</p>
        </div>
      </div>
    </footer>
  );
}