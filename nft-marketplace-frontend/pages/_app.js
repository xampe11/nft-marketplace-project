import "../styles/Home.module.css"
import "../styles/globals.css"
import Header from "../components/Header"
import Head from "next/head"
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client"
import { WagmiProvider, createConfig } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { http } from "viem"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"

const queryClient = new QueryClient()

const client = new ApolloClient({
    cache: new InMemoryCache(),
    uri: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
})

// Define Hardhat local chain
const hardhatChain = {
    id: 31337,
    name: 'Hardhat',
    network: 'hardhat',
    nativeCurrency: {
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: ['http://127.0.0.1:8545'] },
      public: { http: ['http://127.0.0.1:8545'] },
    },
    testnet: true,
  }
  
  // Put localhost first to make it the default network
  const chains = [hardhatChain, mainnet, sepolia];
  
  // Create wagmi config with rainbowkit
  const config = getDefaultConfig({
    appName: "NFT Marketplace",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    chains: chains,
    transports: {
      [hardhatChain.id]: http('http://127.0.0.1:8545'),
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
    ssr: true, // Enable server-side rendering
  });

function MyApp({ Component, pageProps }) {
    return (
        <div>
            <Head>
                <title>NFT Marketplace</title>
                <meta name="description" content="NFT Marketplace" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <RainbowKitProvider>
                        <ApolloProvider client={client}>
                            <Header />
                            <Component {...pageProps} />
                        </ApolloProvider>
                    </RainbowKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </div>
    )
}

export default MyApp
