# nft-marketplace-project

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

# Delete all items within a collection
db. getCollection('orders'). deleteMany({})

# Exit the MongoDB shell
exit

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