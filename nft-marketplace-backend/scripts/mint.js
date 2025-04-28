const { ethers, network, deployments } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")
const { get } = deployments

async function mint() {
    const basicNftDeployment = await get("BasicNft")
    const basicNft = await ethers.getContractAt("BasicNft", basicNftDeployment.address)
    const signer = await ethers.provider.getSigner()
    const signerAddress = await signer.getAddress()
    console.log("Minting NFT...")
    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const transferEvent = mintTxReceipt.logs.find((log) => {
        // The Transfer event has this topic
        return log.topics[0] === ethers.id("Transfer(address,address,uint256)")
    })

    if (!transferEvent) {
        console.log("No Transfer event found in transaction receipt")
        console.log("Receipt:", mintTxReceipt)
        return
    }

    const tokenId = transferEvent.topics[3] // This is the tokenId in hex

    // Convert hex to decimal
    const tokenIdDecimal = parseInt(tokenId, 16)
    const numberOFNftsHolding = await basicNft.balanceOf(signerAddress)

    console.log(
        `Minted tokenId ${tokenIdDecimal} from contract ${basicNftDeployment.address} by ${signerAddress}`
    )

    console.log(`Current number of Nfts holded by ${signerAddress} are ${numberOFNftsHolding}`)

    if (network.config.chainId == 31337) {
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
