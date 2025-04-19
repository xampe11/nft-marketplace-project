const { ethers } = require("ethers");
const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} = require("@apollo/client/core");
const { gql } = require("@apollo/client/core");
const fetch = require("cross-fetch");
require("dotenv").config();

// Import NFT contract ABI
const NFT_CONTRACT_ABI = require("./abis/BasicNft.json");
const MARKETPLACE_CONTRACT_ABI = require("./abis/NftMarketplace.json");

// Import NFT and Marketplace addresses
const networkMapping = require("./abis/networkMapping.json");

// Set up ethers provider
const provider = new ethers.JsonRpcProvider(
  process.env.LOCAL_BLOCKCHAIN_URL,
  undefined,
  {
    polling: true,
    staticNetwork: true,
    pollingInterval: 4000, // 4 seconds
  }
);

// Main function
async function main() {
  const chainId = (await provider.getNetwork()).chainId;
  console.log("Connected to ChainId: ", chainId.toString());

  // Check if the networkMapping exists for this chainId
  const chainIdString = chainId.toString();
  if (!networkMapping[chainIdString]) {
    console.error(`No network mapping found for chainId ${chainIdString}`);
    console.log(
      "Available chainIds in network mapping:",
      Object.keys(networkMapping)
    );
    process.exit(1);
  }

  // Check if the BasicNft contract exists in the network mapping
  if (
    !networkMapping[chainIdString].BasicNft ||
    !networkMapping[chainIdString].BasicNft[0]
  ) {
    console.error(
      `BasicNft contract address not found for chainId ${chainIdString}`
    );
    console.log(
      "Available contracts:",
      Object.keys(networkMapping[chainIdString])
    );
    process.exit(1);
  }

  // Contract addresses
  const NFT_CONTRACT_ADDRESS = networkMapping[chainIdString].BasicNft[0];
  const MARKETPLACE_CONTRACT_ADDRESS =
    networkMapping[chainIdString].NftMarketplace[0];

  // Initialize contracts
  const nftContract = new ethers.Contract(
    NFT_CONTRACT_ADDRESS,
    NFT_CONTRACT_ABI,
    provider
  );

  const marketplaceContract = new ethers.Contract(
    MARKETPLACE_CONTRACT_ADDRESS,
    MARKETPLACE_CONTRACT_ABI,
    provider
  );

  // Set up Apollo Client
  const apolloClient = new ApolloClient({
    link: new HttpLink({ uri: process.env.GRAPHQL_API_URL, fetch }),
    cache: new InMemoryCache(),
  });

  // GraphQL mutations
  const CREATE_NFT = gql`
    mutation CreateNFT(
      $tokenId: String!
      $name: String!
      $description: String
      $image: String!
      $owner: String!
      $creator: String!
      $metadata: JSONObject
    ) {
      createNFT(
        tokenId: $tokenId
        name: $name
        description: $description
        image: $image
        owner: $owner
        creator: $creator
        metadata: $metadata
      ) {
        id
        tokenId
      }
    }
  `;

  const UPDATE_NFT_OWNER = gql`
    mutation UpdateNFT($id: ID!, $owner: String!) {
      updateNFT(id: $id, owner: $owner) {
        id
        owner
      }
    }
  `;

  const RECORD_TRANSACTION = gql`
    mutation RecordTransaction(
      $nftId: ID!
      $from: String!
      $to: String!
      $price: Float
      $currency: String
      $transactionType: TransactionType!
      $transactionHash: String!
    ) {
      recordTransaction(
        nftId: $nftId
        from: $from
        to: $to
        price: $price
        currency: $currency
        transactionType: $transactionType
        transactionHash: $transactionHash
      ) {
        id
      }
    }
  `;

  const GET_NFT_BY_TOKEN_ID = gql`
    query GetNFTByTokenId($tokenId: String!) {
      nftByTokenId(tokenId: $tokenId) {
        id
        tokenId
        name
        description
        image
        owner
        creator
        price
        currency
        isListed
      }
    }
  `;

  // Function to fetch NFT metadata from IPFS or other storage
  async function fetchMetadata(tokenURI) {
    try {
      // If tokenURI is an IPFS URI, convert to HTTP gateway URL
      if (tokenURI.startsWith("ipfs://")) {
        tokenURI = tokenURI.replace("ipfs://", process.env.IPFS_GATEWAY);
      }

      const response = await fetch(tokenURI);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching metadata from ${tokenURI}:`, error);
      return {
        name: "Unknown NFT",
        description: "Metadata could not be fetched",
        image: "",
      };
    }
  }

  // Function to find NFT by token ID
  async function findNFTByTokenId(tokenId) {
    try {
      const result = await apolloClient.query({
        query: GET_NFT_BY_TOKEN_ID,
        variables: { tokenId: tokenId.toString() },
        fetchPolicy: "network-only",
      });

      if (result.data.nftByTokenId) {
        return result.data.nftByTokenId;
      }
      return null;
    } catch (error) {
      console.error(`Error finding NFT with token ID ${tokenId}:`, error);
      // Extract and print the actual GraphQL error message
      if (
        error.networkError &&
        error.networkError.result &&
        error.networkError.result.errors
      ) {
        const graphqlErrors = error.networkError.result.errors;
        console.error(
          "GraphQL Error Details:",
          JSON.stringify(graphqlErrors, null, 2)
        );
      }
      return null;
    }
  }

  // Process Transfer event
  async function processTransferEvent(from, to, tokenId, event) {
    const txHash = event.log?.transactionHash || event.transactionHash;

    if (!txHash) {
      console.log("Event structure:", JSON.stringify(event, null, 2));
      throw new Error("Transaction hash not found in event");
    }

    console.log(`Processing Transfer: Token #${tokenId} from ${from} to ${to}`);

    // Check if this NFT already exists in our database
    const existingNFT = await findNFTByTokenId(tokenId);

    if (existingNFT) {
      // NFT exists, update owner
      try {
        await apolloClient.mutate({
          mutation: UPDATE_NFT_OWNER,
          variables: {
            id: existingNFT.id,
            owner: to,
          },
        });

        // Record transaction
        await apolloClient.mutate({
          mutation: RECORD_TRANSACTION,
          variables: {
            nftId: existingNFT.id,
            from,
            to,
            transactionType:
              from === "0x0000000000000000000000000000000000000000"
                ? "MINT"
                : "TRANSFER",
            transactionHash: txHash,
          },
        });

        console.log(`Updated owner of token #${tokenId} to ${to}`);
      } catch (error) {
        console.error(`Error updating NFT #${tokenId}:`, error);
      }
    } else if (from === "0x0000000000000000000000000000000000000000") {
      // This is a mint event and we don't have it in the database yet
      try {
        // Fetch token URI from contract
        const tokenURI = await nftContract.tokenURI(tokenId);
        const metadata = await fetchMetadata(tokenURI);

        // Create NFT in database
        const createResult = await apolloClient.mutate({
          mutation: CREATE_NFT,
          variables: {
            tokenId: tokenId.toString(),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || "",
            image: metadata.image || "",
            owner: to,
            creator: to,
            metadata,
          },
        });

        const newNftId = createResult.data.createNFT.id;

        // Record mint transaction
        await apolloClient.mutate({
          mutation: RECORD_TRANSACTION,
          variables: {
            nftId: newNftId,
            from: "0x0000000000000000000000000000000000000000",
            to,
            transactionType: "MINT",
            transactionHash: txHash,
          },
        });

        console.log(`Created new NFT for token #${tokenId}`);
      } catch (error) {
        console.error(`Error creating NFT for token #${tokenId}:`, error);
      }
    } else {
      // This is a transfer of a token we don't track yet
      console.log(`Token #${tokenId} transferred but not in our database`);
    }
  }

  // Process NFT Sale event
  async function processSaleEvent(tokenId, seller, buyer, price, event) {
    const txHash = event.log.transactionHash;

    console.log(
      `Processing Sale: Token #${tokenId} from ${seller} to ${buyer} for ${ethers.formatEther(
        price
      )} ETH`
    );

    const existingNFT = await findNFTByTokenId(tokenId);

    if (existingNFT) {
      try {
        // Update owner
        await apolloClient.mutate({
          mutation: UPDATE_NFT_OWNER,
          variables: {
            id: existingNFT.id,
            owner: buyer,
          },
        });

        // Record sale transaction
        await apolloClient.mutate({
          mutation: RECORD_TRANSACTION,
          variables: {
            nftId: existingNFT.id,
            from: seller,
            to: buyer,
            price: parseFloat(ethers.formatEther(price)),
            currency: "ETH",
            transactionType: "SALE",
            transactionHash: txHash,
          },
        });

        console.log(`Recorded sale of token #${tokenId}`);
      } catch (error) {
        console.error(`Error recording sale of NFT #${tokenId}:`, error);
      }
    } else {
      console.log(`Sale for token #${tokenId} but token not in our database`);
    }
  }

  async function processListingEvent(tokenId, seller, price, event) {
    const txHash = event.log?.transactionHash || event.transactionHash;

    if (!txHash) {
      console.log("Event structure:", JSON.stringify(event, null, 2));
      throw new Error("Transaction hash not found in event");
    }

    console.log(
      `Processing Listing: Token #${tokenId} listed by ${seller} for ${ethers.formatEther(
        price
      )} ETH`
    );

    const existingNFT = await findNFTByTokenId(tokenId);

    if (existingNFT) {
      try {
        // Update NFT listing status
        await apolloClient.mutate({
          mutation: gql`
            mutation UpdateNFTListing(
              $id: ID!
              $price: Float!
              $isListed: Boolean!
            ) {
              updateNFT(id: $id, price: $price, isListed: $isListed) {
                id
                isListed
                price
              }
            }
          `,
          variables: {
            id: existingNFT.id,
            price: parseFloat(ethers.formatEther(price)),
            isListed: true,
          },
        });

        // Record listing transaction
        await apolloClient.mutate({
          mutation: RECORD_TRANSACTION,
          variables: {
            nftId: existingNFT.id,
            from: seller,
            to: seller,
            price: parseFloat(ethers.formatEther(price)),
            currency: "ETH",
            transactionType: "LIST",
            transactionHash: txHash,
          },
        });

        console.log(`Recorded listing of token #${tokenId}`);
      } catch (error) {
        console.error(`Error recording listing of NFT #${tokenId}:`, error);
      }
    } else {
      console.log(`Token #${tokenId} not found. Creating new NFT record...`);

      try {
        // Fetch token metadata from the blockchain
        const tokenURI = await nftContract.tokenURI(tokenId);
        let metadata = {};
        let name = `NFT #${tokenId}`;
        let description = "";
        let image = "";

        // Try to fetch metadata if tokenURI is available
        if (tokenURI) {
          try {
            // Handle different URI formats (ipfs://, https://, etc.)
            const metadataURL = tokenURI.replace(
              "ipfs://",
              "https://ipfs.io/ipfs/"
            );
            const response = await fetch(metadataURL);
            metadata = await response.json();
            name = metadata.name || name;
            description = metadata.description || description;
            image = metadata.image || "";

            // Convert IPFS image URLs to gateway URLs if needed
            if (image.startsWith("ipfs://")) {
              image = image.replace("ipfs://", "https://ipfs.io/ipfs/");
            }
          } catch (metadataError) {
            console.error(
              `Error fetching metadata for token #${tokenId}:`,
              metadataError
            );
          }
        }

        // Create new NFT record
        const createResult = await apolloClient.mutate({
          mutation: gql`
            mutation CreateNFT(
              $tokenId: String!
              $name: String!
              $owner: String!
              $creator: String!
              $price: Float
            ) {
              createNFT(
                tokenId: $tokenId
                name: $name
                owner: $owner
                creator: $creator
                price: $price
              ) {
                id
                tokenId
                name
              }
            }
          `,
          variables: {
            tokenId: tokenId.toString(),
            name: name || `NFT #${tokenId}`,
            owner: seller,
            creator: seller,
            price: parseFloat(ethers.formatEther(price)),
          },
        });

        const newNFT = createResult.data.createNFT;
        console.log(
          `Created new NFT record for token #${tokenId} with ID: ${newNFT.id}`
        );

        // Now update it to be listed after creation
        await apolloClient.mutate({
          mutation: gql`
            mutation UpdateNFTListing(
              $id: ID!
              $price: Float!
              $isListed: Boolean!
            ) {
              updateNFT(
                id: $id
                input: { price: $price, isListed: $isListed }
              ) {
                id
                isListed
                price
              }
            }
          `,
          variables: {
            id: newNFT.id,
            price: parseFloat(ethers.formatEther(price)),
            isListed: true,
          },
        });

        // Record listing transaction for the newly created NFT
        await apolloClient.mutate({
          mutation: RECORD_TRANSACTION,
          variables: {
            nftId: newNFT.id,
            from: seller,
            to: seller,
            price: parseFloat(ethers.formatEther(price)),
            currency: "ETH",
            transactionType: "LIST",
            transactionHash: txHash,
          },
        });

        console.log(
          `Recorded listing transaction for newly created token #${tokenId}`
        );
      } catch (error) {
        console.error(
          `Error creating NFT record for token #${tokenId}:`,
          error
        );
      }
    }
  }

  // Process NFT Listing event
  /* async function processListingEvent(tokenId, seller, price, event) {
    const txHash = event.log?.transactionHash || event.transactionHash;

    if (!txHash) {
      console.log("Event structure:", JSON.stringify(event, null, 2));
      throw new Error("Transaction hash not found in event");
    }

    console.log(
      `Processing Listing: Token #${tokenId} listed by ${seller} for ${ethers.formatEther(
        price
      )} ETH`
    );

    const existingNFT = await findNFTByTokenId(tokenId);

    if (existingNFT) {
      try {
        // Update NFT listing status
        await apolloClient.mutate({
          mutation: gql`
            mutation UpdateNFTListing(
              $id: ID!
              $price: Float!
              $isListed: Boolean!
            ) {
              updateNFT(id: $id, price: $price, isListed: $isListed) {
                id
                isListed
                price
              }
            }
          `,
          variables: {
            id: existingNFT.id,
            price: parseFloat(ethers.formatEther(price)),
            isListed: true,
          },
        });

        // Record listing transaction
        await apolloClient.mutate({
          mutation: RECORD_TRANSACTION,
          variables: {
            nftId: existingNFT.id,
            from: seller,
            to: seller,
            price: parseFloat(ethers.formatEther(price)),
            currency: "ETH",
            transactionType: "LIST",
            transactionHash: txHash,
          },
        });

        console.log(`Recorded listing of token #${tokenId}`);
      } catch (error) {
        console.error(`Error recording listing of NFT #${tokenId}:`, error);
      }
    } else {
      console.log(
        `Listing for token #${tokenId} but token not in our database`
      );
    }
  } */

  // Process NFT Canceled Listing event
  async function processCanceledListingEvent(tokenId, seller, event) {
    const txHash = event.log.transactionHash;

    console.log(
      `Processing Canceled Listing: Token #${tokenId} unlisted by ${seller}`
    );

    const existingNFT = await findNFTByTokenId(tokenId);

    if (existingNFT) {
      try {
        // Update NFT listing status
        await apolloClient.mutate({
          mutation: gql`
            mutation CancelListing($id: ID!) {
              updateNFT(id: $id, isListed: false) {
                id
                isListed
              }
            }
          `,
          variables: {
            id: existingNFT.id,
          },
        });

        // Record cancel listing transaction
        await apolloClient.mutate({
          mutation: RECORD_TRANSACTION,
          variables: {
            nftId: existingNFT.id,
            from: seller,
            to: seller,
            transactionType: "UNLIST",
            transactionHash: txHash,
          },
        });

        console.log(`Recorded unlisting of token #${tokenId}`);
      } catch (error) {
        console.error(`Error recording unlisting of NFT #${tokenId}:`, error);
      }
    } else {
      console.log(
        `Unlisting for token #${tokenId} but token not in our database`
      );
    }
  }

  // Start listening to events
  async function startEventListeners() {
    console.log("Starting blockchain event listeners...");

    // Get latest block number
    const latestBlock = await provider.getBlockNumber();
    console.log(`Current block number: ${latestBlock}`);

    // You might want to store the last processed block in a database
    // to avoid reprocessing everything on restart
    const fromBlock = process.env.START_BLOCK
      ? parseInt(process.env.START_BLOCK)
      : latestBlock;

    // Process past events
    console.log(`Processing past events from block ${fromBlock}`);

    try {
      // Set up event listeners
      console.log("Setting up event listeners...");

      // Listen for Transfer events (minting and transfers)
      nftContract.on("Transfer", processTransferEvent);

      // Listen for marketplace events
      marketplaceContract.on("ItemListed", processListingEvent);
      marketplaceContract.on("ItemBought", processSaleEvent);
      marketplaceContract.on("ItemCanceled", processCanceledListingEvent);

      // Process past events
      console.log("Fetching past events...");

      // Get past Transfer events
      const transferFilter = nftContract.filters.Transfer();
      const pastTransferEvents = await nftContract.queryFilter(
        transferFilter,
        fromBlock
      );

      console.log(`Found ${pastTransferEvents.length} past Transfer events`);

      for (const event of pastTransferEvents) {
        const { from, to, tokenId } = event.args;
        await processTransferEvent(from, to, tokenId, event);
      }

      // Get past ItemListed events
      const itemListedFilter = marketplaceContract.filters.ItemListed();
      const pastItemListedEvents = await marketplaceContract.queryFilter(
        itemListedFilter,
        fromBlock
      );

      console.log(
        `Found ${pastItemListedEvents.length} past ItemListed events`
      );

      for (const event of pastItemListedEvents) {
        const { tokenId, seller, price } = event.args;
        await processListingEvent(tokenId, seller, price, event);
      }

      // Get past ItemBought events
      const ItemBoughtFilter = marketplaceContract.filters.ItemBought();
      const pastItemBoughtEvents = await marketplaceContract.queryFilter(
        ItemBoughtFilter,
        fromBlock
      );

      console.log(
        `Found ${pastItemBoughtEvents.length} past ItemBought events`
      );

      for (const event of pastItemBoughtEvents) {
        const { tokenId, seller, buyer, price } = event.args;
        await processSaleEvent(tokenId, seller, buyer, price, event);
      }

      // Get past ItemCanceled events
      const itemCanceledFilter = marketplaceContract.filters.ItemCanceled();
      const pastItemCanceledEvents = await marketplaceContract.queryFilter(
        itemCanceledFilter,
        fromBlock
      );

      console.log(
        `Found ${pastItemCanceledEvents.length} past ItemCanceled events`
      );

      for (const event of pastItemCanceledEvents) {
        const { tokenId, seller } = event.args;
        await processCanceledListingEvent(tokenId, seller, event);
      }

      console.log("Event listeners started");
    } catch (error) {
      console.error("Error setting up event listeners:", error);
      throw error;
    }
  }

  try {
    await startEventListeners();

    // Keep the process running to continue listening for events
    console.log("Listening for new events. Press Ctrl+C to exit.");
  } catch (error) {
    console.error("Error starting event listeners:", error);
    process.exit(1);
  }
}

// Run the main function
main();
