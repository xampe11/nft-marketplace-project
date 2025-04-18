// Import your database models or blockchain connection library
const { NFT, Collection, Transaction } = require("./models");
// Example: const { web3, contracts } = require('./blockchain');

// Custom scalar for handling JSON data
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");

const resolvers = {
  JSONObject: new GraphQLScalarType({
    name: "JSONObject",
    description: "JSON object scalar type",
    parseValue(value) {
      return typeof value === "object" ? value : JSON.parse(value);
    },
    serialize(value) {
      return typeof value === "object" ? value : JSON.parse(value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return JSON.parse(ast.value);
      }
      return null;
    },
  }),

  Query: {
    // NFT queries
    nft: async (_, { id }, context) => {
      // Return an NFT by ID from your database or blockchain
      return await NFT.findById(id);
    },

    nfts: async (_, args, context) => {
      const {
        first = 10,
        skip = 0,
        orderBy = "createdAt_DESC",
        owner,
        creator,
        isListed,
        collectionId,
      } = args;

      // Build filter object
      const filter = {};
      if (owner) filter.owner = owner;
      if (creator) filter.creator = creator;
      if (isListed !== undefined) filter.isListed = isListed;
      if (collectionId) filter.collectionId = collectionId;

      // Parse orderBy string (e.g., "createdAt_DESC")
      const [field, direction] = orderBy.split("_");
      const sort = { [field]: direction === "DESC" ? -1 : 1 };

      return await NFT.find(filter).sort(sort).skip(skip).limit(first);
    },

    // Collection queries
    collection: async (_, { id }, context) => {
      return await Collection.findById(id);
    },

    collections: async (
      _,
      { first = 10, skip = 0, orderBy = "createdAt_DESC", creator },
      context
    ) => {
      const filter = {};
      if (creator) filter.creator = creator;

      const [field, direction] = orderBy.split("_");
      const sort = { [field]: direction === "DESC" ? -1 : 1 };

      return await Collection.find(filter).sort(sort).skip(skip).limit(first);
    },

    // Transaction queries
    transactions: async (
      _,
      { nftId, from, to, transactionType, first = 10, skip = 0 },
      context
    ) => {
      const filter = {};
      if (nftId) filter.nftId = nftId;
      if (from) filter.from = from;
      if (to) filter.to = to;
      if (transactionType) filter.transactionType = transactionType;

      return await Transaction.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(first);
    },
  },

  Mutation: {
    // NFT mutations
    createNFT: async (_, args, context) => {
      // You might want to verify blockchain ownership here
      const nft = new NFT({
        ...args,
        isListed: false,
        createdAt: new Date().toISOString(),
      });

      await nft.save();

      // Record mint transaction
      await new Transaction({
        nftId: nft.id,
        from: "0x0000000000000000000000000000000000000000", // Address zero for minting
        to: args.owner,
        transactionType: "MINT",
        transactionHash: args.transactionHash || "unknown",
        timestamp: new Date().toISOString(),
      }).save();

      return nft;
    },

    updateNFT: async (_, { id, ...updates }, context) => {
      // Verify ownership or admin status here
      const nft = await NFT.findByIdAndUpdate(
        id,
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        { new: true }
      );

      // If listing status changed, record transaction
      if (updates.isListed !== undefined) {
        await new Transaction({
          nftId: id,
          from: nft.owner,
          to: nft.owner,
          transactionType: updates.isListed ? "LIST" : "UNLIST",
          price: updates.price || nft.price,
          currency: updates.currency || nft.currency,
          transactionHash: "offchain",
          timestamp: new Date().toISOString(),
        }).save();
      }

      // If owner changed, record transaction
      if (updates.owner && updates.owner !== nft.owner) {
        await new Transaction({
          nftId: id,
          from: nft.owner,
          to: updates.owner,
          transactionType: "TRANSFER",
          transactionHash: updates.transactionHash || "offchain",
          timestamp: new Date().toISOString(),
        }).save();
      }

      return nft;
    },

    // Collection mutations
    createCollection: async (_, args, context) => {
      // Verify creator authentication here
      const collection = new Collection({
        ...args,
        createdAt: new Date().toISOString(),
      });

      await collection.save();
      return collection;
    },

    // Transaction mutations
    recordTransaction: async (_, args, context) => {
      // Verify transaction with blockchain data if needed
      const transaction = new Transaction({
        ...args,
        timestamp: new Date().toISOString(),
      });

      await transaction.save();

      // Update NFT owner if it's a sale or transfer
      if (["SALE", "TRANSFER"].includes(args.transactionType)) {
        await NFT.findByIdAndUpdate(args.nftId, {
          owner: args.to,
          isListed: false,
          updatedAt: new Date().toISOString(),
        });
      }

      return transaction;
    },
  },

  // Field resolvers
  NFT: {
    collection: async (parent) => {
      if (!parent.collectionId) return null;
      return await Collection.findById(parent.collectionId);
    },

    transactionHistory: async (parent) => {
      return await Transaction.find({ nftId: parent.id }).sort({
        timestamp: -1,
      });
    },
  },

  Collection: {
    nfts: async (parent) => {
      return await NFT.find({ collectionId: parent.id });
    },

    floorPrice: async (parent) => {
      const listedNfts = await NFT.find({
        collectionId: parent.id,
        isListed: true,
        price: { $gt: 0 },
      }).sort({ price: 1 });

      return listedNfts.length > 0 ? listedNfts[0].price : null;
    },

    volume: async (parent) => {
      const transactions = await Transaction.find({
        nftId: {
          $in: (
            await NFT.find({ collectionId: parent.id })
          ).map((nft) => nft.id),
        },
        transactionType: "SALE",
      });

      return transactions.reduce((sum, tx) => sum + (tx.price || 0), 0);
    },
  },
};

module.exports = resolvers;
