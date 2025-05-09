const {
    frontEndContractsFile,
    frontEndAbiLocation,
    backEndDatabaseContractsFile,
    backEndDatabaseAbiLocation,
} = require("../helper-hardhat-config")
require("dotenv").config()
const fs = require("fs")
const { network, ethers, deployments } = require("hardhat")
const { get } = deployments

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddressesFrontEnd()
        await updateAbiFrontEnd()
        console.log("Front end written!")
    }
    if (process.env.UPDATE_DATABASE) {
        console.log("Writing to back end database...")
        await updateContractAddressesDatabase()
        await updateAbiDatabase()
        console.log("database written!")
    }
}

async function updateAbiFrontEnd() {
    const nftMarketplaceDeployment = await get("NftMarketplace")
    const nftMarketplace = await ethers.getContractAt(
        "NftMarketplace",
        nftMarketplaceDeployment.address
    )
    fs.writeFileSync(
        `${frontEndAbiLocation}NftMarketplace.json`,
        nftMarketplace.interface.formatJson()
    )

    const basicNftDeployment = await get("BasicNft")
    const basicNft = await ethers.getContractAt("BasicNft", basicNftDeployment.address)
    fs.writeFileSync(`${frontEndAbiLocation}BasicNft.json`, basicNft.interface.formatJson())
}

async function updateAbiDatabase() {
    const nftMarketplaceDeployment = await get("NftMarketplace")
    const nftMarketplace = await ethers.getContractAt(
        "NftMarketplace",
        nftMarketplaceDeployment.address
    )
    fs.writeFileSync(
        `${backEndDatabaseAbiLocation}NftMarketplace.json`,
        nftMarketplace.interface.formatJson()
    )

    const basicNftDeployment = await get("BasicNft")
    const basicNft = await ethers.getContractAt("BasicNft", basicNftDeployment.address)
    fs.writeFileSync(`${backEndDatabaseAbiLocation}BasicNft.json`, basicNft.interface.formatJson())
}

async function updateContractAddressesFrontEnd() {
    const chainId = network.config.chainId.toString()
    const nftMarketplaceDeployment = await get("NftMarketplace")
    const basicNftDeployment = await get("BasicNft")
    if (
        !fs.existsSync(frontEndContractsFile) ||
        fs.readFileSync(frontEndContractsFile, "utf8").trim() === ""
    ) {
        fs.writeFileSync(frontEndContractsFile, JSON.stringify({}, null, 2))
    }
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketplace"]) {
            contractAddresses[chainId]["NftMarketplace"] = []
        }
        if (!contractAddresses[chainId]["BasicNft"]) {
            contractAddresses[chainId]["BasicNft"] = []
        }

        if (
            !contractAddresses[chainId]["NftMarketplace"].includes(nftMarketplaceDeployment.address)
        ) {
            contractAddresses[chainId]["NftMarketplace"].push(nftMarketplaceDeployment.address)
        }
        if (!contractAddresses[chainId]["BasicNft"].includes(basicNftDeployment.address)) {
            contractAddresses[chainId]["BasicNft"].push(basicNftDeployment.address)
        }
    } else {
        contractAddresses[chainId] = {
            NftMarketplace: [nftMarketplaceDeployment.address],
            BasicNft: [basicNftDeployment.address],
        }
    }

    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

async function updateContractAddressesDatabase() {
    const chainId = network.config.chainId.toString()
    const nftMarketplaceDeployment = await get("NftMarketplace")
    const basicNftDeployment = await get("BasicNft")
    if (
        !fs.existsSync(backEndDatabaseContractsFile) ||
        fs.readFileSync(backEndDatabaseContractsFile, "utf8").trim() === ""
    ) {
        fs.writeFileSync(backEndDatabaseContractsFile, JSON.stringify({}, null, 2))
    }
    const contractAddresses = JSON.parse(fs.readFileSync(backEndDatabaseContractsFile, "utf8"))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketplace"]) {
            contractAddresses[chainId]["NftMarketplace"] = []
        }
        if (!contractAddresses[chainId]["BasicNft"]) {
            contractAddresses[chainId]["BasicNft"] = []
        }

        if (
            !contractAddresses[chainId]["NftMarketplace"].includes(nftMarketplaceDeployment.address)
        ) {
            contractAddresses[chainId]["NftMarketplace"].push(nftMarketplaceDeployment.address)
        }
        if (!contractAddresses[chainId]["BasicNft"].includes(basicNftDeployment.address)) {
            contractAddresses[chainId]["BasicNft"].push(basicNftDeployment.address)
        }
    } else {
        contractAddresses[chainId] = {
            NftMarketplace: [nftMarketplaceDeployment.address],
            BasicNft: [basicNftDeployment.address],
        }
    }

    fs.writeFileSync(backEndDatabaseContractsFile, JSON.stringify(contractAddresses))
}

module.exports.tags = ["all", "frontend", "database"]
