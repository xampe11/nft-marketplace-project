# NFT Marketplace

![NFT Marketplace](https://img.shields.io/badge/Project-NFT%20Marketplace-blue)
![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-brightgreen)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📖 Overview
A decentralized NFT marketplace built on Ethereum that allows users to list, buy, cancel, and update NFT listings. The platform uses smart contracts to enable secure peer-to-peer transactions where sellers maintain ownership of their NFTs until sold, with proceeds safely held for withdrawal.

## ✨ Features
• **List NFTs for Sale**: Users can list their NFTs on the marketplace while retaining ownership until sold
• **Buy NFTs**: Purchase listed NFTs directly with cryptocurrency
• **Cancel Listings**: Sellers can remove their NFT from the marketplace at any time
• **Update Listings**: Change the price of your listed NFTs
• **Withdraw Proceeds**: Safely withdraw funds from your sales
• **Subgraph Integration**: Real-time data updates via GraphQL

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Yarn or NPM
- MetaMask or another Web3 wallet
- Ethereum testnet funds for testing (Goerli, Sepolia, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nft-marketplace.git
cd nft-marketplace

# Install dependencies
npm install
# or
yarn install

# Configure the environment
cp .env.example .env
# Then edit .env with your configuration including RPC URLs and API keys

# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create a list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Create the data directory if it doesn't exist
sudo mkdir -p /data/db
sudo chown -R $USER /data/db

# Start MongoDB service
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Check if MongoDB is running
sudo systemctl status mongod

# Connect to MongoDB shell
mongosh

# In the MongoDB shell, create and use your database
use nft-marketplace

# Create a collection for your NFTs
db.createCollection("nfts")
db.createCollection("collections")
db.createCollection("transactions")

# Start the application

# Start MongoDB service
sudo systemctl start mongod

--------------------
# Run graphql local server
npm run start

--------------------
# Run hardhat local blockchain
npx hardhat node

--------------------
# Run event-listener
npx node blockchain-events.js

--------------------
# Run front-end
npm run dev

```

## 🔧 Usage

<details>
<summary><b>Connecting Your Wallet</b></summary>

1. Navigate to the home page
2. Connect your Web3 wallet when prompted
3. Ensure you're on a supported network
</details>

<details>
<summary><b>Listing an NFT</b></summary>

1. Navigate to the "Sell NFT" page
2. Enter the NFT contract address, token ID, and price
3. Approve the NFT for marketplace use (first transaction)
4. Confirm the listing transaction (second transaction)

```javascript
// Example code for listing an NFT
const nftAddress = "0x123..."; // Your NFT contract address
const tokenId = "1";           // Your NFT token ID
const price = "0.1";           // Price in ETH
```
</details>

<details>
<summary><b>Buying an NFT</b></summary>

1. Browse NFTs on the home page
2. Click on an NFT you want to purchase
3. Click "Buy" and confirm the transaction
</details>

<details>
<summary><b>Withdrawing Proceeds</b></summary>

1. Navigate to the "Sell NFT" page
2. Check your available proceeds at the bottom of the page
3. Click "Withdraw" to transfer funds to your wallet
</details>

## 📚 Smart Contract Reference

### Key Functions

| Function | Description |
|:---------|:------------|
| `listItem(address, uint256, uint256)` | Lists an NFT with specified price |
| `buyItem(address, uint256)` | Purchases a listed NFT |
| `cancelItem(address, uint256)` | Cancels an NFT listing |
| `updateListing(address, uint256, uint256)` | Updates price of a listed NFT |
| `withdrawProceeds()` | Withdraws seller's accumulated proceeds |
| `getListing(address, uint256)` | Gets listing information |
| `getProceeds(address)` | Gets available proceeds for a seller |

```solidity
// Key contract structures
struct Listing {
    uint256 price;
    address seller;
}

// Main mappings
mapping(address => mapping(uint256 => Listing)) private s_listings;
mapping(address => uint256) private s_proceeds;
```

## 🧪 Testing
Instructions on how to run tests:

```bash
# Run smart contract tests
npx hardhat test

# Run frontend tests
npm test
```

## 🗺️ Roadmap

| Status | Feature |
|:------:|:--------|
| ✅ | Basic marketplace functionality (list, buy, cancel) |
| ✅ | Frontend integration with React/Next.js |
| ✅ | GraphQL subgraph integration |
| 🔄 | Bulk listing functionality |
| 🔄 | Bidding system |
| 📅 | NFT collection creation tools |
| 📅 | Royalty support for creators |

> ✅ = Completed &nbsp;&nbsp;&nbsp;&nbsp; 🔄 = In Progress &nbsp;&nbsp;&nbsp;&nbsp; 📅 = Planned

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements
- [OpenZeppelin](https://www.openzeppelin.com/) for secure smart contract libraries
- [Wagmi](https://wagmi.sh/) and [Viem](https://viem.sh/) for React/Ethereum integration
- [Apollo Client](https://www.apollographql.com/docs/react/) for GraphQL data fetching
- [The Graph Protocol](https://thegraph.com/) for indexing blockchain data
- [Tailwind CSS](https://tailwindcss.com/) for styling components

---

<div align="center">
  <sub>Built with ❤️ for the Web3 community</sub>
</div>
