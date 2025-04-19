import { useState, useEffect } from "react"
import { useReadContract, useWriteContract, useAccount, useSimulateContract } from "wagmi"
import nftMarketplaceAbi from "../constants/NftMarketplace.json"
import nftAbi from "../constants/BasicNft.json"
import Image from "next/image"
import { formatEther } from "viem" // Use viem for formatting instead of ethers
import UpdateListingModal from "./UpdateListingModal"
import "../styles/Home.module.css"

const truncateStr = (fullStr, strLen) => {
    if (fullStr.length <= strLen) return fullStr
    const separator = "..."
    const seperatorLength = separator.length
    const charsToShow = strLen - seperatorLength
    const frontChars = Math.ceil(charsToShow / 2)
    const backChars = Math.floor(charsToShow / 2)
    return (
        fullStr.substring(0, frontChars) + separator + fullStr.substring(fullStr.length - backChars)
    )
}

export default function NFTBox({ price, nftAddress, tokenId, marketplaceAddress, seller }) {
    const { address: account, isConnected } = useAccount()
    const [imageURI, setImageURI] = useState("")
    const [tokenName, setTokenName] = useState("")
    const [tokenDescription, setTokenDescription] = useState("")
    const [showModal, setShowModal] = useState(false)
    const hideModal = () => setShowModal(false)

    // Read the token URI
    const { data: tokenURI } = useReadContract({
        address: nftAddress,
        abi: nftAbi,
        functionName: "tokenURI",
        args: [tokenId],
        query: {
            enabled: isConnected,
        },
    })

    // Simulate the buy transaction
    const { data: buyItemData } = useSimulateContract({
        address: marketplaceAddress,
        abi: nftMarketplaceAbi,
        functionName: "buyItem",
        args: [nftAddress, tokenId],
        value: price,
        query: {
            enabled: Boolean(price) && isConnected && seller !== account,
        },
    })

    // Set up the buy function
    const {
        writeContract: buyItem,
        isPending: isBuyPending,
        isSuccess: isBuySuccess,
    } = useWriteContract()

    // Handle success state
    useEffect(() => {
        if (isBuySuccess) {
            alert("Item bought successfully!")
        }
    }, [isBuySuccess])

    // Update UI when tokenURI is available
    useEffect(() => {
        if (tokenURI) {
            updateUI()
        }
    }, [tokenURI])

    async function updateUI() {
        if (tokenURI) {
            try {
                const requestURL = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/")
                const tokenURIResponse = await (await fetch(requestURL)).json()
                const imageURI = tokenURIResponse.image
                const imageURIURL = imageURI.replace("ipfs://", "https://ipfs.io/ipfs/")
                setImageURI(imageURIURL)
                setTokenName(tokenURIResponse.name)
                setTokenDescription(tokenURIResponse.description)
            } catch (error) {
                console.error("Error fetching token metadata:", error)
            }
        }
    }

    const isOwnedByUser = seller === account || seller === undefined
    const formattedSellerAddress = isOwnedByUser ? "you" : truncateStr(seller || "", 15)

    const handleCardClick = () => {
        if (isOwnedByUser) {
            setShowModal(true)
        } else if (buyItemData) {
            buyItem(buyItemData.request)
        }
    }

    return (
        <div>
            <div>
                {imageURI ? (
                    <div>
                        <UpdateListingModal
                            isVisible={showModal}
                            tokenId={tokenId}
                            marketplaceAddress={marketplaceAddress}
                            nftAddress={nftAddress}
                            onClose={hideModal}
                        />
                        <div
                            className="border rounded-lg overflow-hidden m-2 cursor-pointer"
                            onClick={handleCardClick}
                        >
                            <div className="p-4">
                                <h3 className="font-bold text-lg">{tokenName}</h3>
                                <p className="text-sm">{tokenDescription}</p>
                                <div className="flex flex-col items-end gap-2 mt-2">
                                    <div>#{tokenId}</div>
                                    <div className="italic text-sm">
                                        Owned by {formattedSellerAddress}
                                    </div>
                                    <Image
                                        loader={() => imageURI}
                                        src={imageURI}
                                        height="200"
                                        width="200"
                                        alt={tokenName}
                                    />
                                    <div className="font-bold">
                                        {formatEther(BigInt(price))} ETH
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>Loading...</div>
                )}
            </div>
        </div>
    )
}
