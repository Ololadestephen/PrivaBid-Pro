import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import NetworkChecker from '@/components/NetworkChecker'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PrivaBid Pro - Private Auction Platform',
  description: 'Fully encrypted auctions using FHE technology',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Additional head elements can be added here */}
      </head>
      <body 
        className={`${inter.className} min-h-screen bg-gradient-neon text-white antialiased`}
        suppressHydrationWarning
      >
        {/* ✅ Network Checker added at the root level */}
        <NetworkChecker />

        <div className="min-h-screen">
          {/* Animated background elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-electric-purple/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-60 -left-40 w-80 h-80 bg-hot-pink/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-40 right-1/4 w-60 h-60 bg-neon-cyan/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>
          
          <header className="relative border-b border-electric-purple/20 bg-obsidian/70 backdrop-blur-sm z-50">
            <Navigation />
          </header>
          
          <main className="relative z-10">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="relative mt-12 pt-8 pb-6 border-t border-electric-purple/20 bg-obsidian/70 backdrop-blur-sm z-20">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-6 md:mb-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full"></div>
                    <div>
                      <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        PrivaBid Pro
                      </h2>
                      <p className="text-sm text-gray-400">FHE-Powered Private Auctions</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center md:text-right">
                  <p className="text-gray-400 mb-2">
                    🔗{' '}
                    <a 
                      href="https://sepolia.etherscan.io/address/0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon-cyan hover:text-neon-cyan/80 hover:underline"
                    >
                      View Contract on Etherscan
                    </a>
                  </p>
                  <p className="text-sm text-gray-500">
                    Built with <span className="text-hot-pink">❤️</span> for private, trustless auctions
                  </p>
                </div>
              </div>
              
              {/* Footer badges */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['FHE-Powered', 'Zero-Knowledge', 'On-Chain Privacy', 'Sepolia Testnet'].map((badge) => (
                  <span 
                    key={badge}
                    className="px-3 py-1 bg-electric-purple/10 text-electric-purple rounded-full text-xs border border-electric-purple/20"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}