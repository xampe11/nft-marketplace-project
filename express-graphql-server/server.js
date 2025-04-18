const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { readFileSync } = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const resolvers = require("./resolvers");
const cors = require("cors");
require("dotenv").config();

// Read schema
const typeDefs = readFileSync(path.join(__dirname, "schema.graphql"), "utf8");

// Connect to MongoDB (or your preferred database)
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

async function startServer() {
  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // You can extract auth headers here for authentication
      const token = req.headers.authorization || "";

      // Verify token & return context
      // const user = getUser(token);
      // return { user };

      return { token };
    },
    introspection: process.env.NODE_ENV !== "production",
    playground: process.env.NODE_ENV !== "production",
  });

  await server.start();

  const app = express();

  // Enable CORS
  app.use(cors());

  // Apply Apollo middleware
  server.applyMiddleware({ app });

  // Start the server
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(
      `Server running at http://localhost:${PORT}${server.graphqlPath}`
    );
  });
}

startServer();
