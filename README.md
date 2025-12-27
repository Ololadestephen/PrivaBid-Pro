
# 🛡️ PrivaBid Pro — FHE-Powered Private Auction Platform

> **A fully private auction platform using Fully Homomorphic Encryption (FHE) on Ethereum.**
> Bids remain encrypted until auction completion, ensuring maximum privacy and fairness.

---

## 🚀 Live Demo
## 🎥 Demo Video
[![PrivaBid Demo](https://img.youtube.com/vi/ltax-nSa7oQ/0.jpg)](https://www.youtube.com/watch?v=ltax-nSa7oQ)
* **🌐 Frontend**: [https://privabid.vercel.app](https://privabid.vercel.app)
* **📜 Contract**: `0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3`
* **🐙 GitHub**: [https://github.com/Ololadestephen/PrivaBid-Pro](https://github.com/Ololadestephen/PrivaBid-Pro)

---

## ✨ Features

| Feature                | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| 🛡️ Encrypted Bidding  | Bid amounts encrypted using FHE (Fully Homomorphic Encryption) |
| 🔒 One-Bid-Per-Address | Prevents bid manipulation and spam                             |
| 💰 Bond System         | 0.01 ETH refundable bond per bid (anti-spam)                   |
| 🤖 Automated Settlement | Auctions finalize automatically after ending (owner signature only)             |
| 📊 Dashboard           | Complete bid and auction management interface                  |
| ⚡ Real-time Updates    | Live auction status and bid tracking                           |
| 🔐 Wallet Integration  | MetaMask support with network validation                       |

---

## 🏗️ Architecture

```mermaid
graph TB
    A[User Frontend] --> B[Next.js 14 + TypeScript]
    B --> C[Ethers.js v6]
    C --> D[PrivaBid Smart Contract]
    D --> E[FHE Encryption Layer]
    E --> F[Encrypted Bid Storage (On-chain)]

    G[MetaMask Wallet] --> C
    H[Vercel Hosting] --> B
    I[Sepolia Testnet] --> D

    style A fill:#6d28d9,color:#fff
    style D fill:#1a0b2e,color:#fff
```

---

## 📁 Project Structure

```
PrivaBid-Pro/
├── privabid-frontend/           # Next.js 14 Frontend Application
│   ├── app/                     # App Router (Next.js 13+)
│   │   ├── auctions/            # Auction listing & creation
│   │   ├── bid/[id]/            # Individual bid pages
│   │   ├── dashboard/           # User dashboard
│   │   ├── layout.tsx           # Root layout with providers
│   │   └── page.tsx             # Landing page
│   ├── components/              # Reusable UI components
│   ├── constants/               # Contract ABIs & addresses
│   ├── public/                  # Static assets
│   └── package.json             # Frontend dependencies
├── privabid-fhevm/                   # Hardhat Smart Contract Project
│   ├── contracts/
│   │   └── PrivaBidAuction.sol  # Main auction contract
│   ├── scripts/                 # Deployment scripts
│   ├── test/                    # Comprehensive test suite
│   ├── hardhat.config.ts        # Hardhat configuration
│   └── package.json             # Contract dependencies
├── lib/                         # Shared FHEVM utilities
├── .env.example                 # Environment template
├── .gitignore                   # Git exclusion rules
└── README.md                    # This file
```

---

## 🛠️ Quick Start

### Prerequisites

* Node.js 18+
* MetaMask wallet with Sepolia ETH
* Git

---

### 1. Clone Repository

```bash
git clone https://github.com/Ololadestephen/PrivaBid-Pro.git
cd PrivaBid-Pro
```

---

### 2. Smart Contracts Development

```bash
cd privabid-fhevm
npm install
cp .env.example .env

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

---

### 3. Frontend Development

```bash
cd privabid-frontend
npm install

npm run dev
# Open http://localhost:3000
```

---

### 4. Production Build

```bash
cd frontend
npm run build
npm start

# Or deploy to Vercel
vercel --prod
```

---

## 📜 Smart Contract Details

### Contract Address

```
0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3
```

### Key Functions

```solidity
function createAuction(string description, uint256 durationMinutes)
function submitEncryptedBid(uint256 auctionId, bytes encryptedAmount)
function submitSimpleBid(uint256 auctionId) payable

function withdrawBid(uint256 auctionId)
function endAuction(uint256 auctionId)
function settleAuction(uint256 auctionId)
function declareWinner(uint256 auctionId, address winner, uint256 amount)

function getAuctionInfo(uint256 auctionId) view returns (...)
function canWithdrawAdvanced(uint256 auctionId, address bidder) view
function isHighestBidder(uint256 auctionId, address bidder) view
```

---

## 🛡️ Security & Privacy

### FHE Implementation

* Client-side bid encryption using FHE
* Encrypted bids stored fully on-chain
* No bid visibility before auction end

### Security Measures

* Reentrancy protection
* Input validation
* Owner-only privileged functions
* Bond-based anti-spam system
* Time-locked auction settlement

---

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
npx hardhat test
```

**Test Coverage**

* Auction creation
* Encrypted bid submission
* Double-bid prevention
* Bond withdrawal
* Winner declaration
* Auction state validation

---

## 🌐 Deployment

### Vercel (Frontend)

1. Connect GitHub repo
2. Set **Root Directory** → `privabid-frontend`
3. Add environment variables:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3
```

---

## 📊 Performance Metrics

| Metric             | Value    |
| ------------------ | -------- |
| Contract Size      | ~24.5 KB |
| Create Auction Gas | ~180,000 |
| Bid Gas            | ~120,000 |
| Frontend Load      | < 2s     |
| Tx Confirmation    | < 3s     |

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push branch
5. Open Pull Request

---

## 📝 License

MIT License — see `LICENSE`

---

## 👨‍💻 Author

**Ololade Stephen**
GitHub: [https://github.com/Ololadestephen](https://github.com/Ololadestephen)

Built for **Builder Track Program**

---

## 🙏 Acknowledgments

* FHEVM Team
* Hardhat
* Vercel
* Sepolia Testnet

---

⭐ **Star this repository if you found it useful**
🐛 **Issues and PRs are welcome**

> **PrivaBid Pro** — Where privacy meets decentralized auctions.
