import "../styles/Home.module.css"
import { useAccount, useChainId } from "wagmi"
import NFTBox from "../components/NFTBox"
import networkMapping from "../constants/networkMapping.json"
import GET_NFTS from "../constants/subgraphQueries.js"
import { useQuery } from "@apollo/client"

export default function Home() {
    // Use wagmi v2 hooks
    const { isConnected } = useAccount()
    const chainId = useChainId()

    // Get chain in the format expected by your networkMapping
    const chainString = chainId ? chainId.toString() : null
    const marketplaceAddress =
        chainId && networkMapping[chainString]
            ? networkMapping[chainString].NftMarketplace[0]
            : null

    const {
        loading,
        error,
        data: listedNfts,
        refetch,
    } = useQuery(GET_NFTS, {
        variables: {
            first: 5,
            skip: 0,
            isListed: true,
        },
        errorPolicy: "all",
        onError: (error) => {
            console.error("GraphQL Error:", error)
            // Log the full error for debugging
            if (error.graphQLErrors) {
                error.graphQLErrors.forEach((graphQLError) => {
                    console.error("GraphQL Error Details:", graphQLError)
                })
            }
            if (error.networkError) {
                console.error("Network Error:", error.networkError)
            }
        },
    })

    if (loading) return <p>Loading gql...</p>
    if (error) return <p>Graphql Error: {error.message}</p>

    return (
        <div className="container mx-auto">
            <h1 className="py-4 px-4 font-bold text-2xl">Recently Listed</h1>
            <div className="flex flex-wrap">
                {isConnected && chainId ? (
                    loading || !listedNfts ? (
                        <div>Loading...</div>
                    ) : (
                        listedNfts.nfts.map((nft) => {
                            const { price, nftAddress, tokenId, seller } = nft
                            return marketplaceAddress ? (
                                <NFTBox
                                    price={price}
                                    nftAddress={nftAddress}
                                    tokenId={tokenId}
                                    marketplaceAddress={marketplaceAddress}
                                    seller={seller}
                                    key={`${nftAddress}${tokenId}`}
                                />
                            ) : (
                                <div>Network error, please switch to a supported network. </div>
                            )
                        })
                    )
                ) : (
                    <div>Web3 Currently Not Enabled</div>
                )}
            </div>
        </div>
    )
}
