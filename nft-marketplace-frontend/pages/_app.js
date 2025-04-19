import "../styles/Home.module.css"
import "../styles/globals.css"
import Header from "../components/Header"
import Head from "next/head"
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client"
import { WagmiProvider, createConfig } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { injected } from "wagmi/connectors"
import { http } from "viem"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"

const client = new ApolloClient({
    cache: new InMemoryCache(),
    uri: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
})

// Create configuration using RainbowKit's helper
const config = getDefaultConfig({
    appName: "NFT Marketplace",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    chains: [mainnet, sepolia],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
    },
})

const queryClient = new QueryClient()

function MyApp({ Component, pageProps }) {
    return (
        <div>
            <Head>
                <title>NFT Marketplace</title>
                <meta name="description" content="NFT Marketplace" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <WagmiProvider config={config}>
                <RainbowKitProvider>
                    <QueryClientProvider client={queryClient}>
                        <ApolloProvider client={client}>
                            <Header />
                            <Component {...pageProps} />
                        </ApolloProvider>
                    </QueryClientProvider>
                </RainbowKitProvider>
            </WagmiProvider>
        </div>
    )
}

export default MyApp
