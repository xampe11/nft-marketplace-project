const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// NFT Schema
const NFTSchema = new Schema({
  tokenId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  image: String,
  owner: {
    type: String,
    required: true,
    index: true,
  },
  creator: {
    type: String,
    required: true,
    index: true,
  },
  price: {
    type: Number,
    min: 0,
  },
  currency: String,
  isListed: {
    type: Boolean,
    default: false,
    index: true,
  },
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: "Collection",
    index: true,
  },
  metadata: Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: Date,
});

// Collection Schema
const CollectionSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  creator: {
    type: String,
    required: true,
    index: true,
  },
  image: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Transaction Schema
const TransactionSchema = new Schema({
  nftId: {
    type: Schema.Types.ObjectId,
    ref: "NFT",
    required: true,
    index: true,
  },
  from: {
    type: String,
    required: true,
    index: true,
  },
  to: {
    type: String,
    required: true,
    index: true,
  },
  price: Number,
  currency: String,
  transactionType: {
    type: String,
    enum: ["MINT", "SALE", "TRANSFER", "LIST", "UNLIST"],
    required: true,
    index: true,
  },
  transactionHash: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Create indexes for common queries
NFTSchema.index({ isListed: 1, price: 1 });
NFTSchema.index({ collectionId: 1, isListed: 1 });
TransactionSchema.index({ timestamp: -1 });

// Create models
const NFT = mongoose.model("NFT", NFTSchema);
const Collection = mongoose.model("Collection", CollectionSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

module.exports = {
  NFT,
  Collection,
  Transaction,
};
