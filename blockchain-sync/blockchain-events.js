const { Web3 } = require("web3");
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

// Set up Web3
const web3 = new Web3(process.env.LOCAL_BLOCKCHAIN_URL);

// Main function
async function main() {
  const chainId = await web3.eth.getChainId();

  /* const chainId = await web3.eth.getChainId();
      console.log(`Connected to chain ID: ${chainId}`); */

  // Check if the networkMapping exists for this chainId
  if (!networkMapping[chainId]) {
    console.error(`No network mapping found for chainId ${chainId}`);
    console.log(
      "Available chainIds in network mapping:",
      Object.keys(networkMapping)
    );
    process.exit(1);
  }

  // Check if the BasicNft contract exists in the network mapping
  if (
    !networkMapping[chainId].BasicNft ||
    !networkMapping[chainId].BasicNft[0]
  ) {
    console.error(`BasicNft contract address not found for chainId ${chainId}`);
    console.log("Available contracts:", Object.keys(networkMapping[chainId]));
    process.exit(1);
  }

  // Contract addresses
  const NFT_CONTRACT_ADDRESS = networkMapping[chainId].BasicNft[0];
  const MARKETPLACE_CONTRACT_ADDRESS =
    networkMapping[chainId].NftMarketplace[0];

  // Initialize contracts
  const nftContract = new web3.eth.Contract(
    NFT_CONTRACT_ABI,
    NFT_CONTRACT_ADDRESS
  );

  const marketplaceContract = new web3.eth.Contract(
    MARKETPLACE_CONTRACT_ABI,
    MARKETPLACE_CONTRACT_ADDRESS
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
      nfts(tokenId: $tokenId, first: 1) {
        id
        tokenId
        owner
      }
    }
  `;

  /* async function getChainId() {
        try {
          // Get the chain ID from the connected network
          const chainId = await web3.eth.getChainId();
          console.log(`Connected to chain ID: ${chainId}`);
          return chainId;
        } catch (error) {
          console.error("Error getting chain ID:", error);
          throw error;
        }
      } */

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

      if (result.data.nfts && result.data.nfts.length > 0) {
        return result.data.nfts[0];
      }
      return null;
    } catch (error) {
      console.error(`Error finding NFT with token ID ${tokenId}:`, error);
      return null;
    }
  }

  // Process Transfer event
  async function processTransferEvent(event) {
    const { from, to, tokenId } = event.returnValues;
    const txHash = event.transactionHash;

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
        const tokenURI = await nftContract.methods.tokenURI(tokenId).call();
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
  async function processSaleEvent(event) {
    const { tokenId, seller, buyer, price } = event.returnValues;
    const txHash = event.transactionHash;

    console.log(
      `Processing Sale: Token #${tokenId} from ${seller} to ${buyer} for ${web3.utils.fromWei(
        price,
        "ether"
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
            price: parseFloat(web3.utils.fromWei(price, "ether")),
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

  // Process NFT Listing event
  async function processListingEvent(event) {
    const { tokenId, seller, price } = event.returnValues;
    const txHash = event.transactionHash;

    console.log(
      `Processing Listing: Token #${tokenId} listed by ${seller} for ${web3.utils.fromWei(
        price,
        "ether"
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
            price: parseFloat(web3.utils.fromWei(price, "ether")),
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
            price: parseFloat(web3.utils.fromWei(price, "ether")),
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
  }

  // Process NFT Canceled Listing event
  async function processCanceledListingEvent(event) {
    const { tokenId, seller } = event.returnValues;
    const txHash = event.transactionHash;

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
    const latestBlock = await web3.eth.getBlockNumber();
    console.log(`Current block number: ${latestBlock}`);

    // You might want to store the last processed block in a database
    // to avoid reprocessing everything on restart
    const fromBlock = process.env.START_BLOCK || latestBlock;

    // Process past events
    console.log(`Processing past events from block ${fromBlock}`);

    // Listen to Transfer events (for minting and transfers)
    nftContract.events
      .Transfer({
        fromBlock,
      })
      .on("data", processTransferEvent)
      .on("error", console.error);

    // Listen to marketplace events
    // NFT Listed event
    marketplaceContract.events
      .ItemListed({
        fromBlock,
      })
      .on("data", processListingEvent)
      .on("error", console.error);

    // NFT Sale event
    marketplaceContract.events
      .ItemSold({
        fromBlock,
      })
      .on("data", processSaleEvent)
      .on("error", console.error);

    // NFT Listing Canceled event
    marketplaceContract.events
      .ItemCanceled({
        fromBlock,
      })
      .on("data", processCanceledListingEvent)
      .on("error", console.error);

    console.log("Event listeners started");
  }
  try {
    await startEventListeners();
  } catch (error) {
    console.error("Error starting event listeners:", error);
    process.exit(1);
  }
}

// Run the main function
main();
