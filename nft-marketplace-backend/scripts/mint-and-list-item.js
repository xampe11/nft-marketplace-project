const { ethers, deployments } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")
const { get } = deployments

const PRICE = ethers.parseEther("1")

async function mintAndList() {
    const nftMarketplaceDeployment = await get("NftMarketplace")
    const nftMarketplace = await ethers.getContractAt(
        "NftMarketplace",
        nftMarketplaceDeployment.address
    )

    const basicNftDeployment = await get("BasicNft")
    const basicNft = await ethers.getContractAt("BasicNft", basicNftDeployment.address)

    console.log("Minting NFT...")
    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const transferEvent = mintTxReceipt.logs.find((log) => {
        // The Transfer event has this topic
        return log.topics[0] === ethers.id("Transfer(address,address,uint256)")
    })
    const tokenId = transferEvent.topics[3] // This is the tokenId in hex
    // Convert hex to decimal
    const tokenIdDecimal = parseInt(tokenId, 16)
    console.log("Approving NFT...")
    const approvalTx = await basicNft.approve(nftMarketplaceDeployment.address, tokenIdDecimal)
    await approvalTx.wait(1)
    console.log("Listing NFT...")
    const tx = await nftMarketplace.listItem(basicNftDeployment.address, tokenIdDecimal, PRICE)
    await tx.wait(1)
    console.log("NFT Listed!")

    if (network.config.chainId == 31337) {
        // Moralis has a hard time if you move more than 1 at once!
        await moveBlocks(1, (sleepAmount = 1000))
    }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
