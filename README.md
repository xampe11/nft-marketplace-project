NFT Marketplace

📖 Overview
A decentralized NFT marketplace built on Ethereum that allows users to list, buy, cancel, and update NFT listings. The platform uses smart contracts to enable secure peer-to-peer transactions where sellers maintain ownership of their NFTs until sold, with proceeds safely held for withdrawal.
✨ Features

List NFTs for Sale: Users can list their NFTs on the marketplace while retaining ownership until sold
Buy NFTs: Purchase listed NFTs directly with cryptocurrency
Cancel Listings: Sellers can remove their NFT from the marketplace at any time
Update Listings: Change the price of your listed NFTs
Withdraw Proceeds: Safely withdraw funds from your sales
Subgraph Integration: Real-time data updates via GraphQL

🚀 Getting Started
Prerequisites

Node.js 16+
Yarn or NPM
MetaMask or another Web3 wallet
Ethereum testnet funds for testing (Goerli, Sepolia, etc.)

Installation

Clone the repository

bashgit clone https://github.com/yourusername/nft-marketplace.git
cd nft-marketplace

Install dependencies

bashnpm install
# or
yarn install

Configure the environment

bashcp .env.example .env
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

Start the application

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


🔧 Usage
Connecting Your Wallet

Navigate to the home page
Connect your Web3 wallet when prompted
Ensure you're on a supported network

Listing an NFT

Navigate to the "Sell NFT" page
Enter the NFT contract address, token ID, and price
Approve the NFT for marketplace use (first transaction)
Confirm the listing transaction (second transaction)

Buying an NFT

Browse NFTs on the home page
Click on an NFT you want to purchase
Click "Buy" and confirm the transaction

Withdrawing Proceeds

Navigate to the "Sell NFT" page
Check your available proceeds at the bottom of the page
Click "Withdraw" to transfer funds to your wallet

📚 Smart Contract Reference
Key Functions
FunctionDescriptionlistItem(address, uint256, uint256)Lists an NFT with specified pricebuyItem(address, uint256)Purchases a listed NFTcancelItem(address, uint256)Cancels an NFT listingupdateListing(address, uint256, uint256)Updates price of a listed NFTwithdrawProceeds()Withdraws seller's accumulated proceedsgetListing(address, uint256)Gets listing informationgetProceeds(address)Gets available proceeds for a seller
🧪 Testing
Instructions on how to run tests:
bash# Run smart contract tests
npx hardhat test

# Run frontend tests
npm test
🗺️ Roadmap

 Basic marketplace functionality (list, buy, cancel)
 Frontend integration with React/Next.js
 GraphQL subgraph integration
 Bulk listing functionality
 Bidding system
 NFT collection creation tools
 Royalty support for creators

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
🙏 Acknowledgements

OpenZeppelin for secure smart contract libraries
Wagmi and viem for React/Ethereum integration
Apollo Client for GraphQL data fetching
The Graph Protocol for indexing blockchain data
Tailwind CSS for styling components
