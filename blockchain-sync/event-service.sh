#!/bin/bash

# Set the path to your event listener script
EVENT_LISTENER_SCRIPT="./blockchain-events.js"

# Check if the script exists
if [ ! -f "$EVENT_LISTENER_SCRIPT" ]; then
    echo "Error: Event listener script not found at $EVENT_LISTENER_SCRIPT"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Start the event listener as a PM2 process
echo "Starting NFT event listener service..."
pm2 start "$EVENT_LISTENER_SCRIPT" --name "nft-event-listener" --time

echo "NFT event listener service started. Use 'pm2 logs nft-event-listener' to view logs."
echo "Use 'pm2 stop nft-event-listener' to stop the service."