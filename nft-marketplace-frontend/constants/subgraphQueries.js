import { gql } from "@apollo/client"

/* const GET_NFTS = gql`
    nfts(first: 5, where: { buyer: "0x0000000000000000000000000000000000000000" }) {
      id
      tokenId
      name
      description
      image
      owner
      creator
      price
      currency
      isListed
      createdAt
      collection {
        id
        name
      }
    }
` */

const GET_NFTS = gql`
    query GetNFTs($first: Int, $skip: Int, $isListed: Boolean) {
        nfts(first: $first, skip: $skip, isListed: $isListed) {
            id
            tokenId
            name
            description
            image
            owner
            creator
            price
            currency
            isListed
            createdAt
            collection {
                id
                name
            }
        }
    }
`
export default GET_NFTS
