# Movie Voting Smart Contract

This repository contains a Solidity-based smart contract for a decentralized movie voting application. The contract allows users to create voting sessions, cast votes on their favorite movies, and determine the winner once the voting period ends.

## Features

- **Create Voting Sessions**: Users can create a new voting session with a list of movies and a specified duration.
- **Vote on Movies**: Participants can vote for their favorite movies once the voting session has started.
- **Declare a Winner**: The contract calculates and declares the winning movie once the voting period ends.
- **Security**: The contract includes protections against common vulnerabilities like reentrancy attacks using OpenZeppelin's `ReentrancyGuard`.
- **Gas Optimization**: The contract is optimized for gas efficiency by minimizing storage reads and placing the most likely failing conditions first.

## Testing

A comprehensive suite of unit tests is included to ensure the contract's functionality, covering all core features and edge cases. The tests are written using Hardhat, leveraging tools like Chai for assertions and Hardhat Network Helpers for time manipulation.

## Technologies Used

- **Solidity**: Smart contract programming language.
- **Hardhat**: Ethereum development environment and testing framework.
- **OpenZeppelin**: Secure smart contract libraries, including `ReentrancyGuard`.
- **TypeScript**: For module and test script development.

## Setup

To deploy and test the contract locally:

1. Clone this repository.
2. Install dependencies with `npm install`.
3. Run tests with `npx hardhat test`.
