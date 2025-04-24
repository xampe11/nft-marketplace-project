import Head from "next/head"
import Image from "next/image"
import styles from "../styles/Home.module.css"
import { useReadContract, useWriteContract, useAccount, useChainId, useSimulateContract } from "wagmi"
import { parseEther, formatEther } from "viem"
import nftAbi from "../constants/BasicNft.json"
import nftMarketplaceAbi from "../constants/NftMarketplace.json"
import networkMapping from "../constants/networkMapping.json"
import { useEffect, useState } from "react"

export default function Home() {
    // Replace Moralis hooks with wagmi hooks
    const { address: account, isConnected } = useAccount()
    const chainId = useChainId()
    const chainString = chainId ? chainId.toString() : "31337"
    const marketplaceAddress = networkMapping[chainString]?.NftMarketplace?.[0]
    
    const [proceeds, setProceeds] = useState("0")
    const [nftAddress, setNftAddress] = useState("")
    const [tokenId, setTokenId] = useState("")
    const [price, setPrice] = useState("")
    const [notification, setNotification] = useState(null)

    // Set up contract write function
    const { writeContract, isPending, isSuccess } = useWriteContract()

    // Get approval data
    const { data: approveData } = useSimulateContract({
        address: nftAddress,
        abi: nftAbi,
        functionName: "approve",
        args: [marketplaceAddress, tokenId],
        query: {
            enabled: Boolean(nftAddress && tokenId && marketplaceAddress && isConnected),
        }
    })

    // Get listing data
    const { data: listItemData } = useSimulateContract({
        address: marketplaceAddress,
        abi: nftMarketplaceAbi,
        functionName: "listItem",
        args: [nftAddress, tokenId, price ? parseEther(price) : BigInt(0)],
        query: {
            enabled: Boolean(nftAddress && tokenId && price && marketplaceAddress && isConnected),
        }
    })

    // Get withdraw data
    const { data: withdrawData } = useSimulateContract({
        address: marketplaceAddress,
        abi: nftMarketplaceAbi,
        functionName: "withdrawProceeds",
        query: {
            enabled: Boolean(marketplaceAddress && isConnected && proceeds !== "0"),
        }
    })

    // Get proceeds
    const { data: proceedsData, refetch: refetchProceeds } = useReadContract({
        address: marketplaceAddress,
        abi: nftMarketplaceAbi,
        functionName: "getProceeds",
        args: [account],
        query: {
            enabled: Boolean(account && marketplaceAddress && isConnected),
        }
    })

    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault()
        if (!approveData) return
        
        // Show notification
        showNotification("Approving NFT for marketplace...")
        
        // Call approve function
        writeContract(approveData.request)
    }

    // Handle approval success
    useEffect(() => {
        if (isSuccess && approveData && nftAddress && tokenId && price) {
            showNotification("Approval successful! Now listing NFT...")
            setTimeout(() => {
                if (listItemData) {
                    writeContract(listItemData.request)
                }
            }, 1000) // Small delay to allow transaction to be processed
        }
    }, [isSuccess, approveData])

    // Handle withdraw
    const handleWithdraw = () => {
        if (withdrawData) {
            showNotification("Processing withdrawal...")
            writeContract(withdrawData.request)
        }
    }

    // Show notification
    const showNotification = (message) => {
        setNotification({
            message,
            timestamp: Date.now()
        })
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            setNotification(null)
        }, 5000)
    }

    // Update proceeds when data changes
    useEffect(() => {
        if (proceedsData) {
            setProceeds(proceedsData.toString())
        }
    }, [proceedsData])

    // Setup UI and refetch proceeds when needed
    useEffect(() => {
        if (isConnected && marketplaceAddress) {
            refetchProceeds()
        }
    }, [account, isConnected, chainId, isSuccess])

    return (
        <div className={styles.container}>
            {notification && (
                <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded shadow-lg z-50">
                    {notification.message}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded shadow">
                <h2 className="text-xl font-bold mb-4">Sell your NFT!</h2>
                
                <div className="mb-4">
                    <label className="block mb-2">NFT Address</label>
                    <input
                        type="text"
                        value={nftAddress}
                        onChange={(e) => setNftAddress(e.target.value)}
                        className="w-1/2 p-2 border rounded"
                        placeholder="0x..."
                        required
                    />
                </div>
                
                <div className="mb-4">
                    <label className="block mb-2">Token ID</label>
                    <input
                        type="number"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                        className="w-1/4 p-2 border rounded"
                        placeholder="0"
                        required
                    />
                </div>
                
                <div className="mb-4">
                    <label className="block mb-2">Price (in ETH)</label>
                    <input
                        type="text"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-1/4 p-2 border rounded"
                        placeholder="0.1"
                        required
                    />
                </div>
                
                <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
                    disabled={isPending || !isConnected}
                >
                    {isPending ? "Processing..." : "List NFT"}
                </button>
            </form>
            
            <div className="p-6 bg-white rounded shadow">
                <div className="mb-2">Withdraw {formatEther(BigInt(proceeds || "0"))} ETH proceeds</div>
                
                {proceeds !== "0" ? (
                    <button
                        onClick={handleWithdraw}
                        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
                        disabled={isPending || !isConnected}
                    >
                        {isPending ? "Processing..." : "Withdraw"}
                    </button>
                ) : (
                    <div className="text-gray-500">No proceeds detected</div>
                )}
            </div>
        </div>
    )
}
