# Blockchain Voting System

A decentralized voting application built with React, TypeScript, and Ethereum smart contracts.

## Features

- Create polls with multiple options
- Vote on active polls
- View poll results in real-time
- Secure and transparent voting using blockchain technology
- MetaMask wallet integration

## Prerequisites

- Node.js (v14.0.0 or later)
- npm (Node Package Manager)
- MetaMask browser extension
- Ganache (for local blockchain development)

## Step-by-Step Setup Guide

### 1. Clone and Install

```bash
# Clone the repository
git clone [your-repository-url]
cd BchainPoll

# Install dependencies
npm install
```

### 2. Ganache Setup

1. Download and install Ganache from [https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)
2. Launch Ganache and create a new workspace
3. Keep Ganache running during development
4. Note down the RPC Server address (usually `http://127.0.0.1:7545`)

### 3. MetaMask Configuration

1. Install MetaMask browser extension
2. Add Ganache network to MetaMask:
   - Open MetaMask
   - Click on network dropdown
   - Select "Add Network"
   - Add New Network manually:
     * Network Name: `Ganache`
     * New RPC URL: `http://127.0.0.1:7545` (from Ganache)
     * Chain ID: `1337`
     * Currency Symbol: `ETH`

3. Import a Ganache account to MetaMask:
   - Copy any private key from Ganache
   - In MetaMask, click on account icon
   - Select "Import Account"
   - Paste the private key

### 4. Smart Contract Deployment

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Create a new file named `VotingSystem.sol`
3. Copy the smart contract code into the file
4. Compile the contract
5. In the deploy section:
   - Set environment to "Injected Provider - MetaMask"
   - Ensure MetaMask is connected to Ganache
   - Deploy the contract
6. Copy the deployed contract address

### 5. Environment Setup

1. Create a file named `config.ts` in the src directory
2. Add the following code:
   ```typescript
   export const CONTRACT_ADDRESS = 'your-contract-address'
   ```
   Replace 'your-contract-address' with the address from step 4.6

### 6. Running the Application

```bash
# Start the development server
npm start
```

Open your browser and navigate to: `http://localhost:3000`

## Common Issues and Solutions

### Network Connection Issues
- **"Cannot connect to network"**
  - Ensure Ganache is running
  - Verify MetaMask is connected to Ganache network
  - Check if the RPC URL matches Ganache's

### Transaction Problems
- **"Transaction failed"**
  - Ensure your MetaMask account has sufficient ETH
  - Check if you're using the correct network in MetaMask

### Contract Issues
- **"Contract not found"**
  - Verify CONTRACT_ADDRESS is correct
  - Ensure you're connected to the correct network
  - Check if the contract was deployed successfully

### MetaMask Issues
- **MetaMask not showing**
  - Install MetaMask browser extension
  - Refresh the page after installation

## Development Notes

- Built with React 18 and TypeScript
- Smart contract interactions via wagmi and viem
- Styling with Tailwind CSS
- Contract events for updates (PollCreated, Voted)

## Testing Guide

### Creating a Poll
1. Fill in the title and at least 2 options
2. Confirm the MetaMask transaction
3. Note the poll code displayed

### Joining a Poll
1. Use the 6-character poll code
2. Select an option and vote
3. Confirm the MetaMask transaction

### Viewing Results
- Check vote counts and percentages
- Verify your vote was recorded

## Network Requirements

- Default configuration uses Ganache (local blockchain)
- For testnet deployment, update CONTRACT_ADDRESS accordingly
- Supported networks: Ganache, Sepolia, other EVM-compatible networks

## Security Notes

- Never commit private keys or sensitive information
- Keep your MetaMask seed phrase secure
- Use environment variables for production deployments

## Support

For issues and questions:
[Your contact information or repository issues link] 