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
    console.log("Current chain Id: ", chainId)

    // Get chain in the format expected by your networkMapping
    const chainString = chainId ? chainId.toString() : null
    const marketplaceAddress =
        chainId && networkMapping[chainString]
            ? networkMapping[chainString].NftMarketplace[0]
            : null
    const nftAddress =
        chainId && networkMapping[chainString] ? networkMapping[chainString].BasicNft[0] : null

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

    // Debug current state
    console.log("Query state:", { loading, error, listedNfts })

    return (
        <div className="container mx-auto">
            <h1 className="py-4 px-4 font-bold text-2xl">Recently Listed</h1>
            <div className="flex flex-wrap">
                {!isConnected && <div>Please connect your wallet to view listings</div>}

                {isConnected && !chainId && (
                    <div>Chain ID not available. Please check your network connection.</div>
                )}

                {isConnected && chainId && !marketplaceAddress && (
                    <div>Network error, please switch to a supported network.</div>
                )}

                {isConnected && chainId && marketplaceAddress && loading && (
                    <div>Loading NFT listings...</div>
                )}

                {isConnected && chainId && marketplaceAddress && error && (
                    <div>Error loading listings: {error.message}</div>
                )}

                {isConnected &&
                    chainId &&
                    marketplaceAddress &&
                    !loading &&
                    !error &&
                    listedNfts &&
                    listedNfts.nfts &&
                    (listedNfts.nfts.length > 0 ? (
                        listedNfts.nfts.map((nft) => {
                            const { price, tokenId, owner } = nft
                            console.log("Rendering NFT:", nft)
                            return (
                                <NFTBox
                                    price={price}
                                    tokenId={tokenId}
                                    seller={owner}
                                    key={`${nftAddress}${tokenId}`}
                                    nftAddress={nftAddress}
                                    marketplaceAddress={marketplaceAddress}
                                />
                            )
                        })
                    ) : (
                        <div>No NFTs currently listed</div>
                    ))}
            </div>
        </div>
    )
}
