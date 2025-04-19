import { useState, useEffect } from "react"
import { useSimulateContract, useWriteContract } from "wagmi"
import nftMarketplaceAbi from "../constants/NftMarketplace.json"
import { parseEther } from "viem"
import "../styles/Home.module.css"

export default function UpdateListingModal({
    nftAddress,
    tokenId,
    isVisible,
    marketplaceAddress,
    onClose,
}) {
    const [priceToUpdateListingWith, setPriceToUpdateListingWith] = useState(0)

    // Simulate the updateListing contract call
    const { data: updateListingData } = useSimulateContract({
        address: marketplaceAddress,
        abi: nftMarketplaceAbi,
        functionName: "updateListing",
        args: [
            nftAddress,
            tokenId,
            priceToUpdateListingWith
                ? parseEther(priceToUpdateListingWith.toString())
                : parseEther("0"),
        ],
        query: {
            enabled: Boolean(marketplaceAddress) && isVisible && priceToUpdateListingWith > 0,
        },
    })

    // Set up the contract write function
    const { writeContract: updateListing, isPending, isSuccess } = useWriteContract()

    // Handle success state
    useEffect(() => {
        if (isSuccess) {
            handleUpdateListingSuccess()
        }
    }, [isSuccess])

    const handleUpdateListingSuccess = () => {
        alert("Listing updated successfully!")
        onClose && onClose()
        setPriceToUpdateListingWith(0)
    }

    const handleSubmit = () => {
        if (updateListingData) {
            updateListing(updateListingData.request)
        }
    }

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg w-96">
                <h3 className="text-lg font-bold mb-4">Update Listing</h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        Update listing price in ETH
                    </label>
                    <input
                        className="w-full p-2 border rounded"
                        name="New listing price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceToUpdateListingWith}
                        onChange={(event) => {
                            setPriceToUpdateListingWith(event.target.value)
                        }}
                    />
                </div>

                <div className="flex justify-end space-x-2">
                    <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className={`px-4 py-2 bg-blue-500 text-white rounded ${
                            isPending ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        onClick={handleSubmit}
                        disabled={isPending || !priceToUpdateListingWith}
                    >
                        {isPending ? "Updating..." : "Update"}
                    </button>
                </div>
            </div>
        </div>
    )
}
